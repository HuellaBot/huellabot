import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOAuthClient } from '@/lib/google-calendar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Vercel cron — runs daily. Protected by CRON_SECRET.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tokens, error } = await supabase
    .from('google_calendar_tokens')
    .select('clinic_id, refresh_token, access_token, expiry_date')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = await Promise.allSettled(
    (tokens ?? []).map(async (row) => {
      const oauth2Client = getOAuthClient()
      oauth2Client.setCredentials({
        refresh_token: row.refresh_token,
        access_token: row.access_token,
        expiry_date: row.expiry_date,
      })

      const { credentials } = await oauth2Client.refreshAccessToken()

      await supabase.from('google_calendar_tokens').update({
        access_token: credentials.access_token ?? row.access_token,
        expiry_date: credentials.expiry_date ?? row.expiry_date,
      }).eq('clinic_id', row.clinic_id)

      return row.clinic_id
    })
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed    = results.filter(r => r.status === 'rejected').length

  console.log(`[cron/refresh-calendar-tokens] ${succeeded} OK, ${failed} failed`)
  return NextResponse.json({ succeeded, failed })
}
