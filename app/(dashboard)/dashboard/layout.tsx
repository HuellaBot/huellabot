import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, Settings, LogOut, ExternalLink, CalendarDays } from 'lucide-react'

const NAV = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Panel principal' },
  { href: '/dashboard/appointments', icon: CalendarDays,    label: 'Citas'           },
  { href: '/dashboard/settings',     icon: Settings,        label: 'Configuración'   },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let { data: clinic } = await supabase
    .from('clinics').select('*').eq('user_id', user.id).single()

  if (!clinic) {
    const clinicName = user.user_metadata?.clinic_name || 'Mi Veterinaria'
    const { data: newClinic } = await supabase
      .from('clinics').insert({ user_id: user.id, name: clinicName }).select().single()
    if (newClinic) {
      await supabase.from('bot_configs').insert({ clinic_id: newClinic.id })
      clinic = newClinic
    }
  }

  const previewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/preview/${clinic?.id}`

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-navy flex flex-col fixed top-0 left-0 h-full z-40">

        {/* Logo */}
        <div className="px-6 pt-7 pb-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-2xl">🐾</span>
            <span className="font-bold text-lg tracking-tight text-white">Huella Bot</span>
          </Link>
        </div>

        {/* Clinic name card */}
        {clinic && (
          <div className="mx-4 mb-6 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-teal mb-0.5">Clínica</p>
            <p className="text-sm font-semibold text-white truncate">{clinic.name}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-all"
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}

          {clinic && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-all"
            >
              <ExternalLink size={17} />
              Vista previa
            </a>
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-5 border-t border-white/10">
          <p className="text-white/40 text-xs truncate mb-3">{user.email}</p>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              <LogOut size={15} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 min-h-screen p-8">
        {children}
      </main>
    </div>
  )
}
