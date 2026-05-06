import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ArrowRight, Star } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative pt-32 pb-24 px-4 sm:px-6 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-white -z-10" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-100/40 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/4" />

      <div className="max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
          <Star size={14} fill="currentColor" />
          La IA diseñada para veterinarias latinoamericanas
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.1] mb-6">
          Tu veterinaria, <br />
          <span className="text-gradient">atendiendo 24/7</span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Crea un chatbot inteligente para tu clínica en minutos. Responde preguntas,
          informa precios y agenda citas — sin que tú estés presente.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="group">
              Crear mi chatbot gratis
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="#como-funciona">
            <Button variant="secondary" size="lg">
              Ver cómo funciona
            </Button>
          </Link>
        </div>

        <p className="text-sm text-gray-400 mt-6">Sin tarjeta de crédito · Listo en 5 minutos</p>

        {/* Mock chat preview */}
        <div className="mt-16 max-w-sm mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-left">
          <div className="bg-brand-700 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white text-sm">🐾</div>
            <div>
              <p className="text-white text-sm font-semibold">Clínica Veterinaria Amor Animal</p>
              <p className="text-brand-200 text-xs">Asistente Virtual • En línea</p>
            </div>
          </div>
          <div className="p-4 space-y-3 bg-gray-50">
            <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-700 shadow-sm max-w-[80%]">
              ¡Hola! ¿Cuánto cuesta la consulta general?
            </div>
            <div className="bg-brand-700 rounded-2xl rounded-tr-sm px-3 py-2 text-sm text-white shadow-sm max-w-[85%] ml-auto">
              La consulta general tiene un costo de $350. ¿Te gustaría agendar una cita?
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-700 shadow-sm max-w-[80%]">
              Sí, para mañana por favor 🐕
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
