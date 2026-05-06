import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic, buildSystemPrompt } from '@/lib/anthropic'

// Public endpoint — no auth required (called from embeddable widget)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { clinicId, messages, sessionId } = await req.json()

    if (!clinicId || !messages) {
      return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 })
    }

    // Fetch clinic data
    const [{ data: clinic }, { data: services }, { data: botConfig }] = await Promise.all([
      supabase.from('clinics').select('*').eq('id', clinicId).single(),
      supabase.from('services').select('*').eq('clinic_id', clinicId),
      supabase.from('bot_configs').select('*').eq('clinic_id', clinicId).single(),
    ])

    if (!clinic) {
      return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })
    }

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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''

    // Save conversation (fire and forget)
    if (sessionId) {
      const allMessages = [...messages, { role: 'assistant', content: reply }]
      supabase.from('conversations').upsert({
        clinic_id: clinicId,
        session_id: sessionId,
        messages: allMessages,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' }).then(() => {})
    }

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[chat/route]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
