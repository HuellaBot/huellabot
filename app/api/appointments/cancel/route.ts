import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteCalendarEvent } from '@/lib/google-calendar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { phone, clinicId } = await req.json()

    if (!phone || !clinicId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Find the next confirmed appointment for this phone number
    const now = new Date().toISOString()
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('patient_phone', phone)
      .eq('status', 'confirmed')
      .gte('appointment_at', now)
      .order('appointment_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[cancel] DB error:', error)
      return NextResponse.json({ message: 'Error al buscar tu cita. Por favor llama a la clínica.' }, { status: 500 })
    }

    if (!appointment) {
      return NextResponse.json({ message: 'No encontré ninguna cita próxima confirmada para tu número.' })
    }

    // Enforce 12-hour minimum notice
    const appointmentTime = new Date(appointment.appointment_at)
    const hoursUntil = (appointmentTime.getTime() - Date.now()) / (1000 * 60 * 60)

    if (hoursUntil < 12) {
      const timeStr = appointmentTime.toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City',
      })
      const dateStr = appointmentTime.toLocaleDateString('es-MX', {
        weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City',
      })
      return NextResponse.json({
        message: `Lo siento, tu cita del ${dateStr} a las ${timeStr} es en menos de 12 horas y no se puede cancelar por este medio. Por favor llama directamente a la clínica.`,
      })
    }

    // Cancel the appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointment.id)

    if (updateError) {
      console.error('[cancel] Update error:', updateError)
      return NextResponse.json({ message: 'Error al cancelar la cita. Por favor llama a la clínica.' }, { status: 500 })
    }

    // Delete Google Calendar event if it exists
    if (appointment.google_event_id) {
      try {
        await deleteCalendarEvent(clinicId, appointment.google_event_id)
      } catch (calErr) {
        console.warn('[cancel] Could not delete calendar event (non-critical):', calErr)
      }
    }

    const dateStr = appointmentTime.toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City',
    })
    const timeStr = appointmentTime.toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City',
    })

    return NextResponse.json({
      success: true,
      message: `Tu cita del ${dateStr} a las ${timeStr} (${appointment.service}) ha sido cancelada exitosamente. ¡Esperamos verte pronto!`,
    })
  } catch (err) {
    console.error('[appointments/cancel]', err)
    return NextResponse.json({ message: 'Error interno. Por favor llama a la clínica.' }, { status: 500 })
  }
}
