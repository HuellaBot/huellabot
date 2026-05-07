import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL))

  const { data: clinic } = await supabase
    .from('clinics').select('id').eq('user_id', user.id).single()

  if (!clinic) return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL))

  const url = getAuthUrl(clinic.id)
  return NextResponse.redirect(url)
}
