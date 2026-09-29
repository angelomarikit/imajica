import { getClients } from '@/services/clientService'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type {
  MarketingCampaign,
  MarketingCampaignStatus,
  SemaphoreAccountInfo,
  SmsAudienceMember,
} from '@/types'

const STORAGE_KEY = 'imajica_sms_campaigns'
const CHANGE_EVENT = 'imajica:sms-campaigns-changed'

/** ASCII 160/153, Unicode 70/67 — matches Semaphore splitting rules roughly */
export function estimateSmsSegments(message: string): number {
  const isUnicode = /[^\x00-\x7F]/.test(message)
  if (!isUnicode) {
    if (message.length <= 160) return 1
    return Math.ceil(message.length / 153)
  }
  if (message.length <= 70) return 1
  return Math.ceil(message.length / 67)
}

export function normalizePhPhone(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('63') && d.length >= 12) return d
  if (d.startsWith('0') && d.length >= 11) return '63' + d.slice(1)
  if (d.length === 10 && d.startsWith('9')) return '63' + d
  return d
}

export function isValidPhMobile(raw: string): boolean {
  const n = normalizePhPhone(raw)
  return /^639\d{9}$/.test(n)
}

function emitChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function subscribeSmsCampaigns(cb: () => void) {
  window.addEventListener(CHANGE_EVENT, cb)
  return () => window.removeEventListener(CHANGE_EVENT, cb)
}

function readLocal(): MarketingCampaign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MarketingCampaign[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(list: MarketingCampaign[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  emitChange()
}

function mapRow(row: Record<string, unknown>): MarketingCampaign {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    channel: (row.channel as MarketingCampaign['channel']) ?? 'sms',
    branchId: row.branch_id ? String(row.branch_id) : undefined,
    audience: String(row.audience ?? ''),
    content: row.content ? String(row.content) : undefined,
    messageBody: row.message_body ? String(row.message_body) : undefined,
    senderName: row.sender_name ? String(row.sender_name) : undefined,
    recipientCount: Number(row.recipient_count ?? 0),
    creditsEstimated: Number(row.credits_estimated ?? 0),
    creditsUsed: Number(row.credits_used ?? 0),
    sentAt: row.sent_at ? String(row.sent_at) : undefined,
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    status: (row.status as MarketingCampaignStatus) ?? 'draft',
    startDate: String(row.start_date ?? '').slice(0, 10),
    endDate: String(row.end_date ?? '').slice(0, 10),
    reach: Number(row.reach ?? 0),
    conversions: Number(row.conversions ?? 0),
    revenue: Number(row.revenue ?? 0),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  }
}

export function getSmsAudience(branchId?: string | 'all'): SmsAudienceMember[] {
  const clients = getClients().filter((c) => c.status !== 'inactive' && isValidPhMobile(c.phone))
  const filtered =
    !branchId || branchId === 'all'
      ? clients
      : clients.filter((c) => c.preferredBranchId === branchId)

  const seen = new Set<string>()
  const out: SmsAudienceMember[] = []
  for (const c of filtered) {
    const phone = normalizePhPhone(c.phone)
    if (seen.has(phone)) continue
    seen.add(phone)
    out.push({
      clientId: c.id,
      fullName: c.fullName,
      phone,
      branchId: c.preferredBranchId,
      branchName: c.preferredBranchName,
    })
  }
  return out
}

export async function getSemaphoreAccount(): Promise<SemaphoreAccountInfo> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      configured: false,
      creditBalance: 0,
      error: 'Messaging is not connected yet.',
    }
  }

  const { data, error } = await supabase.functions.invoke('semaphore-account')
  if (error) {
    return { configured: false, creditBalance: 0, error: 'Couldn’t load credits right now. Try again shortly.' }
  }
  const body = data as {
    configured?: boolean
    credit_balance?: number
    account_id?: number
    account_name?: string
    status?: string
    error?: string
  }
  if (body?.error && body.configured === false) {
    return { configured: false, creditBalance: 0, error: 'Messaging credits aren’t connected yet.' }
  }
  if (body?.error) {
    return { configured: false, creditBalance: 0, error: 'Couldn’t load credits right now. Try again shortly.' }
  }
  return {
    configured: body?.configured !== false,
    creditBalance: Number(body?.credit_balance ?? 0),
    accountId: body?.account_id,
    accountName: body?.account_name,
    status: body?.status,
  }
}

export async function listSmsCampaigns(): Promise<MarketingCampaign[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('channel', 'sms')
      .order('created_at', { ascending: false })
    if (!error && data) return data.map((r) => mapRow(r as Record<string, unknown>))
  }
  return readLocal()
    .filter((c) => String(c.channel).toLowerCase() === 'sms')
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

export type CreateSmsCampaignInput = {
  name: string
  messageBody: string
  audienceLabel: string
  branchId?: string
  senderName?: string
  recipients: SmsAudienceMember[]
}

