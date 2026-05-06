import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-brand-900 text-brand-300 py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🐾</span>
              <span className="font-bold text-xl text-white">Huella Bot</span>
            </div>
            <p className="text-sm text-brand-400 max-w-xs">
              La plataforma de chatbot IA diseñada para veterinarias latinoamericanas.
            </p>
          </div>

          <div className="flex gap-16">
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#caracteristicas" className="hover:text-white transition-colors">Características</Link></li>
                <li><Link href="#precios" className="hover:text-white transition-colors">Precios</Link></li>
                <li><Link href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Cuenta</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/signup" className="hover:text-white transition-colors">Registrarse</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-brand-800 pt-6 flex flex-col sm:flex-row justify-between gap-2 text-sm">
          <p>© {new Date().getFullYear()} Huella Bot. Todos los derechos reservados.</p>
          <p>Hecho con ❤️ para veterinarias</p>
        </div>
      </div>
    </footer>
  )
}
