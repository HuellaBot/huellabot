'use client'
import { useState } from 'react'
import { CreditCard, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { isSubscriptionActive } from '@/lib/stripe'

interface SubscriptionCardProps {
  status: string | null
  endsAt: string | null
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  active:   { label: 'Activa',           color: 'text-green-600 bg-green-50',  icon: CheckCircle },
  trialing: { label: 'Trial gratuito',   color: 'text-blue-600 bg-blue-50',   icon: Clock },
  past_due: { label: 'Pago pendiente',   color: 'text-orange-600 bg-orange-50', icon: AlertCircle },
  cancelled:{ label: 'Cancelada',        color: 'text-red-600 bg-red-50',     icon: AlertCircle },
}

export function SubscriptionCard({ status, endsAt }: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false)
  const active = isSubscriptionActive(status)
  const info   = status ? STATUS_LABELS[status] : null
  const Icon   = info?.icon ?? AlertCircle

  async function handleCheckout() {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
    else setLoading(false)
  }

  async function handlePortal() {
    setLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
    else setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-green-100' : 'bg-gray-100'}`}>
          <CreditCard size={20} className={active ? 'text-green-600' : 'text-gray-400'} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Suscripción</h2>
          <p className="text-sm text-gray-500">Plan Huella Bot Pro — $299 MXN/mes</p>
        </div>
        {info && (
          <span className={`ml-auto flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${info.color}`}>
            <Icon size={12} />
            {info.label}
          </span>
        )}
      </div>

      {active ? (
        <div className="space-y-4">
          {endsAt && (
            <p className="text-sm text-gray-500">
              {status === 'trialing' ? 'Trial termina el' : 'Próximo cobro el'}{' '}
              <span className="font-medium text-gray-700">
                {new Date(endsAt).toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  timeZone: 'America/Mexico_City',
                })}
              </span>
            </p>
          )}
          <Button variant="ghost" size="sm" loading={loading} onClick={handlePortal}
            className="text-gray-600 hover:text-gray-900">
            Administrar suscripción / cancelar
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Activa tu plan para usar el bot con tus clientes. Incluye 14 días de prueba gratis.
          </p>
          <Button loading={loading} onClick={handleCheckout} size="md">
            Comenzar 14 días gratis
          </Button>
        </div>
      )}
    </div>
  )
}
