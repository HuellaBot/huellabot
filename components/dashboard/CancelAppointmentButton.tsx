'use client'
import { useState } from 'react'
import { XCircle } from 'lucide-react'

export function CancelAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const [loading, setLoading] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  async function handleCancel() {
    if (!confirm('¿Cancelar esta cita?')) return
    setLoading(true)
    const res = await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    if (res.ok) {
      setCancelled(true)
    }
    setLoading(false)
  }

  if (cancelled) {
    return <span className="text-xs text-red-400">Cancelada</span>
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors disabled:opacity-50"
    >
      <XCircle size={13} />
      {loading ? 'Cancelando...' : 'Cancelar'}
    </button>
  )
}
