'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MessageCircle, Save, Check, Phone, ChevronDown, ChevronUp } from 'lucide-react'

interface WAConfig {
  id?: string
  twilio_account_sid: string
  twilio_auth_token: string
  twilio_phone_number: string
  is_active: boolean
}

interface WhatsAppSettingsProps {
  clinicId: string
  initialConfig: WAConfig | null
  poolPhone?: string | null
}

export function WhatsAppSettings({ clinicId, initialConfig, poolPhone }: WhatsAppSettingsProps) {
  const supabase = createClient()
  const [config, setConfig] = useState<WAConfig>(initialConfig ?? {
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_phone_number: '',
    is_active: false,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [assignedPhone, setAssignedPhone] = useState<string | null>(poolPhone ?? null)

  const isPoolNumber = !!assignedPhone
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const webhookUrl = `${appUrl}/api/whatsapp/webhook`

  function update(field: keyof WAConfig, value: string | boolean) {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  async function handleRequestNumber() {
    setRequesting(true)
    const res = await fetch('/api/phone-pool/assign', { method: 'POST' })
    const data = await res.json()
    if (data.phone) setAssignedPhone(data.phone)
    setRequesting(false)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      clinic_id: clinicId,
      twilio_account_sid: config.twilio_account_sid,
      twilio_auth_token: config.twilio_auth_token,
      twilio_phone_number: config.twilio_phone_number.startsWith('+')
        ? config.twilio_phone_number
        : `+${config.twilio_phone_number}`,
      is_active: config.is_active,
    }

    if (initialConfig?.id) {
      await supabase.from('whatsapp_configs').update(payload).eq('id', initialConfig.id)
    } else {
      await supabase.from('whatsapp_configs').insert(payload)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <MessageCircle size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">WhatsApp</h2>
            <p className="text-sm text-gray-500">Número de WhatsApp asignado a tu clínica</p>
          </div>
        </div>

        {isPoolNumber ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Phone size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-0.5">Tu número de WhatsApp</p>
                <p className="text-xl font-bold text-gray-900 font-mono">{assignedPhone}</p>
              </div>
              <span className="ml-auto text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">Activo</span>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Tus clientes pueden escribirte a este número en WhatsApp y Huella Bot responderá automáticamente.
              Comparte este número en tu clínica, redes sociales y tarjetas de presentación.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4 text-center">
            <Phone size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 font-medium mb-1">Aún no tienes un número asignado</p>
            <p className="text-xs text-gray-400 mb-4">
              Solicita tu número de WhatsApp dedicado. Lo asignaremos automáticamente de nuestro pool.
            </p>
            <Button onClick={handleRequestNumber} loading={requesting} size="sm">
              Solicitar número de WhatsApp
            </Button>
          </div>
        )}

        {/* Advanced: manual Twilio config */}
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-2"
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Configuración avanzada (número propio)
        </button>

        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
            <p className="text-xs text-gray-500">
              Si prefieres usar tu propio número de Twilio, configúralo aquí.
              Webhook URL: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono break-all">{webhookUrl}</code>
            </p>
            <Input
              label="Twilio Account SID"
              value={config.twilio_account_sid}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              onChange={e => update('twilio_account_sid', e.target.value)}
            />
            <Input
              label="Twilio Auth Token"
              type="password"
              value={config.twilio_auth_token}
              placeholder="Tu auth token de Twilio"
              onChange={e => update('twilio_auth_token', e.target.value)}
            />
            <Input
              label="Número de WhatsApp (con código de país)"
              value={config.twilio_phone_number}
              placeholder="+14155238886"
              onChange={e => update('twilio_phone_number', e.target.value)}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => update('is_active', !config.is_active)}
                className={`relative w-11 h-6 rounded-full transition-colors ${config.is_active ? 'bg-brand-teal' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.is_active ? 'translate-x-5' : ''}`} />
              </button>
              <span className="text-sm text-gray-700">
                {config.is_active ? 'Activo' : 'Desactivado'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleSave} loading={saving} size="sm">
                <Save size={14} className="mr-1.5" />
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
              {saved && <span className="text-sm text-green-600 font-medium flex items-center gap-1"><Check size={14} /> Guardado</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
