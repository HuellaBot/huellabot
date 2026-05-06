import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, Settings, LogOut, ExternalLink } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let { data: clinic } = await supabase
    .from('clinics')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Crear clínica automáticamente si no existe (ej: primer acceso tras confirmar email)
  if (!clinic) {
    const clinicName = user.user_metadata?.clinic_name || 'Mi Veterinaria'
    const { data: newClinic } = await supabase
      .from('clinics')
      .insert({ user_id: user.id, name: clinicName })
      .select()
      .single()
    if (newClinic) {
      await supabase.from('bot_configs').insert({ clinic_id: newClinic.id })
      clinic = newClinic
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-800 text-white flex flex-col fixed top-0 left-0 h-full z-40">
        <div className="p-6 border-b border-brand-700">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <span className="font-bold text-lg">Huella Bot</span>
          </Link>
          {clinic && (
            <p className="text-brand-300 text-xs mt-2 truncate">{clinic.name}</p>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-200 hover:bg-brand-700 hover:text-white transition-colors"
          >
            <LayoutDashboard size={18} />
            Panel principal
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-200 hover:bg-brand-700 hover:text-white transition-colors"
          >
            <Settings size={18} />
            Configuración
          </Link>
          {clinic && (
            <a
              href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/preview/${clinic.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-200 hover:bg-brand-700 hover:text-white transition-colors"
            >
              <ExternalLink size={18} />
              Vista previa
            </a>
          )}
        </nav>

        <div className="p-4 border-t border-brand-700">
          <p className="text-brand-400 text-xs mb-2 truncate">{user.email}</p>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-brand-300 hover:text-white transition-colors"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}
