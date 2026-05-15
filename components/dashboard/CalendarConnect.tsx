'use client'
import { Calendar, CheckCircle, RefreshCw, Unlink, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SERVICE_ACCOUNT_EMAIL = 'huellabot-calendar@huella-bot.iam.gserviceaccount.com'

interface CalendarConnectProps {
  clinicId: string
  isConnected: boolean
  connectedAt?: string
  calendarId?: string
}

export function CalendarConnect({ clinicId, isConnected, connectedAt, calendarId: initialCalendarId }: CalendarConnectProps) {
  const [connected, setConnected]         = useState(isConnected)
  const [calendarId, setCalendarId]       = useState(initialCalendarId ?? '')
  const [saving, setSaving]               = useState(false)
  const [verifyMsg, setVerifyMsg]         = useState('')
  const [copied, setCopied]               = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing]             = useState(false)
  const [syncMsg, setSyncMsg]             = useState('')

  async function handleCopy() {
    await navigator.clipboard.writeText(SERVICE_ACCOUNT_EMAIL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleConnect() {
    if (!calendarId.trim()) {
      setVerifyMsg('Ingresa tu correo de Google Calendar')
      return
    }
    setSaving(true)
    setVerifyMsg('')

    const res = await fetch('/api/calendar/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calendarId: calendarId.trim() }),
    })
    const data = await res.json()

    if (res.ok) {
      setConnected(true)
      setVerifyMsg('')
    } else {
      setVerifyMsg(data.error ?? 'No se pudo verificar. Asegúrate de haber compartido el calendario.')
    }
    setSaving(false)
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    const supabase = createClient()
    await supabase.from('google_calendar_tokens').delete().eq('clinic_id', clinicId)
    setConnected(false)
    setDisconnecting(false)
  }

  async function handleSync() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      setSyncMsg(res.ok ? '✓ Sincronización completada' : 'Error al sincronizar')
    } catch {
      setSyncMsg('Error al sincronizar')
    }
    setSyncing(false)
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
            {connected ? 'Conectado — el bot agenda citas automáticamente' : 'Comparte tu calendario para que el bot pueda agendar citas'}
          </p>
        </div>
        {connected && <CheckCircle size={20} className="text-green-500 ml-auto flex-shrink-0" />}
      </div>

      {connected ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-700">
            <p className="font-medium mb-1">✓ Integración activa</p>
            <p className="text-green-600 text-xs">
              El bot consulta disponibilidad y agenda citas directamente en tu Google Calendar.
              {connectedAt && ` Conectado el ${new Date(connectedAt).toLocaleDateString('es-MX')}.`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" loading={syncing} onClick={handleSync}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              <RefreshCw size={14} className={`mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar ahora
            </Button>
            <Button variant="ghost" size="sm" loading={disconnecting} onClick={handleDisconnect}
              className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <Unlink size={14} className="mr-1.5" />
              Desconectar
            </Button>
          </div>
          {syncMsg && <p className="text-xs text-green-600">{syncMsg}</p>}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Paso 1 */}
          <div className="flex gap-3">
            <span className="w-6 h-6 bg-brand-100 text-brand-navy rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800 mb-2">
                Abre Google Calendar → Configuración → elige tu calendario → <strong>Compartir con personas</strong>
              </p>
              <p className="text-xs text-gray-500 mb-2">Agrega este correo con permiso <strong>"Hacer cambios en los eventos"</strong>:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-gray-800 break-all">
                  {SERVICE_ACCOUNT_EMAIL}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-2 text-gray-400 hover:text-brand-teal transition-colors flex-shrink-0"
                  title="Copiar"
                >
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="flex gap-3">
            <span className="w-6 h-6 bg-brand-100 text-brand-navy rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800 mb-2">Ingresa tu correo de Google</p>
              <Input
                placeholder="tu@gmail.com"
                value={calendarId}
                onChange={e => setCalendarId(e.target.value)}
                type="email"
              />
            </div>
          </div>

          {/* Paso 3 */}
          <div className="flex gap-3">
            <span className="w-6 h-6 bg-brand-100 text-brand-navy rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
            <div className="flex-1">
              <Button onClick={handleConnect} loading={saving}>
                Verificar y conectar
              </Button>
              {verifyMsg && (
                <p className={`text-xs mt-2 ${verifyMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                  {verifyMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
