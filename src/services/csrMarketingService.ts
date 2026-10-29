import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export const CSR_MARKETING_SOURCES = [
  'Facebook Ads',
  'Facebook Groups',
  'Instagram',
  'TikTok',
  'Website',
  'Referral',
  'Other',
] as const

export type CsrMarketingSource = (typeof CSR_MARKETING_SOURCES)[number]

export type CsrPatientHit = {
  id: string
  fullName: string
  phoneMasked: string
  preferredBranchId: string | null
  isExisting: boolean
  registeredAt: string | null
}

export type CsrBusySlot = {
  id: string
  branchId: string
  startAt: string
  endAt: string
  status: string
  staffId: string | null
  staffName: string | null
  durationMinutes: number
  isOwn: boolean
  clientLabel: string
  treatmentLabel: string
}

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured')
  }
  return supabase
}

export async function setCsrBranchAssignments(
  userId: string,
  branchIds: string[],
): Promise<void> {
  const client = requireClient()
  const { error } = await client.rpc('set_csr_branch_assignments', {
    p_user_id: userId,
    p_branch_ids: branchIds,
  })
  if (error) throw new Error(error.message)
}

export async function csrLookupPatients(
  phone: string,
  branchId?: string | null,
): Promise<CsrPatientHit[]> {
  const client = requireClient()
  const { data, error } = await client.rpc('csr_lookup_patients', {
    p_phone: phone,
    p_branch_id: branchId || null,
  })
  if (error) throw new Error(error.message)
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    fullName: String(row.full_name ?? ''),
    phoneMasked: String(row.phone_masked ?? '****'),
    preferredBranchId: row.preferred_branch_id ? String(row.preferred_branch_id) : null,
    isExisting: Boolean(row.is_existing),
    registeredAt: row.registered_at ? String(row.registered_at) : null,
  }))
}

export async function csrRegisterLimitedClient(input: {
  fullName: string
  phone: string
  branchId: string
  leadSource?: string | null
  email?: string | null
  address?: string | null
  skinConcern?: string | null
}): Promise<string> {
  const client = requireClient()
  const { data, error } = await client.rpc('csr_register_limited_client', {
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_branch_id: input.branchId,
    p_lead_source: input.leadSource || null,
    p_email: input.email || null,
    p_address: input.address || null,
    p_skin_concern: input.skinConcern || null,
  })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Could not create patient')
  return String(data)
}

/** One-form CSR intake matching field collection: name, phone, address, email, concern, procedure, time, branch. */
export async function csrCreateIntakeBooking(input: {
  fullName: string
  phone: string
  branchId: string
  startAt: string
  address?: string | null
  email?: string | null
  skinConcern?: string | null
  preferredProcedure?: string | null
  durationMinutes?: number
  marketingSource?: string | null
  marketingCampaign?: string | null
}): Promise<string> {
  const client = requireClient()
  const { data, error } = await client.rpc('csr_create_intake_booking', {
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_branch_id: input.branchId,
    p_start_at: input.startAt,
    p_address: input.address || null,
    p_email: input.email || null,
    p_skin_concern: input.skinConcern || null,
    p_preferred_procedure: input.preferredProcedure || null,
    p_duration_minutes: input.durationMinutes ?? 60,
    p_marketing_source: input.marketingSource || 'Other',
    p_marketing_campaign: input.marketingCampaign || null,
  })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Could not create booking')
  return String(data)
}

export async function csrCalendarBusySlots(input: {
  branchId: string
  from: string
  to: string
}): Promise<CsrBusySlot[]> {
  const client = requireClient()
  const { data, error } = await client.rpc('csr_calendar_busy_slots', {
    p_branch_id: input.branchId,
    p_from: input.from,
    p_to: input.to,
  })
  if (error) throw new Error(error.message)
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    branchId: String(row.branch_id),
    startAt: String(row.start_at),
    endAt: String(row.end_at),
    status: String(row.status ?? ''),
    staffId: row.staff_id ? String(row.staff_id) : null,
    staffName: row.staff_name ? String(row.staff_name) : null,
    durationMinutes: Number(row.duration_minutes ?? 0),
    isOwn: Boolean(row.is_own),
    clientLabel: String(row.client_label ?? 'Booked'),
    treatmentLabel: String(row.treatment_label ?? 'Occupied'),
  }))
}

export async function csrCreateBooking(input: {
  branchId: string
  clientId: string
  treatmentId?: string | null
  startAt: string
  endAt: string
  staffId?: string | null
  marketingSource?: string | null
  marketingCampaign?: string | null
  bookingNotes?: string | null
  treatmentName?: string | null
}): Promise<string> {
  const client = requireClient()
  const { data, error } = await client.rpc('csr_create_booking', {
    p_branch_id: input.branchId,
    p_client_id: input.clientId,
    p_treatment_id: input.treatmentId || null,
    p_start_at: input.startAt,
    p_end_at: input.endAt,
    p_staff_id: input.staffId || null,
    p_marketing_source: input.marketingSource || null,
    p_marketing_campaign: input.marketingCampaign || null,
    p_booking_notes: input.bookingNotes || null,
    p_treatment_name: input.treatmentName || null,
  })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Could not create booking')
  return String(data)
}

export async function csrRescheduleBooking(input: {
  appointmentId: string
  startAt: string
  endAt: string
  staffId?: string | null
}): Promise<void> {
  const client = requireClient()
  const { error } = await client.rpc('csr_reschedule_booking', {
    p_appointment_id: input.appointmentId,
    p_start_at: input.startAt,
    p_end_at: input.endAt,
    p_staff_id: input.staffId || null,
  })
  if (error) throw new Error(error.message)
}

/** Catalog treatments for booking (read-only; RLS allows authenticated). */
export async function listCsrTreatments(branchId?: string | null): Promise<
  { id: string; name: string; durationMinutes: number; price: number }[]
> {
  const client = requireClient()
  let q = client
    .from('treatments')
    .select('id, name, duration_minutes, price, status, default_branch_id')
    .eq('status', 'active')
    .order('name')
    .limit(300)
  if (branchId) {
    q = q.or(`default_branch_id.is.null,default_branch_id.eq.${branchId}`)
  }
  const { data, error } = await q
  if (error) {
    // Fallback without default_branch_id if column missing
    const fallback = await client
      .from('treatments')
      .select('id, name, duration_minutes, price, status')
      .eq('status', 'active')
      .order('name')
      .limit(300)
    if (fallback.error) throw new Error(fallback.error.message)
    return ((fallback.data as Record<string, unknown>[] | null) ?? []).map((t) => ({
      id: String(t.id),
      name: String(t.name),
      durationMinutes: Number(t.duration_minutes ?? 60),
      price: Number(t.price ?? 0),
    }))
  }
  return ((data as Record<string, unknown>[] | null) ?? []).map((t) => ({
    id: String(t.id),
    name: String(t.name),
    durationMinutes: Number(t.duration_minutes ?? 60),
    price: Number(t.price ?? 0),
  }))
}

export async function listCsrBranchStaff(branchId: string): Promise<
  { id: string; fullName: string }[]
> {
  const client = requireClient()
  const { data, error } = await client
    .from('staff')
    .select('id, full_name, branch_id, status')
    .eq('branch_id', branchId)
    .eq('status', 'active')
    .order('full_name')
    .limit(100)
  if (error) {
    console.warn('[csr] staff list skipped', error.message)
    return []
  }
  return ((data as Record<string, unknown>[] | null) ?? []).map((s) => ({
    id: String(s.id),
    fullName: String(s.full_name ?? 'Staff'),
  }))
}
