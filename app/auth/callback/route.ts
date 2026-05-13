import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Crear clínica si aún no existe (primer login tras confirmar email)
      const { data: existingClinic } = await supabase
        .from('clinics')
        .select('id')
        .eq('user_id', data.user.id)
        .single()

      if (!existingClinic) {
        const clinicName = data.user.user_metadata?.clinic_name || 'Mi Veterinaria'
        const { data: clinic } = await supabase
          .from('clinics')
          .insert({ user_id: data.user.id, name: clinicName })
          .select()
          .single()

        if (clinic) {
          await supabase.from('bot_configs').insert({ clinic_id: clinic.id })
          // Auto-assign WhatsApp number from pool (best-effort)
          try {
            const { assignNumberToClinic } = await import('@/lib/phone-pool')
            await assignNumberToClinic(clinic.id)
          } catch { /* no pool numbers available yet */ }
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
