import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic, buildSystemPrompt } from '@/lib/anthropic'
import twilio from 'twilio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)

    const from = params.get('From') ?? ''   // whatsapp:+521234567890
    const to   = params.get('To')   ?? ''   // whatsapp:+14155238886
    const messageBody = params.get('Body') ?? ''

    if (!messageBody.trim()) {
      return twimlResponse('Lo siento, no pude leer tu mensaje. ¿Puedes intentarlo de nuevo?')
    }

    const twilioNumber = to.replace('whatsapp:', '').trim()
    const senderNumber = from.replace('whatsapp:', '').trim()

    // ── Buscar clínica: 4 estrategias en cascada ─────────────────────────────

    let clinicId: string | null = null

    // 1. Número exacto + activo
    const { data: exactActive } = await supabase
      .from('whatsapp_configs')
      .select('clinic_id')
      .eq('twilio_phone_number', twilioNumber)
      .eq('is_active', true)
      .maybeSingle()
    if (exactActive) clinicId = exactActive.clinic_id

    // 2. Número exacto sin importar is_active (config guardada pero no activada)
    if (!clinicId) {
      const normalized = [twilioNumber, twilioNumber.replace(/^\+/, ''), `+${twilioNumber.replace(/^\+/, '')}`]
      const { data: anyMatch } = await supabase
        .from('whatsapp_configs')
        .select('clinic_id')
        .in('twilio_phone_number', normalized)
        .maybeSingle()
      if (anyMatch) clinicId = anyMatch.clinic_id
    }

    // 3. Cualquier clínica con whatsapp_config (útil en sandbox con número compartido)
    if (!clinicId) {
      const { data: anyConfig } = await supabase
        .from('whatsapp_configs')
        .select('clinic_id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (anyConfig) clinicId = anyConfig.clinic_id
    }

    // 4. Cualquier clínica existente en el sistema (fallback sandbox absoluto)
    if (!clinicId) {
      const { data: anyClinic } = await supabase
        .from('clinics')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (anyClinic) clinicId = anyClinic.id
    }

    if (!clinicId) {
      return twimlResponse('No hay clínicas registradas en este sistema aún. Por favor crea una cuenta en huellabot-tau.vercel.app')
    }

    // ── Validar firma Twilio solo en producción con config activa ─────────────
    if (process.env.NODE_ENV === 'production') {
      const { data: waConfig } = await supabase
        .from('whatsapp_configs')
        .select('twilio_auth_token, is_active')
        .eq('clinic_id', clinicId)
        .maybeSingle()

      if (waConfig?.is_active && waConfig.twilio_auth_token) {
        const signature = req.headers.get('x-twilio-signature') ?? ''
        const url = process.env.NEXT_PUBLIC_APP_URL + '/api/whatsapp/webhook'
        const paramsObj: Record<string, string> = {}
        params.forEach((value, key) => { paramsObj[key] = value })
        const valid = twilio.validateRequest(waConfig.twilio_auth_token, signature, url, paramsObj)
        if (!valid) {
          return new NextResponse('Forbidden', { status: 403 })
        }
      }
    }

    // ── Cargar datos de la clínica ────────────────────────────────────────────
    const [{ data: clinic }, { data: services }, { data: botConfig }] = await Promise.all([
      supabase.from('clinics').select('*').eq('id', clinicId).single(),
      supabase.from('services').select('*').eq('clinic_id', clinicId),
      supabase.from('bot_configs').select('*').eq('clinic_id', clinicId).maybeSingle(),
    ])

    if (!clinic) {
      return twimlResponse('Error al cargar la información de la clínica.')
    }

    // ── Historial de conversación (últimos 5 intercambios) ────────────────────
    const { data: recentMessages } = await supabase
      .from('whatsapp_messages')
      .select('message, response')
      .eq('clinic_id', clinicId)
      .eq('phone_number', senderNumber)
      .order('timestamp', { ascending: false })
      .limit(5)

    const history = (recentMessages ?? []).reverse().flatMap(m => [
      { role: 'user' as const, content: m.message },
      { role: 'assistant' as const, content: m.response },
    ])

    // ── Llamar a Claude ───────────────────────────────────────────────────────
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
    })

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: systemPrompt + '\n\nESTÁS EN WHATSAPP: sé conciso (máximo 3 párrafos cortos). Usa emojis con moderación.',
      messages: [
        ...history,
        { role: 'user', content: messageBody },
      ],
    })

    const reply = claudeResponse.content[0].type === 'text'
      ? claudeResponse.content[0].text
      : 'No pude procesar tu mensaje. Por favor intenta de nuevo.'

    // ── Guardar conversación ──────────────────────────────────────────────────
    await supabase.from('whatsapp_messages').insert({
      clinic_id: clinicId,
      phone_number: senderNumber,
      message: messageBody,
      response: reply,
    })

    return twimlResponse(reply)
  } catch (err) {
    console.error('[whatsapp/webhook]', err)
    return twimlResponse('Ocurrió un error inesperado. Por favor intenta de nuevo en un momento.')
  }
}

function twimlResponse(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message>
</Response>`
  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } })
}
