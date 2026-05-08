import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic, buildSystemPrompt } from '@/lib/anthropic'
import { getAvailableSlots } from '@/lib/google-calendar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const bookingTools: Parameters<typeof anthropic.messages.create>[0]['tools'] = [
  {
    name: 'check_availability',
    description: 'Consulta los horarios disponibles para una fecha específica. Úsalo cuando el cliente quiera agendar una cita y mencione una fecha.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string',
          description: 'Fecha en formato YYYY-MM-DD. Si el cliente dice "mañana" o "el lunes", convierte a fecha exacta.',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'book_appointment',
    description: 'Agenda una cita cuando ya tienes TODOS los datos: nombre del dueño, nombre de la mascota, servicio, fecha y hora. No llames esta herramienta hasta tener toda la información.',
    input_schema: {
      type: 'object' as const,
      properties: {
        patient_name: { type: 'string', description: 'Nombre del dueño de la mascota' },
        pet_name: { type: 'string', description: 'Nombre de la mascota' },
        service: { type: 'string', description: 'Servicio solicitado (ej: consulta general, vacunación)' },
        appointment_at: { type: 'string', description: 'Fecha y hora en formato ISO 8601 (ej: 2026-05-10T10:00:00)' },
        phone: { type: 'string', description: 'Teléfono de contacto del cliente (opcional)' },
        notes: { type: 'string', description: 'Notas adicionales (opcional)' },
      },
      required: ['patient_name', 'pet_name', 'service', 'appointment_at'],
    },
  },
]

export async function POST(req: NextRequest) {
  try {
    const { clinicId, messages, sessionId } = await req.json()

    if (!clinicId || !messages) {
      return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 })
    }

    const [{ data: clinic }, { data: services }, { data: botConfig }] = await Promise.all([
      supabase.from('clinics').select('*').eq('id', clinicId).single(),
      supabase.from('services').select('*').eq('clinic_id', clinicId),
      supabase.from('bot_configs').select('*').eq('clinic_id', clinicId).single(),
    ])

    if (!clinic) {
      return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })
    }

    const { data: calendarToken } = await supabase
      .from('google_calendar_tokens')
      .select('id')
      .eq('clinic_id', clinicId)
      .maybeSingle()

    const systemPrompt = buildSystemPrompt({
      name: clinic.name,
      description: clinic.description || '',
      services: services || [],
      hours: clinic.hours || '',
      phone: clinic.phone || '',
      address: clinic.address || '',
      bot_name: botConfig?.bot_name || 'Asistente Virtual',
      bot_tone: botConfig?.bot_tone || 'amigable y profesional',
      extra_info: clinic.extra_info || '',
    }) + `\n\nFECHA ACTUAL: ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Mexico_City' })}. Usa siempre el año correcto al agendar citas.\n\nPUEDES AGENDAR CITAS: Cuando el cliente quiera una cita, usa check_availability para ver horarios disponibles, luego recopila nombre del dueño, nombre de la mascota y servicio, y finalmente usa book_appointment para confirmar. Siempre confirma los datos antes de agendar.`

    // Agendar con agentic loop (máx 3 iteraciones para tool use)
    let currentMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    let finalReply = ''
    let iterations = 0

    while (iterations < 3) {
      iterations++

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: systemPrompt,
        tools: bookingTools,
        messages: currentMessages,
      })

      // Si paró sin usar tools → es la respuesta final
      if (response.stop_reason === 'end_turn') {
        finalReply = response.content
          .filter(b => b.type === 'text')
          .map(b => (b as { type: 'text'; text: string }).text)
          .join('')
        break
      }

      // Procesar tool calls
      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
        const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = []

        for (const block of toolUseBlocks) {
          if (block.type !== 'tool_use') continue
          const input = block.input as Record<string, string>
          let result = ''

          if (block.name === 'check_availability') {
            const slots = await getAvailableSlots(clinicId, input.date)
            result = slots.length > 0
              ? `Horarios disponibles el ${input.date}: ${slots.join(', ')}`
              : `No hay horarios disponibles el ${input.date}. Sugiere otra fecha.`
          }

          if (block.name === 'book_appointment') {
            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  clinicId,
                  patientName: input.patient_name,
                  petName: input.pet_name,
                  service: input.service,
                  appointmentAt: input.appointment_at,
                  phone: input.phone || '',
                  notes: input.notes || '',
                }),
              })
              const data = await res.json()
              result = data.message || 'Cita agendada exitosamente.'
            } catch {
              result = 'No pude agendar la cita en este momento. Por favor llama directamente a la clínica.'
            }
          }

          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
        }

        // Añadir respuesta del asistente + resultados de tools al historial
        currentMessages = [
          ...currentMessages,
          { role: 'assistant' as const, content: response.content },
          { role: 'user' as const, content: toolResults },
        ]
        continue
      }

      // Cualquier otro stop reason
      finalReply = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('')
      break
    }

    if (!finalReply) {
      finalReply = 'No pude procesar tu mensaje. Por favor intenta de nuevo.'
    }

    // Guardar conversación
    if (sessionId) {
      const allMessages = [...messages, { role: 'assistant', content: finalReply }]
      supabase.from('conversations').upsert({
        clinic_id: clinicId,
        session_id: sessionId,
        messages: allMessages,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' }).then(() => {})
    }

    return NextResponse.json({ reply: finalReply })
  } catch (err) {
    console.error('[chat/route]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
