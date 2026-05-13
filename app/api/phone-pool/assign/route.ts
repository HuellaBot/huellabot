import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assignNumberToClinic } from '@/lib/phone-pool'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clinic } = await supabase
    .from('clinics').select('id').eq('user_id', user.id).maybeSingle()
  if (!clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })

  const phone = await assignNumberToClinic(clinic.id)
  if (!phone) {
    return NextResponse.json(
      { error: 'No hay números disponibles en el pool. Contacta a soporte.' },
      { status: 503 }
    )
  }

  return NextResponse.json({ phone })
}
