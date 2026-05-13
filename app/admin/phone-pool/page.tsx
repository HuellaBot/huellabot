import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as serviceClient } from '@supabase/supabase-js'
import { PhonePoolAdmin } from '@/components/admin/PhonePoolAdmin'

const ADMIN_EMAIL = 'huellabot@outlook.com'

const adminSupabase = serviceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function PhonePoolPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect('/dashboard')

  const { data: numbers } = await adminSupabase
    .from('phone_number_pool')
    .select('*, clinics(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pool de números WhatsApp</h1>
        <p className="text-gray-500 mb-8">Administra los números de WhatsApp disponibles para asignar a clínicas</p>
        <PhonePoolAdmin numbers={numbers ?? []} />
      </div>
    </div>
  )
}
