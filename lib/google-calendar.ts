import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const SERVICE_ACCOUNT_EMAIL = 'huellabot-calendar@huella-bot.iam.gserviceaccount.com'

function getServiceAccountAuth() {
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!keyBase64) return null
  try {
    const key = JSON.parse(Buffer.from(keyBase64, 'base64').toString())
    return new google.auth.GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })
  } catch {
    return null
  }
}

// OAuth client kept for legacy / migration flows
export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback'
  )
}

export function getAuthUrl(clinicId: string) {
  const oauth2Client = getOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: clinicId,
  })
}

export async function getCalendarClient(clinicId: string) {
  const { data: tokenRow } = await supabaseAdmin
    .from('google_calendar_tokens')
    .select('*')
    .eq('clinic_id', clinicId)
    .single()

  if (!tokenRow) return null

  const calendarId = tokenRow.calendar_id || 'primary'

  // Prefer service account — never expires
  const serviceAuth = getServiceAccountAuth()
  if (serviceAuth) {
    const client = await serviceAuth.getClient()
    const calendar = google.calendar({ version: 'v3', auth: client as Parameters<typeof google.calendar>[0]['auth'] })
    return { calendar, calendarId }
  }

  // Fallback: OAuth tokens (legacy)
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expiry_date,
  })

  oauth2Client.on('tokens', async (tokens) => {
    await supabaseAdmin.from('google_calendar_tokens').update({
      access_token: tokens.access_token ?? tokenRow.access_token,
      expiry_date: tokens.expiry_date ?? tokenRow.expiry_date,
    }).eq('clinic_id', clinicId)
  })

  return { calendar: google.calendar({ version: 'v3', auth: oauth2Client }), calendarId }
}

const BUFFER_MINUTES = 15 // tiempo entre citas

export async function getAvailableSlots(
  clinicId: string,
  dateStr: string,
  durationMinutes = 30
): Promise<string[]> {
  try {
    const client = await getCalendarClient(clinicId)
    if (!client) return generateDefaultSlots(durationMinutes)

    const { calendar, calendarId } = client
    const dayStart = new Date(`${dateStr}T08:00:00-06:00`)
    const dayEnd   = new Date(`${dateStr}T18:00:00-06:00`)

    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        items: [{ id: calendarId }],
      },
    })

    const busy = data.calendars?.[calendarId]?.busy ?? []

    // Generate candidate start times every 30 min
    const candidates = generateSlotsForDay(dayStart, dayEnd)

    return candidates.filter(slot => {
      const slotStart = new Date(slot)
      const slotEnd   = new Date(slotStart.getTime() + durationMinutes * 60 * 1000)
      // Don't offer slots that would run past end of day
      if (slotEnd > dayEnd) return false
      // Check no busy period overlaps with slot + buffer
      const slotEndWithBuffer = new Date(slotEnd.getTime() + BUFFER_MINUTES * 60 * 1000)
      return !busy.some(b => {
        const bStart = new Date(b.start!)
        const bEnd   = new Date(b.end!)
        return slotStart < bEnd && slotEndWithBuffer > bStart
      })
    }).map(slot =>
      new Date(slot).toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City',
      })
    )
  } catch (err) {
    console.error('[getAvailableSlots] error:', err)
    return generateDefaultSlots(durationMinutes)
  }
}

export async function createCalendarEvent(
  clinicId: string,
  appointment: {
    patientName: string
    petName: string
    service: string
    appointmentAt: Date
    notes?: string
    phone?: string
  }
): Promise<string | null> {
  try {
    const client = await getCalendarClient(clinicId)
    if (!client) return null

    const { calendar, calendarId } = client
    const endTime = new Date(appointment.appointmentAt.getTime() + 30 * 60 * 1000)

    const { data } = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `🐾 ${appointment.petName} — ${appointment.service}`,
        description: `Paciente: ${appointment.patientName}\nMascota: ${appointment.petName}\nServicio: ${appointment.service}\nTeléfono: ${appointment.phone || 'No proporcionado'}${appointment.notes ? `\n\nNotas: ${appointment.notes}` : ''}`,
        start: { dateTime: appointment.appointmentAt.toISOString(), timeZone: 'America/Mexico_City' },
        end:   { dateTime: endTime.toISOString(), timeZone: 'America/Mexico_City' },
      },
    })

    return data.id ?? null
  } catch (err) {
    console.error('[createCalendarEvent] error:', err)
    return null
  }
}