export async function createSmsCampaign(
  input: CreateSmsCampaignInput,
): Promise<MarketingCampaign> {
  const segments = estimateSmsSegments(input.messageBody)
  const recipientCount = input.recipients.length
  const creditsEstimated = recipientCount * segments
  const today = new Date().toISOString().slice(0, 10)

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert({
        name: input.name.trim(),
        channel: 'sms',
        branch_id: input.branchId && input.branchId !== 'all' ? input.branchId : null,
        audience: input.audienceLabel,
        message_body: input.messageBody.trim(),
        sender_name: input.senderName?.trim() || null,
        recipient_count: recipientCount,
        credits_estimated: creditsEstimated,
        status: 'draft',
        start_date: today,
        end_date: today,
        reach: 0,
        conversions: 0,
        revenue: 0,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    const campaign = mapRow(data as Record<string, unknown>)

    if (input.recipients.length) {
      const rows = input.recipients.map((r) => ({
        campaign_id: campaign.id,
        client_id: r.clientId.startsWith('cl-') ? null : r.clientId,
        phone: r.phone,
        status: 'pending',
      }))
      // Demo client ids are not UUIDs — store phone only when not a UUID
      const cleaned = rows.map((r) => ({
        ...r,
        client_id: isUuid(r.client_id) ? r.client_id : null,
      }))
      await supabase.from('sms_campaign_recipients').insert(cleaned)
    }

    return campaign
  }

  const campaign: MarketingCampaign = {
    id: `sms-${Date.now()}`,
    name: input.name.trim(),
    channel: 'sms',
    branchId: input.branchId,
    audience: input.audienceLabel,
    messageBody: input.messageBody.trim(),
    senderName: input.senderName?.trim(),
    recipientCount,
    creditsEstimated,
    creditsUsed: 0,
    status: 'draft',
    startDate: today,
    endDate: today,
    reach: 0,
    conversions: 0,
    revenue: 0,
    createdAt: new Date().toISOString(),
  }
  writeLocal([campaign, ...readLocal()])
  // Persist recipients for demo send preview
  localStorage.setItem(
    `${STORAGE_KEY}_recipients_${campaign.id}`,
    JSON.stringify(input.recipients),
  )
  return campaign
}

export async function deleteSmsCampaign(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('marketing_campaigns').delete().eq('id', id)
    return
  }
  writeLocal(readLocal().filter((c) => c.id !== id))
  localStorage.removeItem(`${STORAGE_KEY}_recipients_${id}`)
}

export type SendSmsResult = {
  ok: boolean
  sent?: number
  failed?: number
  credits_used?: number
  status?: string
  error?: string
  credit_balance_before?: number
}

export async function sendSmsCampaign(campaignId: string): Promise<SendSmsResult> {
  if (!isSupabaseConfigured || !supabase) {
    // Demo: mark local campaign as sent without calling Semaphore
    const list = readLocal()
    const idx = list.findIndex((c) => c.id === campaignId)
    if (idx < 0) return { ok: false, error: 'Campaign not found' }
    const camp = list[idx]
    const updated: MarketingCampaign = {
      ...camp,
      status: 'sent',
      reach: camp.recipientCount ?? 0,
      creditsUsed: camp.creditsEstimated ?? 0,
      sentAt: new Date().toISOString(),
      errorMessage:
        'Saved as sent for practice only — live text messages are not delivered until messaging is connected.',
    }
    const next = [...list]
    next[idx] = updated
    writeLocal(next)
    return {
      ok: true,
      sent: updated.reach,
      failed: 0,
      credits_used: updated.creditsUsed,
      status: 'sent',
      error: updated.errorMessage,
    }
  }

  const recipientsRaw = localStorage.getItem(`${STORAGE_KEY}_recipients_${campaignId}`)
  let recipients: { client_id: string | null; phone: string }[] | undefined
  if (recipientsRaw) {
    try {
      const parsed = JSON.parse(recipientsRaw) as SmsAudienceMember[]
      recipients = parsed.map((r) => ({
        client_id: isUuid(r.clientId) ? r.clientId : null,
        phone: r.phone,
      }))
    } catch {
      recipients = undefined
    }
  }

  const { data, error } = await supabase.functions.invoke('semaphore-send', {
    body: { campaignId, recipients },
  })

  if (error) return { ok: false, error: error.message }
  const body = (data ?? {}) as SendSmsResult & { error?: string }
  if (body.error && body.ok !== true) {
    return {
      ok: false,
      error: body.error,
      sent: body.sent,
      failed: body.failed,
      credits_used: body.credits_used,
      credit_balance_before: body.credit_balance_before,
    }
  }
  return {
    ok: true,
    sent: body.sent,
    failed: body.failed,
    credits_used: body.credits_used,
    status: body.status,
    error: body.error,
    credit_balance_before: body.credit_balance_before,
  }
}

function isUuid(value: string | null | undefined): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}
