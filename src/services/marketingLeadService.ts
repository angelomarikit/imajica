import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { getBranches } from '@/services/branchService'

const KEY = 'imajica_marketing_leads'
const CHANGE = 'imajica:marketing-leads-changed'

export type MarketingLeadSource =
  | 'facebook_ads'
  | 'facebook_groups'
  | 'instagram'
  | 'tiktok'
  | 'website'
  | 'walk_in'
  | 'referral'
  | 'other'

export type MarketingFunnelStage = 'message' | 'book' | 'show_up' | 'buy' | 'lost'

export type MarketingHandoffStatus = 'sent' | 'seen' | 'booked' | 'no_answer' | 'declined'

export const FUNNEL_STAGE_ORDER: MarketingFunnelStage[] = [
  'message',
  'book',
  'show_up',
  'buy',
]

export const FUNNEL_STAGE_LABELS: Record<MarketingFunnelStage, string> = {
  message: 'Message',
  book: 'Book',
  show_up: 'Show up',
  buy: 'Buy',
  lost: 'Lost',
}

export const LEAD_SOURCE_LABELS: Record<MarketingLeadSource, string> = {
  facebook_ads: 'Facebook Ads',
  facebook_groups: 'Facebook Groups',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  website: 'Website',
  walk_in: 'Walk-in',
  referral: 'Referral',
  other: 'Other',
}

export const SOCIAL_SOURCES: MarketingLeadSource[] = [
  'facebook_ads',
  'facebook_groups',
  'instagram',
  'tiktok',
]

export const HANDOFF_STATUS_LABELS: Record<MarketingHandoffStatus, string> = {
  sent: 'New',
  seen: 'Seen',
  booked: 'Booked',
  no_answer: 'No answer',
  declined: 'Declined',
}

/** Unread for clinic = not yet opened / resolved */
export const HANDOFF_UNREAD_STATUSES: MarketingHandoffStatus[] = ['sent']

export type MarketingLead = {
  id: string
  fullName: string
  phone: string
  email: string
  branchId: string | null
  branchName: string
  source: MarketingLeadSource
  funnelStage: MarketingFunnelStage
  notes: string
  saleAmount: number | null
  clientId: string | null
  appointmentId: string | null
  handoffStatus: MarketingHandoffStatus | null
  handoffNote: string
  handoffSentAt: string | null
  handoffSeenAt: string | null
  handoffResolvedAt: string | null
  createdAt: string
  updatedAt: string
}

type Row = {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  branch_id: string | null
  source: string
  funnel_stage: string
  notes: string | null
  sale_amount: number | null
  client_id?: string | null
  appointment_id?: string | null
  handoff_status?: string | null
  handoff_note?: string | null
  handoff_sent_at?: string | null
  handoff_seen_at?: string | null
  handoff_resolved_at?: string | null
  created_at: string
  updated_at: string
}

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

function branchName(id: string | null): string {
  if (!id) return 'All Branches'
  return getBranches().find((b) => b.id === id)?.name ?? '—'
}

function mapRow(row: Row): MarketingLead {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone ?? '',
    email: row.email ?? '',
    branchId: row.branch_id,
    branchName: branchName(row.branch_id),
    source: row.source as MarketingLeadSource,
    funnelStage: row.funnel_stage as MarketingFunnelStage,
    notes: row.notes ?? '',
    saleAmount: row.sale_amount != null ? Number(row.sale_amount) : null,
    clientId: row.client_id ?? null,
    appointmentId: row.appointment_id ?? null,
    handoffStatus: (row.handoff_status as MarketingHandoffStatus | null) ?? null,
    handoffNote: row.handoff_note ?? '',
    handoffSentAt: row.handoff_sent_at ?? null,
    handoffSeenAt: row.handoff_seen_at ?? null,
    handoffResolvedAt: row.handoff_resolved_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function emptyHandoff(): Pick<
  MarketingLead,
  | 'clientId'
  | 'appointmentId'
  | 'handoffStatus'
  | 'handoffNote'
  | 'handoffSentAt'
  | 'handoffSeenAt'
  | 'handoffResolvedAt'
> {
  return {
    clientId: null,
    appointmentId: null,
    handoffStatus: null,
    handoffNote: '',
    handoffSentAt: null,
    handoffSeenAt: null,
    handoffResolvedAt: null,
  }
}

function readLocal(): MarketingLead[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seedLeads()
    const parsed = JSON.parse(raw) as MarketingLead[]
    if (!Array.isArray(parsed) || !parsed.length) return seedLeads()
    return parsed.map((r) => ({
      ...emptyHandoff(),
      ...r,
      clientId: r.clientId ?? null,
      appointmentId: r.appointmentId ?? null,
      handoffStatus: r.handoffStatus ?? null,
      handoffNote: r.handoffNote ?? '',
    }))
  } catch {
    return seedLeads()
  }
}

