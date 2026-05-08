import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCalendarClient } from '@/lib/google-calendar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { status } = await req.json()
  const { id } = params

  if (!['cancelled', 'completed'].includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select('clinic_id, google_event_id')
    .single()

  if (error || !appointment) {
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
  }

  // Si hay evento de Google Calendar y se está cancelando, eliminarlo
  if (status === 'cancelled' && appointment.google_event_id) {
    try {
      const client = await getCalendarClient(appointment.clinic_id)
      if (client) {
        await client.calendar.events.delete({
          calendarId: client.calendarId,
          eventId: appointment.google_event_id,
        })
      }
    } catch (err) {
      console.warn('[appointments/cancel] Google Calendar delete failed (non-critical):', err)
    }
  }

  return NextResponse.json({ ok: true })
}
