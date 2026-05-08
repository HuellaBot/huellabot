import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOAuthClient, registerWebhook, syncCalendarEvents } from '@/lib/google-calendar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const clinicId = searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (!code || !clinicId) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=google_auth_failed`)
  }

  try {
    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)

    await supabase.from('google_calendar_tokens').upsert({
      clinic_id: clinicId,
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      expiry_date: tokens.expiry_date ?? null,
      calendar_id: 'primary',
      sync_token: '',
    }, { onConflict: 'clinic_id' })

    // Sync inicial + registrar webhook — awaited so serverless doesn't kill them before completion
    await Promise.all([
      syncCalendarEvents(clinicId),
      registerWebhook(clinicId),
    ]).catch(err => console.warn('[google/callback] post-connect sync failed:', err))

    return NextResponse.redirect(`${appUrl}/dashboard/settings?connected=google`)
  } catch (err) {
    console.error('[google/callback]', err)
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=google_token_failed`)
  }
}
