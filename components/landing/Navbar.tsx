'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🐾</span>
          <span className="font-bold text-xl text-brand-700">Huella Bot</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="#caracteristicas" className="text-sm text-gray-600 hover:text-brand-700 transition-colors">
            Características
          </Link>
          <Link href="#precios" className="text-sm text-gray-600 hover:text-brand-700 transition-colors">
            Precios
          </Link>
          <Link href="#como-funciona" className="text-sm text-gray-600 hover:text-brand-700 transition-colors">
            Cómo funciona
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Iniciar sesión</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Empezar gratis</Button>
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
          <Link href="#caracteristicas" className="text-sm text-gray-700">Características</Link>
          <Link href="#precios" className="text-sm text-gray-700">Precios</Link>
          <Link href="#como-funciona" className="text-sm text-gray-700">Cómo funciona</Link>
          <Link href="/login"><Button variant="secondary" size="sm" className="w-full">Iniciar sesión</Button></Link>
          <Link href="/signup"><Button size="sm" className="w-full">Empezar gratis</Button></Link>
        </div>
      )}
    </header>
  )
}
