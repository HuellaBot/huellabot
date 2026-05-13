import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function assignNumberToClinic(clinicId: string): Promise<string | null> {
  // Check if clinic already has a pool number
  const { data: existing } = await supabase
    .from('phone_number_pool')
    .select('phone_number')
    .eq('clinic_id', clinicId)
    .maybeSingle()

  if (existing) return existing.phone_number

  // Find and claim an available number
  const { data: available } = await supabase
    .from('phone_number_pool')
    .select('id, phone_number')
    .eq('is_active', true)
    .eq('is_assigned', false)
    .is('clinic_id', null)
    .limit(1)
    .maybeSingle()

  if (!available) return null

  const { data: claimed } = await supabase
    .from('phone_number_pool')
    .update({ is_assigned: true, clinic_id: clinicId, assigned_at: new Date().toISOString() })
    .eq('id', available.id)
    .eq('is_assigned', false) // optimistic lock: only succeed if still unassigned
    .select('phone_number')
    .maybeSingle()

  if (!claimed) return null

  const phone = claimed.phone_number

  // Create whatsapp_configs entry with our Twilio account
  await supabase
    .from('whatsapp_configs')
    .upsert({
      clinic_id: clinicId,
      twilio_account_sid: process.env.TWILIO_ACCOUNT_SID ?? '',
      twilio_auth_token: '',
      twilio_phone_number: phone,
      is_active: true,
    }, { onConflict: 'clinic_id' })

  return phone
}

export async function getClinicPoolNumber(clinicId: string): Promise<string | null> {
  const { data } = await supabase
    .from('phone_number_pool')
    .select('phone_number')
    .eq('clinic_id', clinicId)
    .maybeSingle()
  return data?.phone_number ?? null
}
