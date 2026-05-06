import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Public endpoint for the widget to fetch clinic branding
export async function GET(
  _req: NextRequest,
  { params }: { params: { clinicId: string } }
) {
  const { data: clinic } = await supabase
    .from('clinics')
    .select('name')
    .eq('id', params.clinicId)
    .single()

  const { data: botConfig } = await supabase
    .from('bot_configs')
    .select('bot_name, welcome_message, primary_color')
    .eq('clinic_id', params.clinicId)
    .single()

  if (!clinic) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    clinicName: clinic.name,
    botName: botConfig?.bot_name || 'Asistente Virtual',
    welcomeMessage: botConfig?.welcome_message || '¡Hola! ¿En qué puedo ayudarte?',
    primaryColor: botConfig?.primary_color || '#2D6A4F',
  })
}
