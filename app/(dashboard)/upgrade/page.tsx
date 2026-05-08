'use client'
import { useState } from 'react'
import { CheckCircle, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const FEATURES = [
  'Bot de WhatsApp con IA 24/7',
  'Widget embebible para tu sitio web',
  'Agendamiento automático de citas',
  'Sincronización con Google Calendar',
  'Dashboard de citas en tiempo real',
  'Historial de conversaciones',
  'Soporte por correo',
]

export default function UpgradePage() {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
    else setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap size={28} className="text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Activa tu plan</h1>
          <p className="text-gray-500 mt-2">14 días gratis, cancela cuando quieras</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-bold text-gray-900">$299</span>
            <span className="text-gray-400">MXN / mes</span>
          </div>

          <ul className="space-y-3 mb-8">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3 text-sm text-gray-700">
                <CheckCircle size={16} className="text-brand-600 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <Button onClick={handleCheckout} loading={loading} className="w-full" size="lg">
            Comenzar 14 días gratis
          </Button>
          <p className="text-xs text-gray-400 text-center mt-3">
            No se cobra nada hoy. Tarjeta requerida para continuar después del trial.
          </p>
        </div>
      </div>
    </div>
  )
}
