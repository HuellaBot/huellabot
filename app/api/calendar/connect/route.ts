import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as serviceClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const supabaseAdmin = serviceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clinic } = await supabase
    .from('clinics').select('id').eq('user_id', user.id).maybeSingle()
  if (!clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })

  const { calendarId } = await req.json()
  if (!calendarId) return NextResponse.json({ error: 'calendarId requerido' }, { status: 400 })

  // Verify service account has WRITE access by creating and deleting a test event
  try {
    const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!
    const key = JSON.parse(Buffer.from(keyBase64, 'base64').toString())
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })
    const client = await auth.getClient()
    const calendar = google.calendar({ version: 'v3', auth: client as Parameters<typeof google.calendar>[0]['auth'] })

    const testStart = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    const testEnd   = new Date(testStart.getTime() + 60 * 1000)

    const { data: testEvent } = await calendar.events.insert({
      calendarId,
      sendUpdates: 'none',
      requestBody: {
        summary: '[Huella Bot] Verificación de acceso — puedes eliminar este evento',
        start: { dateTime: testStart.toISOString() },
        end:   { dateTime: testEnd.toISOString() },
      },
    })

    // Clean up test event immediately
    if (testEvent.id) {
      await calendar.events.delete({ calendarId, eventId: testEvent.id, sendUpdates: 'none' }).catch(() => {})
    }
  } catch (err: unknown) {
    const gErr = err as { code?: number; message?: string }
    console.error('[calendar/connect] write test failed:', gErr?.code, gErr?.message)
    const hint = gErr?.code === 403
      ? 'Asegúrate de compartir el calendario con permiso "Hacer cambios en los eventos" (no solo lectura).'
      : 'No se pudo verificar el acceso.'
    return NextResponse.json(
      { error: `No tenemos acceso de escritura a ese calendario. ${hint}` },
      { status: 403 }
    )
  }

  // Save to google_calendar_tokens (upsert)
  await supabaseAdmin
    .from('google_calendar_tokens')
    .upsert({
      clinic_id:    clinic.id,
      calendar_id:  calendarId,
      access_token: '',
      refresh_token: '',
      expiry_date:  0,
    }, { onConflict: 'clinic_id' })

  return NextResponse.json({ ok: true })
}
