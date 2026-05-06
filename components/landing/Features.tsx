import { Bot, Clock, Code2, BarChart3, Shield, Zap } from 'lucide-react'

const features = [
  {
    icon: Bot,
    title: 'IA con tu información',
    desc: 'El bot conoce tus servicios, precios, horarios y políticas. Responde como si fuera parte de tu equipo.',
  },
  {
    icon: Clock,
    title: 'Disponible 24/7',
    desc: 'Tus clientes reciben respuestas inmediatas a cualquier hora, incluso fines de semana y feriados.',
  },
  {
    icon: Code2,
    title: 'Widget embebible',
    desc: 'Un simple código que pegas en tu sitio web. Compatible con WordPress, Wix, Squarespace y cualquier HTML.',
  },
  {
    icon: BarChart3,
    title: 'Analíticas de conversaciones',
    desc: 'Ve qué preguntan más tus clientes y optimiza tu servicio con datos reales.',
  },
  {
    icon: Shield,
    title: 'Seguro y privado',
    desc: 'Los datos de tus clientes nunca se comparten. Cada clínica tiene su entorno aislado.',
  },
  {
    icon: Zap,
    title: 'Configuración en minutos',
    desc: 'Sin código, sin técnicos. Rellenas un formulario y tu bot está listo para atender.',
  },
]

export function Features() {
  return (
    <section id="caracteristicas" className="py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Todo lo que tu veterinaria necesita
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Diseñado específicamente para clínicas veterinarias. No un chatbot genérico — uno que entiende tu negocio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="group p-6 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all duration-300 bg-white">
              <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-700 transition-colors">
                <f.icon size={22} className="text-brand-700 group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
