import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expiry_date,
  })

  // Auto-refresh token if expired and save new one
  oauth2Client.on('tokens', async (tokens) => {
    await supabaseAdmin.from('google_calendar_tokens').update({
      access_token: tokens.access_token ?? tokenRow.access_token,
      expiry_date: tokens.expiry_date ?? tokenRow.expiry_date,
    }).eq('clinic_id', clinicId)
  })

  return { calendar: google.calendar({ version: 'v3', auth: oauth2Client }), calendarId: tokenRow.calendar_id || 'primary' }
}

export async function getAvailableSlots(
  clinicId: string,
  dateStr: string // YYYY-MM-DD
): Promise<string[]> {
  const client = await getCalendarClient(clinicId)
  if (!client) return generateDefaultSlots()

  const { calendar, calendarId } = client
  // Mexico City is UTC-6 permanently (abolished DST in 2023)
  const dayStart = new Date(`${dateStr}T08:00:00-06:00`)
  const dayEnd = new Date(`${dateStr}T18:00:00-06:00`)

  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      items: [{ id: calendarId }],
    },
  })

  const busy = data.calendars?.[calendarId]?.busy ?? []
  const allSlots = generateSlotsForDay(dayStart, dayEnd)

  return allSlots.filter(slot => {
    const slotStart = new Date(slot)
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
    return !busy.some(b => {
      const bStart = new Date(b.start!)
      const bEnd = new Date(b.end!)
      return slotStart < bEnd && slotEnd > bStart
    })
  }).map(slot => {
    const d = new Date(slot)
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City' })
  })
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
  const client = await getCalendarClient(clinicId)
  if (!client) return null

  const { calendar, calendarId } = client
  const endTime = new Date(appointment.appointmentAt.getTime() + 30 * 60 * 1000)

  const { data } = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `🐾 ${appointment.petName} — ${appointment.service}`,
      description: `Paciente: ${appointment.patientName}\nMascota: ${appointment.petName}\nServicio: ${appointment.service}\nTeléfono: ${appointment.phone || 'No proporcionado'}\n${appointment.notes ? `\nNotas: ${appointment.notes}` : ''}`,
      start: { dateTime: appointment.appointmentAt.toISOString(), timeZone: 'America/Mexico_City' },
      end: { dateTime: endTime.toISOString(), timeZone: 'America/Mexico_City' },
    },
  })

  return data.id ?? null
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

function generateDefaultSlots(): string[] {
  return ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
          '12:00 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM']
}

// ── Sincronización bidireccional ─────────────────────────────────────────────

export async function registerWebhook(clinicId: string) {
  const client = await getCalendarClient(clinicId)
  if (!client) return

  const { calendar, calendarId } = client
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const channelId = `huellabot-${clinicId}-${Date.now()}`

  try {
    const { data } = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: `${appUrl}/api/calendar/webhook`,
        token: clinicId,
        // Google Calendar webhooks duran máx 7 días — renovamos en cada sync
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
      // Sync incremental — solo cambios desde la última vez
      const res = await calendar.events.list({ calendarId, syncToken: tokenRow.sync_token, singleEvents: true })
      events = res.data
    } else {
      // Sync inicial — últimos 30 días y próximos 60
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
      const res = await calendar.events.list({ calendarId, timeMin, timeMax, singleEvents: true, maxResults: 250 })
      events = res.data
    }
  } catch (err: unknown) {
    // 410 Gone = syncToken expirado, hacer full sync
    if ((err as { code?: number }).code === 410) {
      await supabaseAdmin.from('google_calendar_tokens').update({ sync_token: '' }).eq('clinic_id', clinicId)
      return syncCalendarEvents(clinicId)
    }
    throw err
  }

  // Guardar el nuevo syncToken para la próxima vez
  if (events.nextSyncToken) {
    await supabaseAdmin.from('google_calendar_tokens')
      .update({ sync_token: events.nextSyncToken })
      .eq('clinic_id', clinicId)
  }

  const items = events.items ?? []

  for (const event of items) {
    if (!event.start?.dateTime && !event.start?.date) continue

    const appointmentAt = new Date(event.start.dateTime ?? event.start.date ?? '')
    const googleEventId = event.id!
    const isCancelled = event.status === 'cancelled'

    // Si el evento fue cancelado en Google Cal, cancelar en Supabase también
    if (isCancelled) {
      await supabaseAdmin.from('appointments')
        .update({ status: 'cancelled' })
        .eq('clinic_id', clinicId)
        .eq('google_event_id', googleEventId)
      continue
    }

    // Upsert: si el evento ya existe en appointments (por google_event_id), actualizar
    // Si es nuevo (creado manualmente en Google Cal), insertarlo
    const existing = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('google_event_id', googleEventId)
      .maybeSingle()

    const summary = event.summary ?? ''
    const description = event.description ?? ''

    // Parsear datos del evento — intentamos extraer nombre/mascota de la descripción
    const patientMatch = description.match(/Paciente:\s*(.+)/i)
    const petMatch = description.match(/Mascota:\s*(.+)/i)
    const serviceMatch = description.match(/Servicio:\s*(.+)/i)
    const phoneMatch = description.match(/Teléfono:\s*(.+)/i)

    const appointmentData = {
      clinic_id: clinicId,
      patient_name: patientMatch?.[1]?.trim() || summary,
      pet_name: petMatch?.[1]?.trim() || '',
      service: serviceMatch?.[1]?.trim() || summary,
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
