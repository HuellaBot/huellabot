import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const plans = [
  {
    name: 'Starter',
    price: 'Gratis',
    period: '',
    desc: 'Para probar Huella Bot',
    features: [
      '100 conversaciones/mes',
      '1 clínica',
      'Widget embebible',
      'Soporte por email',
    ],
    cta: 'Empezar gratis',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mes',
    desc: 'Para clínicas en crecimiento',
    features: [
      'Conversaciones ilimitadas',
      '1 clínica',
      'Widget personalizado',
      'Analíticas avanzadas',
      'Soporte prioritario',
      'Personalización de colores',
    ],
    cta: 'Comenzar 14 días gratis',
    href: '/signup?plan=pro',
    highlight: true,
  },
  {
    name: 'Clínica+',
    price: '$79',
    period: '/mes',
    desc: 'Para cadenas veterinarias',
    features: [
      'Todo de Pro',
      'Hasta 5 clínicas',
      'API access',
      'Onboarding personalizado',
      'SLA garantizado',
    ],
    cta: 'Contactar ventas',
    href: '/signup?plan=clinica',
    highlight: false,
  },
]

export function Pricing() {
  return (
    <section id="precios" className="py-24 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Precios simples y transparentes</h2>
          <p className="text-gray-500 text-lg">Sin contratos. Cancela cuando quieras.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 ${
                plan.highlight
                  ? 'bg-brand-700 text-white shadow-2xl scale-105'
                  : 'bg-white border border-gray-100 shadow-sm'
              }`}
            >
              <div className="mb-6">
                <p className={`text-sm font-medium mb-1 ${plan.highlight ? 'text-brand-200' : 'text-brand-600'}`}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  <span className={plan.highlight ? 'text-brand-200' : 'text-gray-400'}>{plan.period}</span>
                </div>
                <p className={`text-sm mt-1 ${plan.highlight ? 'text-brand-200' : 'text-gray-500'}`}>{plan.desc}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={16} className={plan.highlight ? 'text-brand-300' : 'text-brand-600'} />
                    <span className={plan.highlight ? 'text-brand-100' : 'text-gray-600'}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link href={plan.href}>
                <Button
                  variant={plan.highlight ? 'secondary' : 'primary'}
                  size="md"
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
