import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Calendar, Clock, User, PawPrint, Phone, CheckCircle, XCircle } from 'lucide-react'
import { CancelAppointmentButton } from '@/components/dashboard/CancelAppointmentButton'

export default async function AppointmentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clinic } = await supabase
    .from('clinics').select('id, name').eq('user_id', user.id).maybeSingle()
  if (!clinic) redirect('/dashboard')

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('clinic_id', clinic.id)
    .order('appointment_at', { ascending: true })

  const upcoming = (appointments ?? []).filter(a =>
    a.status === 'confirmed' && new Date(a.appointment_at) >= new Date()
  )
  const past = (appointments ?? []).filter(a =>
    a.status !== 'confirmed' || new Date(a.appointment_at) < new Date()
  )

  const statusBadge = (status: string, date: string) => {
    if (new Date(date) < new Date() && status === 'confirmed') {
      return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Pasada</span>
    }
    if (status === 'cancelled') {
      return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Cancelada</span>
    }
    return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Confirmada</span>
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Citas agendadas</h1>
        <p className="text-gray-500 mt-1">Todas las citas de {clinic.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Próximas citas', value: upcoming.length, icon: Calendar, color: 'bg-brand-100 text-brand-700' },
          { label: 'Total este mes', value: (appointments ?? []).filter(a => new Date(a.appointment_at).getMonth() === new Date().getMonth()).length, icon: Clock, color: 'bg-blue-100 text-blue-700' },
          { label: 'Completadas', value: (appointments ?? []).filter(a => a.status === 'completed').length, icon: CheckCircle, color: 'bg-green-100 text-green-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon size={17} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming */}
      <div className="mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">Próximas</h2>
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay citas próximas</p>
            <p className="text-gray-400 text-xs mt-1">Las citas que los clientes agenden por el chat aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(a => (
              <AppointmentCard key={a.id} appointment={a} badge={statusBadge(a.status, a.appointment_at)} />
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-500 mb-4 text-sm uppercase tracking-wide">Historial</h2>
          <div className="space-y-3 opacity-70">
            {past.slice(0, 10).map(a => (
              <AppointmentCard key={a.id} appointment={a} badge={statusBadge(a.status, a.appointment_at)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const MX_TZ = 'America/Mexico_City'

function AppointmentCard({ appointment: a, badge }: { appointment: Record<string, string>; badge: React.ReactNode }) {
  const date = new Date(a.appointment_at)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
      <div className="w-14 h-14 bg-brand-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-brand-700 font-bold text-lg leading-none">
          {date.toLocaleString('es-MX', { day: 'numeric', timeZone: MX_TZ })}
        </span>
        <span className="text-brand-500 text-xs">
          {date.toLocaleString('es-MX', { month: 'short', timeZone: MX_TZ })}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">{a.patient_name}</span>
          {badge}
          {a.google_event_id && <span className="text-xs text-blue-500">📅 Google Cal</span>}
          {a.status === 'confirmed' && new Date(a.appointment_at) >= new Date() && (
            <CancelAppointmentButton appointmentId={a.id} />
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
          <span className="flex items-center gap-1"><PawPrint size={11} />{a.pet_name || '—'}</span>
          <span className="flex items-center gap-1"><Clock size={11} />{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: MX_TZ })}</span>
          {a.patient_phone && <span className="flex items-center gap-1"><Phone size={11} />{a.patient_phone}</span>}
          {a.service && <span className="flex items-center gap-1"><User size={11} />{a.service}</span>}
        </div>
        {a.notes && <p className="text-xs text-gray-400 mt-1 truncate">{a.notes}</p>}
      </div>
    </div>
  )
}
