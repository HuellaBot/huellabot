import { NextRequest, NextResponse } from 'next/server'
import { syncCalendarEvents } from '@/lib/google-calendar'

// Google Calendar envía POST aquí cuando cambia cualquier evento
// El clinicId viene en el header X-Goog-Channel-Token que pusimos al registrar
export async function POST(req: NextRequest) {
  const clinicId = req.headers.get('x-goog-channel-token')
  const resourceState = req.headers.get('x-goog-resource-state')

  // 'sync' es solo la confirmación inicial del webhook, no hay eventos que procesar
  if (!clinicId || resourceState === 'sync') {
    return new NextResponse(null, { status: 200 })
  }

  try {
    await syncCalendarEvents(clinicId)
  } catch (err) {
    console.error('[calendar/webhook] sync failed:', err)
    // Devolvemos 200 igual para que Google no reintente infinitamente
  }

  return new NextResponse(null, { status: 200 })
}
