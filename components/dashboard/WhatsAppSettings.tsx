'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MessageCircle, Save, Check, Info } from 'lucide-react'

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
}

export function WhatsAppSettings({ clinicId, initialConfig }: WhatsAppSettingsProps) {
  const supabase = createClient()
  const [config, setConfig] = useState<WAConfig>(initialConfig ?? {
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_phone_number: '',
    is_active: false,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const webhookUrl = `${appUrl}/api/whatsapp/webhook`

  function update(field: keyof WAConfig, value: string | boolean) {
    setConfig(prev => ({ ...prev, [field]: value }))
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
      {/* WhatsApp section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <MessageCircle size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Integración WhatsApp</h2>
            <p className="text-sm text-gray-500">Conecta tu número de Twilio para responder mensajes automáticamente</p>
          </div>
        </div>

        {/* Webhook URL info */}
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-brand-700 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-brand-700 mb-1">Tu URL de Webhook para Twilio</p>
              <p className="text-xs text-brand-600 mb-2">
                En la consola de Twilio → WhatsApp → Sandbox → cuando reciba un mensaje, pon esta URL:
              </p>
              <code className="text-xs bg-white border border-brand-200 rounded-lg px-3 py-1.5 block font-mono text-brand-800 break-all">
                {webhookUrl}
              </code>
            </div>
          </div>
        </div>

        <div className="space-y-4">
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
            label="Número de WhatsApp de Twilio (con código de país)"
            value={config.twilio_phone_number}
            placeholder="+14155238886"
            onChange={e => update('twilio_phone_number', e.target.value)}
          />

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => update('is_active', !config.is_active)}
              className={`relative w-11 h-6 rounded-full transition-colors ${config.is_active ? 'bg-brand-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.is_active ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm text-gray-700">
              {config.is_active ? 'WhatsApp activo' : 'WhatsApp desactivado'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <Button onClick={handleSave} loading={saving}>
            <Save size={15} className="mr-2" />
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
          {saved && <span className="text-sm text-brand-600 font-medium flex items-center gap-1"><Check size={14} /> Guardado</span>}
        </div>
      </div>

      {/* Setup guide */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Guía de configuración Twilio WhatsApp</h3>
        <ol className="space-y-3 text-sm text-gray-600">
          {[
            { n: 1, t: 'Crea una cuenta en twilio.com (tienen prueba gratuita)' },
            { n: 2, t: 'En la consola Twilio, ve a Messaging → Try it out → WhatsApp Sandbox' },
            { n: 3, t: 'Sigue los pasos para activar el Sandbox (envía un mensaje al número de Twilio)' },
            { n: 4, t: 'En "Sandbox Settings", pega la URL del webhook de arriba en "When a message comes in"' },
            { n: 5, t: 'Copia tu Account SID y Auth Token desde la página principal de Twilio' },
            { n: 6, t: 'Pega los datos aquí y guarda. ¡Listo para probar!' },
          ].map(({ n, t }) => (
            <li key={n} className="flex gap-3">
              <span className="w-6 h-6 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                {n}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
