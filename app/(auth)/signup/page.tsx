'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Mail } from 'lucide-react'

export default function SignupPage() {
  const [form, setForm] = useState({ clinicName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { data, error: signupError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        // Guardar el nombre de la clínica para usarlo al confirmar el email
        data: { clinic_name: form.clinicName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signupError) {
      setError(signupError.message || 'Error al crear la cuenta.')
      setLoading(false)
      return
    }

    // Si ya hay sesión (email confirmation desactivado en Supabase)
    if (data.session) {
      const { data: clinic } = await supabase
        .from('clinics')
        .insert({ user_id: data.user!.id, name: form.clinicName })
        .select()
        .single()

      if (clinic) {
        await supabase.from('bot_configs').insert({ clinic_id: clinic.id })
      }

      window.location.href = '/dashboard'
      return
    }

    // Caso normal: Supabase envió el email de confirmación
    setEmailSent(true)
    setLoading(false)
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail size={28} className="text-brand-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Revisa tu correo</h1>
          <p className="text-gray-500 mb-2">
            Enviamos un enlace de confirmación a:
          </p>
          <p className="font-semibold text-gray-800 mb-6">{form.email}</p>
          <p className="text-sm text-gray-400 mb-8">
            Haz clic en el enlace del correo para activar tu cuenta y acceder al dashboard.
            Revisa también tu carpeta de spam.
          </p>
          <Link href="/login">
            <Button variant="secondary" size="md">Volver al inicio de sesión</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-3xl">🐾</span>
            <span className="font-bold text-2xl text-brand-700">Huella Bot</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Crea tu cuenta gratis</h1>
          <p className="text-gray-500 mt-1">Tu bot estará listo en 5 minutos</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            <Input
              label="Nombre de tu veterinaria"
              type="text"
              placeholder="Ej: Clínica Veterinaria Amor Animal"
              value={form.clinicName}
              onChange={(e) => update('clinicName', e.target.value)}
              required
            />
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@veterinaria.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Crear cuenta gratis
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Al registrarte aceptas nuestros términos de uso y política de privacidad.
          </p>

          <p className="text-center text-sm text-gray-500 mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-brand-700 font-medium hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
