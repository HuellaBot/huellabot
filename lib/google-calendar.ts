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
  const dayStart = new Date(`${dateStr}T08:00:00`)
  const dayEnd = new Date(`${dateStr}T18:00:00`)

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
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
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
