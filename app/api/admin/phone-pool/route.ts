import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as serviceClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'huellabot@outlook.com'

const adminSupabase = serviceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await adminSupabase
    .from('phone_number_pool')
    .select('*, clinics(name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ numbers: data })
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { phone_number, twilio_sid, friendly_name } = body

  if (!phone_number) return NextResponse.json({ error: 'phone_number required' }, { status: 400 })

  const normalized = phone_number.startsWith('+') ? phone_number : `+${phone_number}`

  const { data, error } = await adminSupabase
    .from('phone_number_pool')
    .insert({ phone_number: normalized, twilio_sid, friendly_name, is_active: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ number: data })
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, is_active } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await adminSupabase
    .from('phone_number_pool')
    .update({ is_active })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
