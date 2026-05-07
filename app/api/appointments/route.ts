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
    const { clinicId, patientName, petName, service, appointmentAt, phone, notes } = body

    if (!clinicId || !patientName || !appointmentAt) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const appointmentDate = new Date(appointmentAt)

    // Save to Supabase
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        clinic_id: clinicId,
        patient_name: patientName,
        patient_phone: phone || '',
        pet_name: petName || '',
        service: service || '',
        appointment_at: appointmentDate.toISOString(),
        notes: notes || '',
        status: 'confirmed',
      })
      .select()
      .single()

    if (error || !appointment) {
      return NextResponse.json({ error: 'Error al guardar la cita' }, { status: 500 })
    }

    // Try to create Google Calendar event (non-blocking)
    let googleEventId: string | null = null
    try {
      googleEventId = await createCalendarEvent(clinicId, {
        patientName, petName, service, appointmentAt: appointmentDate, notes, phone,
      })
      if (googleEventId) {
        await supabase.from('appointments').update({ google_event_id: googleEventId }).eq('id', appointment.id)
      }
    } catch (calErr) {
      console.warn('[appointments] Google Calendar event failed (non-critical):', calErr)
    }

    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
      googleEventId,
      message: `Cita confirmada para ${patientName} el ${appointmentDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${appointmentDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
    })
  } catch (err) {
    console.error('[appointments/route]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
