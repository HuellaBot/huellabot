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
    description: 'Consulta los horarios disponibles para una fecha específica.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD.' },
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
        patient_name:   { type: 'string' },
        pet_name:       { type: 'string' },
        service:        { type: 'string' },
        appointment_at: { type: 'string', description: 'ISO 8601, ej: 2026-05-10T10:00:00' },
        phone:          { type: 'string' },
        notes:          { type: 'string' },
      },
      required: ['patient_name', 'pet_name', 'service', 'appointment_at'],
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
        .order('timestamp', { ascending: false }).limit(6),
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

    // ── Agentic loop (máx 2 iteraciones para respetar timeout de Twilio) ─────
    let currentMessages = [
      ...history,
      { role: 'user' as const, content: messageBody },
    ]
    let finalReply = ''

    for (let i = 0; i < 2; i++) {
      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system:     systemPrompt,
        tools:      bookingTools,
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
          const slots = await getAvailableSlots(clinicId, input.date)
          result = slots.length > 0
            ? `Horarios disponibles el ${input.date}: ${slots.join(', ')}`
            : `No hay horarios disponibles el ${input.date}. Sugiere otra fecha.`
        }

        if (block.name === 'book_appointment') {
          try {
            const appointmentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/appointments`
            const res = await fetch(appointmentUrl, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clinicId,
                patientName:   input.patient_name,
                petName:       input.pet_name,
                service:       input.service,
                appointmentAt: input.appointment_at,
                phone:         input.phone || senderNumber,
                notes:         input.notes || '',
              }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            result = data.message || 'Cita agendada exitosamente.'
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

    if (!finalReply) finalReply = 'No pude procesar tu mensaje. Por favor intenta de nuevo.'

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