function generateSlotsForDay(start: Date, end: Date): string[] {
  const slots: string[] = []
  const current = new Date(start)
  while (current < end) {
    slots.push(current.toISOString())
    current.setMinutes(current.getMinutes() + 30)
  }
  return slots
}

function generateDefaultSlots(durationMinutes = 30): string[] {
  // Default slots spaced by duration + buffer
  const step = durationMinutes + BUFFER_MINUTES
  const base  = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
                  '12:00 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM']
  if (step <= 30) return base
  // For longer services return fewer slots
  return ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM']
}

export async function syncCalendarEvents(clinicId: string) {
  const client = await getCalendarClient(clinicId)
  if (!client) return

  const { calendar, calendarId } = client

  const { data: tokenRow } = await supabaseAdmin
    .from('google_calendar_tokens')
    .select('sync_token')
    .eq('clinic_id', clinicId)
    .single()

  let events
  try {
    if (tokenRow?.sync_token) {
      const res = await calendar.events.list({ calendarId, syncToken: tokenRow.sync_token, singleEvents: true })
      events = res.data
    } else {
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
      const res = await calendar.events.list({ calendarId, timeMin, timeMax, singleEvents: true, maxResults: 250 })
      events = res.data
    }
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 410) {
      await supabaseAdmin.from('google_calendar_tokens').update({ sync_token: '' }).eq('clinic_id', clinicId)
      return syncCalendarEvents(clinicId)
    }
    throw err
  }

  if (events.nextSyncToken) {
    await supabaseAdmin.from('google_calendar_tokens')
      .update({ sync_token: events.nextSyncToken })
      .eq('clinic_id', clinicId)
  }

  for (const event of events.items ?? []) {
    if (!event.start?.dateTime && !event.start?.date) continue

    const googleEventId = event.id!
    const isCancelled   = event.status === 'cancelled'

    if (isCancelled) {
      await supabaseAdmin.from('appointments')
        .update({ status: 'cancelled' })
        .eq('clinic_id', clinicId)
        .eq('google_event_id', googleEventId)
      continue
    }

    const existing = await supabaseAdmin
      .from('appointments').select('id')
      .eq('clinic_id', clinicId).eq('google_event_id', googleEventId).maybeSingle()

    const description  = event.description ?? ''
    const patientMatch = description.match(/Paciente:\s*(.+)/i)
    const petMatch     = description.match(/Mascota:\s*(.+)/i)
    const serviceMatch = description.match(/Servicio:\s*(.+)/i)
    const phoneMatch   = description.match(/Teléfono:\s*(.+)/i)

    const patientName = patientMatch?.[1]?.trim() || ''
    const petName     = petMatch?.[1]?.trim() || ''
    if (!patientName && !petName && !existing?.data) continue

    const appointmentAt = new Date(event.start.dateTime ?? event.start.date ?? '')

    const appointmentData = {
      clinic_id:     clinicId,
      patient_name:  patientName || event.summary || '',
      pet_name:      petName,
      service:       serviceMatch?.[1]?.trim() || event.summary || '',
      patient_phone: phoneMatch?.[1]?.trim() || '',
      appointment_at: appointmentAt.toISOString(),
      google_event_id: googleEventId,
      status: 'confirmed' as const,
      notes: description,
    }

    if (existing?.data) {
      await supabaseAdmin.from('appointments').update({
        appointment_at: appointmentData.appointment_at,
        status: appointmentData.status,
      }).eq('id', existing.data.id)
    } else {
      await supabaseAdmin.from('appointments').insert(appointmentData)
    }
  }
}

export async function registerWebhook(clinicId: string) {
  const client = await getCalendarClient(clinicId)
  if (!client) return

  const { calendar, calendarId } = client
  const channelId = `huellabot-${clinicId}-${Date.now()}`

  try {
    const { data } = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/webhook`,
        token: clinicId,
        expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    await supabaseAdmin.from('google_calendar_tokens').update({
      channel_id: data.id ?? channelId,
      channel_expiry: Number(data.expiration ?? 0),
    }).eq('clinic_id', clinicId)
  } catch (err) {
    console.warn('[registerWebhook] failed (non-critical):', err)
  }
}
