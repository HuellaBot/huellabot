const steps = [
  {
    step: '01',
    title: 'Crea tu cuenta',
    desc: 'Regístrate gratis con tu correo. Sin tarjeta de crédito requerida.',
  },
  {
    step: '02',
    title: 'Configura tu bot',
    desc: 'Ingresa los datos de tu clínica: servicios, precios, horarios y el tono de comunicación.',
  },
  {
    step: '03',
    title: 'Obtén tu widget',
    desc: 'Copia un fragmento de código y pégalo en tu sitio web. ¡Listo!',
  },
  {
    step: '04',
    title: 'Tus clientes chatean',
    desc: 'El bot atiende consultas automáticamente, las 24 horas del día.',
  },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 px-4 sm:px-6 bg-brand-800">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">¿Cómo funciona?</h2>
          <p className="text-brand-200 text-lg">En 4 pasos simples tu clínica está automatizada</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div key={s.step} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(50%+32px)] right-[-calc(50%-32px)] h-px bg-brand-600" />
              )}
              <div className="w-16 h-16 bg-brand-600 border-2 border-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-brand-100 font-bold text-lg">{s.step}</span>
              </div>
              <h3 className="text-white font-semibold mb-2">{s.title}</h3>
              <p className="text-brand-300 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