function writeLocal(rows: MarketingLead[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
  emit()
}

function seedLeads(): MarketingLead[] {
  const branches = getBranches().filter((b) => b.status === 'active' && b.branchType !== 'warehouse')
  const b0 = branches[0]?.id ?? null
  const b1 = branches[1]?.id ?? b0
  const now = new Date().toISOString()
  const rows: MarketingLead[] = [
    {
      id: 'mlead-seed-1',
      fullName: 'Maria Clara',
      phone: '09171234567',
      email: '',
      branchId: b0,
      branchName: branchName(b0),
      source: 'facebook_ads',
      funnelStage: 'message',
      notes: 'Asked about facial promo',
      saleAmount: null,
      ...emptyHandoff(),
      handoffStatus: 'sent',
      handoffNote: 'Prefers Saturday afternoon. Please book consult.',
      handoffSentAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mlead-seed-2',
      fullName: 'Jen Santos',
      phone: '09189876543',
      email: 'jen@example.com',
      branchId: b1,
      branchName: branchName(b1),
      source: 'instagram',
      funnelStage: 'book',
      notes: 'Booked Saturday consult',
      saleAmount: null,
      ...emptyHandoff(),
      handoffStatus: 'sent',
      handoffNote: 'Wants HydraFacial if available',
      handoffSentAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mlead-seed-3',
      fullName: 'Ana Reyes',
      phone: '09201112222',
      email: '',
      branchId: b0,
      branchName: branchName(b0),
      source: 'tiktok',
      funnelStage: 'show_up',
      notes: '',
      saleAmount: null,
      ...emptyHandoff(),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mlead-seed-4',
      fullName: 'Liza Cruz',
      phone: '09333334444',
      email: '',
      branchId: b0,
      branchName: branchName(b0),
      source: 'facebook_groups',
      funnelStage: 'buy',
      notes: 'Package + product',
      saleAmount: 15000,
      ...emptyHandoff(),
      createdAt: now,
      updatedAt: now,
    },
  ]
  localStorage.setItem(KEY, JSON.stringify(rows))
  return rows
}

export function subscribeMarketingLeads(listener: () => void) {
  window.addEventListener(CHANGE, listener)
  return () => window.removeEventListener(CHANGE, listener)
}

export async function listMarketingLeads(): Promise<MarketingLead[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('marketing_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000)
    if (error) throw new Error(error.message)
    return (data as Row[]).map(mapRow)
  }
  return readLocal()
}

/** Clinic inbox — leads Marketing sent to a branch */
export async function listMarketingHandoffs(branchId?: string | null): Promise<MarketingLead[]> {
  const all = await listMarketingLeads()
  return all
    .filter((l) => l.handoffStatus != null && l.branchId)
    .filter((l) => !branchId || branchId === 'all' || l.branchId === branchId)
    .sort((a, b) => (b.handoffSentAt ?? b.updatedAt).localeCompare(a.handoffSentAt ?? a.updatedAt))
}

export function countUnreadHandoffs(leads: MarketingLead[], branchId?: string | null): number {
  return leads.filter((l) => {
    if (!l.handoffStatus || !HANDOFF_UNREAD_STATUSES.includes(l.handoffStatus)) return false
    if (!l.branchId) return false
    if (branchId && branchId !== 'all' && l.branchId !== branchId) return false
    return true
  }).length
}

export async function createMarketingLead(input: {
  fullName: string
  phone?: string
  email?: string
  branchId?: string | null
  source: MarketingLeadSource
  notes?: string
}): Promise<MarketingLead> {
  const fullName = input.fullName.trim()
  if (!fullName) throw new Error('Name is required')

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('marketing_leads')
      .insert({
        full_name: fullName,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        branch_id: input.branchId || null,
        source: input.source,
        funnel_stage: 'message',
        notes: input.notes?.trim() || null,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    emit()
    return mapRow(data as Row)
  }

  const now = new Date().toISOString()
  const row: MarketingLead = {
    id: `mlead-${crypto.randomUUID().slice(0, 8)}`,
    fullName,
    phone: input.phone?.trim() ?? '',
    email: input.email?.trim() ?? '',
    branchId: input.branchId ?? null,
    branchName: branchName(input.branchId ?? null),
    source: input.source,
    funnelStage: 'message',
    notes: input.notes?.trim() ?? '',
    saleAmount: null,
    ...emptyHandoff(),
    createdAt: now,
    updatedAt: now,
  }
  writeLocal([row, ...readLocal()])
  return row
}

export async function updateMarketingLeadStage(
  id: string,
  funnelStage: MarketingFunnelStage,
  opts?: { saleAmount?: number | null; notes?: string },
): Promise<MarketingLead> {
  if (isSupabaseConfigured && supabase) {
    const patch: Record<string, unknown> = {
      funnel_stage: funnelStage,
      updated_at: new Date().toISOString(),
    }
    if (funnelStage === 'buy' && opts?.saleAmount != null) {
      patch.sale_amount = opts.saleAmount
    }
    if (opts?.notes !== undefined) patch.notes = opts.notes || null

    const { data, error } = await supabase
      .from('marketing_leads')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    emit()
    return mapRow(data as Row)
  }

  const rows = readLocal()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Lead not found')
  const now = new Date().toISOString()
  rows[idx] = {
    ...rows[idx],
    funnelStage,
    notes: opts?.notes ?? rows[idx].notes,
    saleAmount:
      funnelStage === 'buy' && opts?.saleAmount != null ? opts.saleAmount : rows[idx].saleAmount,
    updatedAt: now,
  }
  writeLocal(rows)
  return rows[idx]
}

/** Marketing sends lead details to a clinic for booking */
export async function sendLeadToClinic(
  id: string,
  input: { branchId: string; note?: string },
): Promise<MarketingLead> {
  if (!input.branchId) throw new Error('Select a clinic branch')
  const now = new Date().toISOString()
  const note = input.note?.trim() || ''

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('marketing_leads')
      .update({
        branch_id: input.branchId,
        handoff_status: 'sent',
        handoff_note: note || null,
        handoff_sent_at: now,
        handoff_seen_at: null,
        handoff_resolved_at: null,
        handoff_resolved_by: null,
        updated_at: now,
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    emit()
    return mapRow(data as Row)
  }

  const rows = readLocal()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Lead not found')
  rows[idx] = {
    ...rows[idx],
    branchId: input.branchId,
    branchName: branchName(input.branchId),
    handoffStatus: 'sent',
    handoffNote: note,
    handoffSentAt: now,
    handoffSeenAt: null,
    handoffResolvedAt: null,
    updatedAt: now,
  }
  writeLocal(rows)
  return rows[idx]
}

export async function markHandoffSeen(id: string): Promise<MarketingLead> {
  const now = new Date().toISOString()
  if (isSupabaseConfigured && supabase) {
    const { data: current, error: loadErr } = await supabase
      .from('marketing_leads')
      .select('*')
      .eq('id', id)
      .single()
    if (loadErr) throw new Error(loadErr.message)
    if (current.handoff_status !== 'sent') return mapRow(current as Row)
    const { data, error } = await supabase
      .from('marketing_leads')
      .update({
        handoff_status: 'seen',
        handoff_seen_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    emit()
    return mapRow(data as Row)
  }

  const rows = readLocal()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Lead not found')
  if (rows[idx].handoffStatus !== 'sent') return rows[idx]
  rows[idx] = {
    ...rows[idx],
    handoffStatus: 'seen',
    handoffSeenAt: now,
    updatedAt: now,
  }
  writeLocal(rows)
  return rows[idx]
}

export async function resolveHandoff(
  id: string,
  status: 'booked' | 'no_answer' | 'declined',
  opts?: { note?: string },
): Promise<MarketingLead> {
  const now = new Date().toISOString()
  const note = opts?.note?.trim()

  if (isSupabaseConfigured && supabase) {
    const patch: Record<string, unknown> = {
      handoff_status: status,
      handoff_resolved_at: now,
      updated_at: now,
    }
    if (note) patch.handoff_note = note
    if (status === 'booked') patch.funnel_stage = 'book'

    const { data, error } = await supabase
      .from('marketing_leads')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    emit()
    return mapRow(data as Row)
  }

  const rows = readLocal()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Lead not found')
  rows[idx] = {
    ...rows[idx],
    handoffStatus: status,
    handoffNote: note ?? rows[idx].handoffNote,
    handoffResolvedAt: now,
    funnelStage: status === 'booked' ? 'book' : rows[idx].funnelStage,
    updatedAt: now,
  }
  writeLocal(rows)
  return rows[idx]
}

export async function deleteMarketingLead(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('marketing_leads').delete().eq('id', id)
    if (error) throw new Error(error.message)
    emit()
    return
  }
  writeLocal(readLocal().filter((r) => r.id !== id))
}

export function nextFunnelStage(current: MarketingFunnelStage): MarketingFunnelStage | null {
  if (current === 'lost') return null
  const i = FUNNEL_STAGE_ORDER.indexOf(current)
  if (i < 0 || i >= FUNNEL_STAGE_ORDER.length - 1) return null
  return FUNNEL_STAGE_ORDER[i + 1]
}

/** Digits-only phone key (last 10) for PH mobile matching */
export function normalizeLeadPhone(phone: string | null | undefined): string {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length >= 10) return digits.slice(-10)
  return digits
}

export function normalizeLeadName(name: string | null | undefined): string {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stageRank(stage: MarketingFunnelStage): number {
  if (stage === 'lost') return -1
  return FUNNEL_STAGE_ORDER.indexOf(stage)
}

function phonesMatch(a: string, b: string): boolean {
  const x = normalizeLeadPhone(a)
  const y = normalizeLeadPhone(b)
  return Boolean(x && y && x === y)
}

function namesMatch(a: string, b: string): boolean {
  const x = normalizeLeadName(a)
  const y = normalizeLeadName(b)
  return Boolean(x && y && x === y)
}

/** Open handoffs still in the funnel (not lost / fully declined) */
function isTrackableHandoff(lead: MarketingLead): boolean {
  if (!lead.handoffStatus) return false
  if (lead.funnelStage === 'lost') return false
  if (lead.handoffStatus === 'declined') return false
  return true
}

export async function findHandoffByNamePhone(
  fullName: string,
  phone: string,
  opts?: { branchId?: string | null; leadId?: string | null },
): Promise<MarketingLead | null> {
  const leads = await listMarketingLeads()
  const candidates = leads.filter((l) => {
    if (opts?.leadId) return l.id === opts.leadId
    if (!isTrackableHandoff(l)) return false
    if (opts?.branchId && l.branchId && l.branchId !== opts.branchId) return false
    return namesMatch(l.fullName, fullName) && phonesMatch(l.phone, phone)
  })
  if (!candidates.length) return null
  candidates.sort((a, b) => (b.handoffSentAt ?? b.updatedAt).localeCompare(a.handoffSentAt ?? a.updatedAt))
  return candidates[0] ?? null
}

export async function findHandoffByClientId(clientId: string): Promise<MarketingLead | null> {
  if (!clientId) return null
  const leads = await listMarketingLeads()
  const hit = leads
    .filter((l) => l.clientId === clientId && isTrackableHandoff(l))
    .sort((a, b) => (b.updatedAt).localeCompare(a.updatedAt))
  return hit[0] ?? null
}

async function patchLead(
  id: string,
  patch: Record<string, unknown>,
  localApply: (row: MarketingLead) => MarketingLead,
): Promise<MarketingLead | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('marketing_leads')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()
    if (error) {
      console.warn('[marketing] lead sync failed', error.message)
      return null
    }
    emit()
    return mapRow(data as Row)
  }
  const rows = readLocal()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) return null
  rows[idx] = localApply(rows[idx])
  writeLocal(rows)
  return rows[idx]
}

/**
 * Patient registered or booked — match full name + phone (or known lead id),
 * link client, set funnel to Book.
 */
export async function syncHandoffOnPatientBooked(input: {
  fullName: string
  phone: string
  clientId: string
  appointmentId?: string | null
  branchId?: string | null
  leadId?: string | null
}): Promise<MarketingLead | null> {
  const lead =
    (input.leadId
      ? (await listMarketingLeads()).find((l) => l.id === input.leadId) ?? null
      : null) ||
    (await findHandoffByClientId(input.clientId)) ||
    (await findHandoffByNamePhone(input.fullName, input.phone, {
      branchId: input.branchId,
      leadId: input.leadId,
    }))
  if (!lead || !isTrackableHandoff(lead)) return null

  const now = new Date().toISOString()
  const nextStage: MarketingFunnelStage =
    stageRank(lead.funnelStage) < stageRank('book') ? 'book' : lead.funnelStage

  return patchLead(
    lead.id,
    {
      client_id: input.clientId,
      appointment_id: input.appointmentId || lead.appointmentId || null,
      funnel_stage: nextStage,
      handoff_status: 'booked',
      handoff_resolved_at: lead.handoffResolvedAt || now,
      handoff_seen_at: lead.handoffSeenAt || now,
    },
    (row) => ({
      ...row,
      clientId: input.clientId,
      appointmentId: input.appointmentId || row.appointmentId,
      funnelStage: nextStage,
      handoffStatus: 'booked',
      handoffResolvedAt: row.handoffResolvedAt || now,
      handoffSeenAt: row.handoffSeenAt || now,
      updatedAt: now,
    }),
  )
}

/** Appointment checked in / completed → Show up (if not already Buy) */
export async function syncHandoffOnShowUp(input: {
  clientId?: string | null
  fullName?: string
  phone?: string
}): Promise<MarketingLead | null> {
  const lead =
    (input.clientId ? await findHandoffByClientId(input.clientId) : null) ||
    (input.fullName && input.phone
      ? await findHandoffByNamePhone(input.fullName, input.phone)
      : null)
  if (!lead || !isTrackableHandoff(lead)) return null
  if (stageRank(lead.funnelStage) >= stageRank('show_up')) return lead
  if (stageRank(lead.funnelStage) < stageRank('book')) return lead

  const now = new Date().toISOString()
  return patchLead(
    lead.id,
    { funnel_stage: 'show_up' },
    (row) => ({ ...row, funnelStage: 'show_up', updatedAt: now }),
  )
}

/**
 * Appointment cancelled / no-show — drop back to Message (unless already Buy).
 * Keeps client link so a rebook can advance again.
 */
export async function syncHandoffOnBookingCancelled(input: {
  clientId?: string | null
  fullName?: string
  phone?: string
  appointmentId?: string | null
}): Promise<MarketingLead | null> {
  const lead =
    (input.clientId ? await findHandoffByClientId(input.clientId) : null) ||
    (input.fullName && input.phone
      ? await findHandoffByNamePhone(input.fullName, input.phone)
      : null)
  if (!lead || !isTrackableHandoff(lead)) return null
  if (lead.funnelStage === 'buy') return lead

  const now = new Date().toISOString()
  const clearAppt =
    !input.appointmentId || !lead.appointmentId || lead.appointmentId === input.appointmentId

  return patchLead(
    lead.id,
    {
      funnel_stage: 'message',
      appointment_id: clearAppt ? null : lead.appointmentId,
      handoff_status: lead.handoffStatus === 'booked' ? 'seen' : lead.handoffStatus,
    },
    (row) => ({
      ...row,
      funnelStage: 'message',
      appointmentId: clearAppt ? null : row.appointmentId,
      handoffStatus: row.handoffStatus === 'booked' ? 'seen' : row.handoffStatus,
      updatedAt: now,
    }),
  )
}

/**
 * POS / booking sale for this customer → Buy + sale amount (+ optional service names in notes).
 * Matches linked client_id first, then full name + phone.
 */
export async function syncHandoffOnSale(input: {
  clientId?: string | null
  fullName: string
  phone: string
  saleAmount: number
  serviceSummary?: string
  branchId?: string | null
}): Promise<MarketingLead | null> {
  const lead =
    (input.clientId ? await findHandoffByClientId(input.clientId) : null) ||
    (await findHandoffByNamePhone(input.fullName, input.phone, { branchId: input.branchId }))
  if (!lead || !isTrackableHandoff(lead)) return null

  const now = new Date().toISOString()
  const prevSale = lead.saleAmount ?? 0
  const saleAmount = Math.max(prevSale, input.saleAmount) || input.saleAmount
  const noteExtra = input.serviceSummary?.trim()
  const notes =
    noteExtra && !lead.notes.includes(noteExtra)
      ? [lead.notes, `Sale: ${noteExtra}`].filter(Boolean).join('\n')
      : lead.notes

  return patchLead(
    lead.id,
    {
      client_id: input.clientId || lead.clientId,
      funnel_stage: 'buy',
      sale_amount: saleAmount,
      handoff_status: 'booked',
      handoff_resolved_at: lead.handoffResolvedAt || now,
      notes: notes || null,
    },
    (row) => ({
      ...row,
      clientId: input.clientId || row.clientId,
      funnelStage: 'buy',
      saleAmount,
      handoffStatus: 'booked',
      handoffResolvedAt: row.handoffResolvedAt || now,
      notes,
      updatedAt: now,
    }),
  )
}
