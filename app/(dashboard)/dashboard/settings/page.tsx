import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WhatsAppSettings } from '@/components/dashboard/WhatsAppSettings'
import { CalendarConnect } from '@/components/dashboard/CalendarConnect'

export default async function SettingsPage({ searchParams }: { searchParams: { connected?: string; error?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clinic } = await supabase
    .from('clinics').select('*').eq('user_id', user.id).maybeSingle()
  if (!clinic) redirect('/dashboard')

  const [{ data: waConfig }, { data: calToken }] = await Promise.all([
    supabase.from('whatsapp_configs').select('*').eq('clinic_id', clinic.id).maybeSingle(),
    supabase.from('google_calendar_tokens').select('id, calendar_id, created_at').eq('clinic_id', clinic.id).maybeSingle(),
  ])

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">Integraciones y ajustes avanzados</p>
      </div>

      {searchParams.connected === 'google' && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          ✓ Google Calendar conectado correctamente
        </div>
      )}
      {searchParams.error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          Error al conectar Google Calendar. Intenta de nuevo.
        </div>
      )}

      <div className="space-y-6">
        <CalendarConnect clinicId={clinic.id} isConnected={!!calToken} connectedAt={calToken?.created_at} />
        <WhatsAppSettings clinicId={clinic.id} initialConfig={waConfig} />
      </div>
    </div>
  )
}
