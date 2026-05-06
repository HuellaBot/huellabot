import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic, buildSystemPrompt } from '@/lib/anthropic'
import twilio from 'twilio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Twilio sends application/x-www-form-urlencoded
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)

    const from = params.get('From') ?? ''       // whatsapp:+521234567890
    const to = params.get('To') ?? ''           // whatsapp:+14155238886
    const messageBody = params.get('Body') ?? ''

    if (!messageBody.trim()) {
      return twimlResponse('Lo siento, no pude leer tu mensaje. ¿Puedes intentarlo de nuevo?')
    }

    // Normalize the Twilio number to look up which clinic it belongs to
    const twilioNumber = to.replace('whatsapp:', '')
    const senderNumber = from.replace('whatsapp:', '')

    // Fetch clinic config by Twilio number
    const { data: waConfig } = await supabase
      .from('whatsapp_configs')
      .select('clinic_id, twilio_account_sid, twilio_auth_token, is_active')
      .eq('twilio_phone_number', twilioNumber)
      .eq('is_active', true)
      .single()

    if (!waConfig) {
      return twimlResponse('Este número no está configurado. Contacta al administrador.')
    }

    // Validate Twilio signature (security — only in production)
    if (process.env.NODE_ENV === 'production') {
      const authToken = waConfig.twilio_auth_token
      const signature = req.headers.get('x-twilio-signature') ?? ''
      const url = process.env.NEXT_PUBLIC_APP_URL + '/api/whatsapp/webhook'
      const paramsObj: Record<string, string> = {}
      params.forEach((value, key) => { paramsObj[key] = value })
      const valid = twilio.validateRequest(authToken, signature, url, paramsObj)
      if (!valid) {
        return new NextResponse('Forbidden', { status: 403 })
      }
    }

    // Fetch clinic data + bot config + services
    const [{ data: clinic }, { data: services }, { data: botConfig }] = await Promise.all([
      supabase.from('clinics').select('*').eq('id', waConfig.clinic_id).single(),
      supabase.from('services').select('*').eq('clinic_id', waConfig.clinic_id),
      supabase.from('bot_configs').select('*').eq('clinic_id', waConfig.clinic_id).single(),
    ])

    if (!clinic) {
      return twimlResponse('Error al cargar la información de la clínica.')
    }

    // Fetch recent conversation history for context (last 10 messages)
    const { data: recentMessages } = await supabase
      .from('whatsapp_messages')
      .select('message, response')
      .eq('clinic_id', waConfig.clinic_id)
      .eq('phone_number', senderNumber)
      .order('timestamp', { ascending: false })
      .limit(5)

    // Build message history (most recent first → reverse for chronological order)
    const history = (recentMessages ?? []).reverse().flatMap(m => [
      { role: 'user' as const, content: m.message },
      { role: 'assistant' as const, content: m.response },
    ])

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

    // Save conversation to whatsapp_messages table
    await supabase.from('whatsapp_messages').insert({
      clinic_id: waConfig.clinic_id,
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
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'text/xml' },
  })
}
