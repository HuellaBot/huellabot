import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WhatsAppSettings } from '@/components/dashboard/WhatsAppSettings'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clinic } = await supabase
    .from('clinics')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!clinic) redirect('/dashboard')

  const { data: waConfig } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('clinic_id', clinic.id)
    .maybeSingle()

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">Gestiona la integración de WhatsApp y ajustes avanzados</p>
      </div>

      <WhatsAppSettings clinicId={clinic.id} initialConfig={waConfig} />
    </div>
  )
}
