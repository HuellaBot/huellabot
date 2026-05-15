import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic, buildSystemPrompt } from '@/lib/anthropic'
import { getAvailableSlots } from '@/lib/google-calendar'
import twilio from 'twilio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const bookingTools: Parameters<typeof anthropic.messages.create>[0]['tools'] = [
  {
    name: 'check_availability',
    description: 'Consulta los horarios disponibles para una fecha y servicio específico.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date:             { type: 'string', description: 'Fecha en formato YYYY-MM-DD.' },
        duration_minutes: { type: 'number', description: 'Duración en minutos del servicio (ver lista de servicios). Si no lo sabes, omite este campo.' },
      },
      required: ['date'],
    },
  },
  {
    name: 'book_appointment',
    description: 'Agenda una cita cuando ya tienes nombre del dueño, mascota, servicio, fecha y hora.',
    input_schema: {
      type: 'object' as const,
      properties: {
        patient_name:     { type: 'string' },
        pet_name:         { type: 'string' },
        service:          { type: 'string' },
        appointment_at:   { type: 'string', description: 'ISO 8601, ej: 2026-05-10T10:00:00' },
        phone:            { type: 'string' },
        email:            { type: 'string', description: 'Correo del cliente (para el registro de la cita).' },
        duration_minutes: { type: 'number', description: 'Duración en minutos del servicio (ver lista de servicios).' },
        notes:            { type: 'string' },
      },
      required: ['patient_name', 'pet_name', 'service', 'appointment_at'],
    },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancela la próxima cita confirmada del cliente. SOLO usar cuando el cliente haya dicho explícitamente que quiere CANCELAR su cita (palabras como "cancelar", "quiero cancelar", "no puedo ir"). NUNCA usar durante el flujo de agendado de una cita nueva.',
    input_schema: {
      type: 'object' as const,
      properties: {
        confirm: { type: 'boolean', description: 'true si el cliente ya confirmó que quiere cancelar su cita existente.' },
      },
      required: ['confirm'],
    },
  },
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)

    const from        = params.get('From') ?? ''
    const to          = params.get('To')   ?? ''
    const messageBody = params.get('Body') ?? ''

    if (!messageBody.trim()) {
      return twimlResponse('Lo siento, no pude leer tu mensaje. ¿Puedes intentarlo de nuevo?')
    }

    const twilioNumber = to.replace('whatsapp:', '').trim()
    const senderNumber = from.replace('whatsapp:', '').trim()
    const normalized   = [twilioNumber, twilioNumber.replace(/^\+/, ''), `+${twilioNumber.replace(/^\+/, '')}`]

    // ── Todas las búsquedas en paralelo ──────────────────────────────────────
    const [configByNumber, anyConfig, anyClinic] = await Promise.all([
      supabase.from('whatsapp_configs').select('clinic_id, twilio_auth_token, is_active')
        .in('twilio_phone_number', normalized).maybeSingle(),
      supabase.from('whatsapp_configs').select('clinic_id')
        .order('created_at', { ascending: true }).limit(1).maybeSingle(),
      supabase.from('clinics').select('id')
        .order('created_at', { ascending: true }).limit(1).maybeSingle(),
    ])

    const clinicId: string | null =
      configByNumber.data?.clinic_id ??
      anyConfig.data?.clinic_id ??
      anyClinic.data?.id ??
      null

    if (!clinicId) {
      return twimlResponse('No hay clínicas registradas en este sistema aún.')
    }

    // ── Validar firma Twilio ─────────────────────────────────────────────────
    const waConfig = configByNumber.data
    const authToken = waConfig?.twilio_auth_token || process.env.TWILIO_AUTH_TOKEN || ''
    if (process.env.NODE_ENV === 'production' && authToken) {
      const signature = req.headers.get('x-twilio-signature') ?? ''
      const url       = process.env.NEXT_PUBLIC_APP_URL + '/api/whatsapp/webhook'
      const paramsObj: Record<string, string> = {}
      params.forEach((value, key) => { paramsObj[key] = value })
      if (!twilio.validateRequest(authToken, signature, url, paramsObj)) {
        return new NextResponse('Forbidden', { status: 403 })
      }
    }

    // ── Cargar datos de clínica e historial en paralelo ──────────────────────
    const [
      { data: clinic },
      { data: services },
      { data: botConfig },
      { data: recentMessages },
    ] = await Promise.all([
      supabase.from('clinics').select('*').eq('id', clinicId).single(),
      supabase.from('services').select('*').eq('clinic_id', clinicId),
      supabase.from('bot_configs').select('*').eq('clinic_id', clinicId).maybeSingle(),
      supabase.from('whatsapp_messages').select('message, response')
        .eq('clinic_id', clinicId).eq('phone_number', senderNumber)
        .order('timestamp', { ascending: false }).limit(12),
    ])

    if (!clinic) return twimlResponse('Error al cargar la información de la clínica.')

    const history = (recentMessages ?? []).reverse().flatMap(m => [
      { role: 'user' as const,      content: m.message  },
      { role: 'assistant' as const, content: m.response },
    ])

    const systemPrompt = buildSystemPrompt({
      name:       clinic.name,
      description: clinic.description || '',
      services:   services || [],
      hours:      clinic.hours || '',
      phone:      clinic.phone || '',
      address:    clinic.address || '',
      bot_name:   botConfig?.bot_name || 'Asistente Virtual',
      bot_tone:   botConfig?.bot_tone || 'amigable y profesional',
      extra_info: clinic.extra_info || '',
    }) + `\n\nFECHA ACTUAL: ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Mexico_City' })}. Usa siempre el año correcto.\n\nESTÁS EN WHATSAPP: sé conciso (máximo 3 párrafos cortos). Usa emojis con moderación. Puedes agendar citas directamente con las herramientas disponibles.`

    // ── Agentic loop (máx 3 iteraciones) ────────────────────────────────────
    const msgLower = messageBody.toLowerCase()
    const isCancelIntent = ['cancel', 'no puedo ir', 'no voy', 'quiero cancelar', 'borrar cita', 'eliminar cita']
      .some(kw => msgLower.includes(kw))
    const activeTools = isCancelIntent ? bookingTools : bookingTools!.filter(t => t.name !== 'cancel_appointment')

    let currentMessages = [
      ...history,
      { role: 'user' as const, content: messageBody },
    ]
    let finalReply = ''
    let calendarLink = ''

    for (let i = 0; i < 3; i++) {
      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 700,
        system:     systemPrompt,
        tools:      activeTools,
        messages:   currentMessages,
      })

      if (response.stop_reason !== 'tool_use') {
        finalReply = response.content
          .filter(b => b.type === 'text')
          .map(b => (b as { type: 'text'; text: string }).text)
          .join('')
        break
      }

      const toolUseBlocks  = response.content.filter(b => b.type === 'tool_use')
      const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = []

      await Promise.all(toolUseBlocks.map(async block => {
        if (block.type !== 'tool_use') return
        const input = block.input as Record<string, string>
        let result  = ''

        if (block.name === 'check_availability') {
          const duration = Number(input.duration_minutes) || 30
          const slots = await getAvailableSlots(clinicId, input.date, duration)
          const dayName = new Date(`${input.date}T12:00:00-06:00`).toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City',
          })
          result = slots.length > 0
            ? `El ${input.date} es ${dayName}. Horarios disponibles (servicio de ${duration} min): ${slots.join(', ')}`
            : `El ${input.date} es ${dayName}. No hay horarios disponibles. Sugiere otra fecha.`
        }

        if (block.name === 'cancel_appointment') {
          const confirmed = (block.input as Record<string, unknown>).confirm === true
          if (!confirmed) {
            result = 'El cliente no confirmó la cancelación. Pregúntale si está seguro.'
          } else {
            try {
              const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/appointments/cancel`
              const res = await fetch(cancelUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: senderNumber, clinicId }),
              })
              const data = await res.json()
              result = data.message || (res.ok ? 'Cita cancelada exitosamente.' : 'No se pudo cancelar la cita.')
            } catch (err) {
              console.error('[cancel_appointment tool]', err)
              result = 'No pude cancelar la cita en este momento. Por favor llama directamente a la clínica.'
            }
          }
        }

        if (block.name === 'book_appointment') {
          console.log('[webhook] calling book_appointment with:', JSON.stringify(block.input))
          try {
            const appointmentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/appointments`
            const res = await fetch(appointmentUrl, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clinicId,
                patientName:     input.patient_name,
                petName:         input.pet_name,
                service:         input.service,
                appointmentAt:   input.appointment_at,
                phone:           input.phone || senderNumber,
                email:           input.email || '',
                durationMinutes: Number(input.duration_minutes) || 30,
                notes:           input.notes || '',
              }),
            })
            if (!res.ok) {
              const errText = await res.text()
              console.error('[book_appointment] API error:', res.status, errText)
              throw new Error(`HTTP ${res.status}: ${errText}`)
            }
            const data = await res.json()
            console.log('[book_appointment] success:', data.appointmentId, 'calLink:', !!data.calendarLink)
            result = data.message || 'Cita agendada exitosamente.'
            if (data.calendarLink) calendarLink = data.calendarLink
          } catch (err) {
            console.error('[book_appointment tool]', err)
            result = 'No pude registrar la cita en este momento. Por favor llama directamente a la clínica.'
          }
        }

        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
      }))

      currentMessages = [
        ...currentMessages,
        { role: 'assistant' as const, content: response.content },
        { role: 'user' as const,      content: toolResults },
      ]
    }

    console.log('[webhook] loop done — finalReply:', !!finalReply, 'calendarLink:', !!calendarLink)
    if (!finalReply) finalReply = 'No pude procesar tu mensaje. Por favor intenta de nuevo.'
    if (calendarLink) finalReply += `\n\n📅 Agrega al calendario: ${calendarLink}`

    // Guardar en background (no bloqueante)
    supabase.from('whatsapp_messages').insert({
      clinic_id:    clinicId,
      phone_number: senderNumber,
      message:      messageBody,
      response:     finalReply,
    }).then(() => {})

    return twimlResponse(finalReply)
  } catch (err) {
    console.error('[whatsapp/webhook]', err)
    return twimlResponse('Ocurrió un error inesperado. Por favor intenta de nuevo.')
  }
}

function twimlResponse(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message>
</Response>`
  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } })
}
