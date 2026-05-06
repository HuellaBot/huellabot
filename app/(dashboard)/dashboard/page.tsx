import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BotConfig } from '@/components/dashboard/BotConfig'
import { WidgetCode } from '@/components/dashboard/WidgetCode'
import { MessageSquare, Users, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clinic } = await supabase
    .from('clinics')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!clinic) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Configurando tu clínica... recarga la página en un momento.</p>
      </div>
    )
  }

  const [{ data: botConfig }, { data: services }, { data: conversations }] = await Promise.all([
    supabase.from('bot_configs').select('*').eq('clinic_id', clinic.id).single(),
    supabase.from('services').select('*').eq('clinic_id', clinic.id),
    supabase.from('conversations').select('id').eq('clinic_id', clinic.id),
  ])

  const defaultBotConfig = botConfig ?? {
    id: '',
    bot_name: 'Asistente Virtual',
    bot_tone: 'amigable y profesional',
    welcome_message: '¡Hola! ¿En qué puedo ayudarte hoy?',
    primary_color: '#2D6A4F',
  }

  const stats = [
    { label: 'Conversaciones', value: conversations?.length ?? 0, icon: MessageSquare },
    { label: 'Servicios configurados', value: services?.length ?? 0, icon: Users },
    { label: 'Estado', value: 'Activo', icon: TrendingUp },
  ]

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Panel de control</h1>
        <p className="text-gray-500 mt-1">Configura y gestiona el chatbot de {clinic.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center">
                <s.icon size={17} className="text-brand-700" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Widget code */}
      <div className="mb-8">
        <WidgetCode clinicId={clinic.id} />
      </div>

      {/* Bot configuration */}
      <BotConfig
        clinic={clinic}
        botConfig={defaultBotConfig}
        services={services ?? []}
      />
    </div>
  )
}
