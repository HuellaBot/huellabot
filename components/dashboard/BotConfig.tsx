'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Plus, Trash2, Save } from 'lucide-react'

interface Service {
  id?: string
  name: string
  price: string
  duration_minutes: number
}

interface BotConfigProps {
  clinic: {
    id: string
    name: string
    description: string
    phone: string
    address: string
    hours: string
    extra_info: string
  }
  botConfig: {
    id: string
    bot_name: string
    bot_tone: string
    welcome_message: string
    primary_color: string
  }
  services: Service[]
}

export function BotConfig({ clinic, botConfig, services: initialServices }: BotConfigProps) {
  const supabase = createClient()

  const [clinicData, setClinicData] = useState(clinic)
  const [botData, setBotData] = useState(botConfig)
  const [services, setServices] = useState<Service[]>(
    initialServices.map(s => ({ ...s, duration_minutes: (s as Service & { duration?: string }).duration_minutes ?? 30 }))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function addService() {
    setServices(prev => [...prev, { name: '', price: '', duration_minutes: 30 }])
  }

  function updateService(i: number, field: keyof Service, value: string | number) {
    setServices(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  function removeService(i: number) {
    setServices(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    setSaving(true)

    // Update clinic info
    await supabase.from('clinics').update({
      name: clinicData.name,
      description: clinicData.description,
      phone: clinicData.phone,
      address: clinicData.address,
      hours: clinicData.hours,
      extra_info: clinicData.extra_info,
    }).eq('id', clinic.id)

    // Update bot config
    await supabase.from('bot_configs').update({
      bot_name: botData.bot_name,
      bot_tone: botData.bot_tone,
      welcome_message: botData.welcome_message,
      primary_color: botData.primary_color,
    }).eq('clinic_id', clinic.id)

    // Sync services: delete all and re-insert
    await supabase.from('services').delete().eq('clinic_id', clinic.id)
    const validServices = services.filter(s => s.name && s.price)
    if (validServices.length > 0) {
      await supabase.from('services').insert(
        validServices.map(s => ({ clinic_id: clinic.id, name: s.name, price: s.price, duration_minutes: s.duration_minutes }))
      )
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-8">
      {/* Clinic Info */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-5">Información de la clínica</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre de la clínica"
            value={clinicData.name}
            onChange={e => setClinicData(p => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Teléfono"
            value={clinicData.phone}
            placeholder="+52 55 1234 5678"
            onChange={e => setClinicData(p => ({ ...p, phone: e.target.value }))}
          />
          <Input
            label="Dirección"
            value={clinicData.address}
            placeholder="Calle, colonia, ciudad"
            onChange={e => setClinicData(p => ({ ...p, address: e.target.value }))}
            className="md:col-span-2"
          />
          <Input
            label="Horarios"
            value={clinicData.hours}
            placeholder="Lun-Vie 8:00-18:00, Sáb 9:00-14:00"
            onChange={e => setClinicData(p => ({ ...p, hours: e.target.value }))}
            className="md:col-span-2"
          />
          <Textarea
            label="Descripción de la clínica"
            value={clinicData.description}
            placeholder="Somos una clínica veterinaria especializada en..."
            rows={3}
            onChange={e => setClinicData(p => ({ ...p, description: e.target.value }))}
            className="md:col-span-2"
          />
          <Textarea
            label="Información adicional para el bot"
            value={clinicData.extra_info}
            placeholder="Políticas de cancelación, formas de pago, estacionamiento..."
            rows={3}
            onChange={e => setClinicData(p => ({ ...p, extra_info: e.target.value }))}
            className="md:col-span-2"
          />
        </div>
      </section>

      {/* Services */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Servicios y precios</h2>
          <Button variant="secondary" size="sm" onClick={addService}>
            <Plus size={15} className="mr-1" /> Agregar servicio
          </Button>
        </div>

        <div className="space-y-3">
          {services.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              Agrega los servicios que ofrece tu clínica
            </p>
          )}
          {services.map((s, i) => (
            <div key={i} className="flex gap-3 items-start">
              <Input
                placeholder="Nombre del servicio"
                value={s.name}
                onChange={e => updateService(i, 'name', e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Precio"
                value={s.price}
                onChange={e => updateService(i, 'price', e.target.value)}
                className="w-28"
              />
              <div className="w-36 flex flex-col gap-1">
                <Input
                  placeholder="Minutos"
                  type="number"
                  min={5}
                  step={5}
                  value={s.duration_minutes}
                  onChange={e => updateService(i, 'duration_minutes', Number(e.target.value))}
                />
                <span className="text-xs text-gray-400 pl-1">minutos</span>
              </div>
              <button
                onClick={() => removeService(i)}
                className="mt-0.5 p-2.5 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Bot Personality */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-5">Personalidad del bot</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre del asistente"
            value={botData.bot_name}
            placeholder="Ej: Luna, Max, Asistente Virtual"
            onChange={e => setBotData(p => ({ ...p, bot_name: e.target.value }))}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Tono de comunicación</label>
            <select
              value={botData.bot_tone}
              onChange={e => setBotData(p => ({ ...p, bot_tone: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="amigable y profesional">Amigable y profesional</option>
              <option value="formal y serio">Formal y serio</option>
              <option value="casual y cercano">Casual y cercano</option>
              <option value="empático y cálido">Empático y cálido</option>
            </select>
          </div>
          <Textarea
            label="Mensaje de bienvenida"
            value={botData.welcome_message}
            placeholder="¡Hola! ¿En qué puedo ayudarte hoy?"
            rows={2}
            onChange={e => setBotData(p => ({ ...p, welcome_message: e.target.value }))}
            className="md:col-span-2"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Color principal del widget</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={botData.primary_color}
                onChange={e => setBotData(p => ({ ...p, primary_color: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <span className="text-sm text-gray-500 font-mono">{botData.primary_color}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} loading={saving} size="lg">
          <Save size={16} className="mr-2" />
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </Button>
        {saved && (
          <span className="text-sm text-brand-600 font-medium">
            ✓ Guardado correctamente
          </span>
        )}
      </div>
    </div>
  )
}
