'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Phone, Plus, CheckCircle, XCircle } from 'lucide-react'

interface PoolNumber {
  id: string
  phone_number: string
  twilio_sid: string | null
  friendly_name: string | null
  is_active: boolean
  is_assigned: boolean
  clinic_id: string | null
  assigned_at: string | null
  clinics?: { name: string } | null
}

export function PhonePoolAdmin({ numbers: initial }: { numbers: PoolNumber[] }) {
  const [numbers, setNumbers] = useState<PoolNumber[]>(initial)
  const [form, setForm] = useState({ phone_number: '', twilio_sid: '', friendly_name: '' })
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const available = numbers.filter(n => n.is_active && !n.is_assigned).length
  const assigned  = numbers.filter(n => n.is_assigned).length

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    const res = await fetch('/api/admin/phone-pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.number) {
      setNumbers(prev => [data.number, ...prev])
      setForm({ phone_number: '', twilio_sid: '', friendly_name: '' })
      setShowForm(false)
    }
    setAdding(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch('/api/admin/phone-pool', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    })
    setNumbers(prev => prev.map(n => n.id === id ? { ...n, is_active: !current } : n))
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: numbers.length, color: 'bg-gray-100 text-gray-700' },
          { label: 'Disponibles', value: available, color: 'bg-green-100 text-green-700' },
          { label: 'Asignados', value: assigned, color: 'bg-blue-100 text-blue-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add number */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Agregar número</h2>
          <Button size="sm" onClick={() => setShowForm(v => !v)} variant={showForm ? 'ghost' : 'primary'}>
            <Plus size={14} className="mr-1.5" />
            Nuevo número
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Número de teléfono (con + y código de país)"
                placeholder="+5215512345678"
                value={form.phone_number}
                onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))}
                required
              />
              <Input
                label="Twilio SID (opcional)"
                placeholder="PNxxxxxxxxxxxxxxxx"
                value={form.twilio_sid}
                onChange={e => setForm(p => ({ ...p, twilio_sid: e.target.value }))}
              />
            </div>
            <Input
              label="Nombre o etiqueta (opcional)"
              placeholder="Ej: Número CDMX 1"
              value={form.friendly_name}
              onChange={e => setForm(p => ({ ...p, friendly_name: e.target.value }))}
            />
            <Button type="submit" loading={adding}>
              Agregar al pool
            </Button>
          </form>
        )}
      </div>

      {/* Numbers list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Números en el pool</h2>
        </div>
        {numbers.length === 0 ? (
          <div className="p-8 text-center">
            <Phone size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No hay números en el pool aún</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {numbers.map(n => (
              <div key={n.id} className="px-6 py-4 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${n.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Phone size={14} className={n.is_active ? 'text-green-600' : 'text-gray-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-gray-900">{n.phone_number}</p>
                  <p className="text-xs text-gray-400">
                    {n.friendly_name && <span className="mr-2">{n.friendly_name}</span>}
                    {n.twilio_sid && <span className="mr-2 font-mono">{n.twilio_sid}</span>}
                    {n.is_assigned && n.clinics && (
                      <span className="text-blue-500">→ {n.clinics.name}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {n.is_assigned ? (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">Asignado</span>
                  ) : (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">Disponible</span>
                  )}
                  <button
                    onClick={() => toggleActive(n.id, n.is_active)}
                    className="text-gray-400 hover:text-gray-600"
                    title={n.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {n.is_active ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-400" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
