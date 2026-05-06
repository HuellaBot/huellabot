import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Huella Bot — Chatbot IA para Veterinarias',
  description: 'Automatiza la atención al cliente de tu veterinaria con inteligencia artificial. Configura tu propio chatbot en minutos.',
  keywords: 'chatbot veterinaria, IA veterinaria, atención automatizada, Huella Bot',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
