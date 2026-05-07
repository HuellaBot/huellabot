'use client'
import { Calendar, CheckCircle, ExternalLink, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CalendarConnectProps {
  clinicId: string
  isConnected: boolean
  connectedAt?: string
}

export function CalendarConnect({ clinicId, isConnected, connectedAt }: CalendarConnectProps) {
  const [connected, setConnected] = useState(isConnected)
  const [disconnecting, setDisconnecting] = useState(false)

  async function handleDisconnect() {
    setDisconnecting(true)
    const supabase = createClient()
    await supabase.from('google_calendar_tokens').delete().eq('clinic_id', clinicId)
    setConnected(false)
    setDisconnecting(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${connected ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <Calendar size={20} className={connected ? 'text-blue-600' : 'text-gray-400'} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Google Calendar</h2>
          <p className="text-sm text-gray-500">
            {connected ? 'Conectado — el bot puede agendar citas automáticamente' : 'Conecta tu calendario para agendar citas desde el chat'}
          </p>
        </div>
        {connected && <CheckCircle size={20} className="text-green-500 ml-auto flex-shrink-0" />}
      </div>

      {connected ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-700">
            <p className="font-medium mb-1">✓ Integración activa</p>
            <p className="text-green-600 text-xs">
              El bot detecta cuando los clientes quieren citas, consulta tus horarios disponibles
              y agenda directamente en tu Google Calendar.
              {connectedAt && ` Conectado el ${new Date(connectedAt).toLocaleDateString('es-MX')}.`}
            </p>
          </div>
          <Button variant="ghost" size="sm" loading={disconnecting} onClick={handleDisconnect}
            className="text-red-500 hover:text-red-600 hover:bg-red-50">
            <Unlink size={14} className="mr-1.5" />
            Desconectar Google Calendar
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-2">
            <p className="font-medium text-gray-700">¿Cómo funciona?</p>
            <ol className="space-y-1 text-xs list-decimal list-inside text-gray-500">
              <li>Conectas tu Google Calendar con un clic</li>
              <li>El bot consulta tus horarios libres en tiempo real</li>
              <li>Cuando un cliente quiere cita, el bot recopila sus datos</li>
              <li>La cita se crea automáticamente en tu Google Calendar</li>
            </ol>
          </div>
          <a href="/api/auth/google">
            <Button size="md" className="flex items-center gap-2">
              <ExternalLink size={15} />
              Conectar Google Calendar
            </Button>
          </a>
          <p className="text-xs text-gray-400">
            Solo se solicita acceso a tu calendario. No leemos correos ni otros datos.
          </p>
        </div>
      )}
    </div>
  )
}
