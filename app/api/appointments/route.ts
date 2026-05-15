import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCalendarEvent } from '@/lib/google-calendar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clinicId, patientName, petName, service, appointmentAt, phone, email, durationMinutes, notes } = body

    if (!clinicId || !patientName || !appointmentAt) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const duration = Number(durationMinutes) || 30

    const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(appointmentAt)
    const appointmentDate = new Date(hasTimezone ? appointmentAt : `${appointmentAt}-06:00`)

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        clinic_id:       clinicId,
        patient_name:    patientName,
        patient_phone:   phone || '',
        patient_email:   email || '',
        pet_name:        petName || '',
        service:         service || '',
        appointment_at:  appointmentDate.toISOString(),
        duration_minutes: duration,
        notes:           notes || '',
        status:          'confirmed',
      })
      .select()
      .single()

    if (error || !appointment) {
      return NextResponse.json({ error: 'Error al guardar la cita' }, { status: 500 })
    }

    // Create Google Calendar event with correct duration and client invitation
    let googleEventId: string | null = null
    try {
      googleEventId = await createCalendarEvent(clinicId, {
        patientName, petName, service, appointmentAt: appointmentDate,
        notes, phone, email: email || '', durationMinutes: duration,
      })
      if (googleEventId) {
        await supabase.from('appointments').update({ google_event_id: googleEventId }).eq('id', appointment.id)
      }
    } catch (calErr) {
      console.warn('[appointments] Google Calendar event failed (non-critical):', calErr)
    }

    const dateStr = appointmentDate.toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City',
    })
    const timeStr = appointmentDate.toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City',
    })

    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
      googleEventId,
      message: `Cita confirmada para ${patientName} el ${dateStr} a las ${timeStr} (${duration} min).${email ? ' Se envió invitación a ' + email + '.' : ''}`,
    })
  } catch (err) {
    console.error('[appointments/route]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
