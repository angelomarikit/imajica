import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { MarketingLeadSource } from '@/services/marketingLeadService'

const KEY = 'imajica_marketing_ad_spend'
const CHANGE = 'imajica:marketing-ad-spend-changed'

export type AdSpendSource = 'facebook_ads' | 'facebook_groups' | 'instagram' | 'tiktok' | 'other'
export type AdCampaignStatus = 'active' | 'paused' | 'completed'

export const AD_SPEND_SOURCE_LABELS: Record<AdSpendSource, string> = {
  facebook_ads: 'Facebook Ads',
  facebook_groups: 'Facebook Groups',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  other: 'Other',
}

export const AD_CAMPAIGN_STATUS_LABELS: Record<AdCampaignStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
}

export type MarketingAdSpend = {
  id: string
  name: string
  branchId: string | null
  source: AdSpendSource
  status: AdCampaignStatus
  spendDate: string
  endDate: string | null
  amount: number
  impressions: number
  reach: number
  clicks: number
  messages: number
  clients: number
  notes: string
  createdAt: string
}

export type MarketingAdCampaignInput = {
  name: string
  branchId?: string | null
  source: AdSpendSource
  status?: AdCampaignStatus
  spendDate: string
  endDate?: string | null
  amount: number
  impressions?: number
  reach?: number
  clicks?: number
  messages?: number
  clients?: number
  notes?: string
}

type Row = {
  id: string
  name?: string | null
  branch_id: string | null
  source: string
  status?: string | null
  spend_date: string
  end_date?: string | null
  amount: number
  impressions?: number | null
  reach?: number | null
  clicks?: number | null
  messages?: number | null
  clients?: number | null
  notes: string | null
  created_at: string
}

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function mapRow(row: Row): MarketingAdSpend {
  return {
    id: row.id,
    name: (row.name ?? row.notes ?? 'Untitled campaign').trim() || 'Untitled campaign',
    branchId: row.branch_id,
    source: row.source as AdSpendSource,
    status: (row.status as AdCampaignStatus) || 'active',
    spendDate: row.spend_date,
    endDate: row.end_date ?? null,
    amount: Number(row.amount),
    impressions: num(row.impressions),
    reach: num(row.reach),
    clicks: num(row.clicks),
    messages: num(row.messages),
    clients: num(row.clients),
    notes: row.notes ?? '',
    createdAt: row.created_at,
  }
}

function readLocal(): MarketingAdSpend[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seedSpend()
    const parsed = JSON.parse(raw) as MarketingAdSpend[]
    if (!Array.isArray(parsed) || parsed.length === 0) return seedSpend()
    return parsed.map((r) => ({
      ...r,
      name: r.name || 'Untitled campaign',
      status: r.status || 'active',
      endDate: r.endDate ?? null,
      impressions: num(r.impressions),
      reach: num(r.reach),
      clicks: num(r.clicks),
      messages: num(r.messages),
      clients: num(r.clients),
    }))
  } catch {
    return seedSpend()
  }
}

function writeLocal(rows: MarketingAdSpend[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
  emit()
}

function seedSpend(): MarketingAdSpend[] {
  const d = new Date()
  const spendDate = d.toISOString().slice(0, 10)
  const rows: MarketingAdSpend[] = [
    {
      id: 'mspend-seed-1',
      name: 'Glow Face — San Mateo Boost',
      branchId: null,
      source: 'facebook_ads',
      status: 'active',
      spendDate,
      endDate: null,
      amount: 12500,
      impressions: 48200,
      reach: 31200,
      clicks: 860,
      messages: 142,
      clients: 18,
      notes: 'Carousel — before/after face treatments',
      createdAt: d.toISOString(),
    },
    {
      id: 'mspend-seed-2',
      name: 'IG Reels — Acne Clearance',
      branchId: null,
      source: 'instagram',
      status: 'active',
      spendDate,
      endDate: null,
      amount: 8000,
      impressions: 61000,
      reach: 45000,
      clicks: 1120,
      messages: 98,
      clients: 11,
      notes: '',
      createdAt: d.toISOString(),
    },
    {
      id: 'mspend-seed-3',
      name: 'TikTok — First Visit Promo',
      branchId: null,
      source: 'tiktok',
      status: 'paused',
      spendDate,
      endDate: null,
      amount: 4500,
      impressions: 92000,
      reach: 71000,
      clicks: 2100,
      messages: 76,
      clients: 6,
      notes: 'Hook: ₱999 trial facial',
      createdAt: d.toISOString(),
    },
  ]
  localStorage.setItem(KEY, JSON.stringify(rows))
  return rows
}

export function subscribeMarketingAdSpend(listener: () => void) {
  window.addEventListener(CHANGE, listener)
  return () => window.removeEventListener(CHANGE, listener)
}

/** Cost per message / CPC / cost per client helpers */
export function campaignDerivedMetrics(c: MarketingAdSpend) {
  const cpm = c.messages > 0 ? c.amount / c.messages : null
  const cpc = c.clicks > 0 ? c.amount / c.clicks : null
  const costPerClient = c.clients > 0 ? c.amount / c.clients : null
  const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : null
  return { cpm, cpc, costPerClient, ctr }
}

export async function listMarketingAdSpend(): Promise<MarketingAdSpend[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('marketing_ad_spend')
      .select('*')
      .order('spend_date', { ascending: false })
      .limit(2000)
    if (error) throw new Error(error.message)
    return (data as Row[])
      .map(mapRow)
      .sort((a, b) => b.clients - a.clients || b.amount - a.amount)
  }
  return [...readLocal()].sort((a, b) => b.clients - a.clients || b.amount - a.amount)
}

export async function createMarketingAdSpend(
  input: MarketingAdCampaignInput,
): Promise<MarketingAdSpend> {
  const name = input.name.trim()
  if (!name) throw new Error('Campaign name is required')
  if (input.amount < 0) throw new Error('Amount must be zero or more')

  const payload = {
    name,
    branch_id: input.branchId || null,
    source: input.source,
    status: input.status ?? 'active',
    spend_date: input.spendDate,
    end_date: input.endDate || null,
    amount: input.amount,
    impressions: num(input.impressions),
    reach: num(input.reach),
    clicks: num(input.clicks),
    messages: num(input.messages),
    clients: num(input.clients),
    notes: input.notes?.trim() || null,
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('marketing_ad_spend')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    emit()
    return mapRow(data as Row)
  }

  const row: MarketingAdSpend = {
    id: `mspend-${crypto.randomUUID().slice(0, 8)}`,
    name,
    branchId: input.branchId ?? null,
    source: input.source,
    status: input.status ?? 'active',
    spendDate: input.spendDate,
    endDate: input.endDate ?? null,
    amount: input.amount,
    impressions: num(input.impressions),
    reach: num(input.reach),
    clicks: num(input.clicks),
    messages: num(input.messages),
    clients: num(input.clients),
    notes: input.notes?.trim() ?? '',
    createdAt: new Date().toISOString(),
  }
  writeLocal([row, ...readLocal()])
  return row
}

export async function updateMarketingAdSpend(
  id: string,
  input: MarketingAdCampaignInput,
): Promise<MarketingAdSpend> {
  const name = input.name.trim()
  if (!name) throw new Error('Campaign name is required')
  if (input.amount < 0) throw new Error('Amount must be zero or more')

  const payload = {
    name,
    branch_id: input.branchId || null,
    source: input.source,
    status: input.status ?? 'active',
    spend_date: input.spendDate,
    end_date: input.endDate || null,
    amount: input.amount,
    impressions: num(input.impressions),
    reach: num(input.reach),
    clicks: num(input.clicks),
    messages: num(input.messages),
    clients: num(input.clients),
    notes: input.notes?.trim() || null,
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('marketing_ad_spend')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    emit()
    return mapRow(data as Row)
  }

  const rows = readLocal()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Campaign not found')
  const updated: MarketingAdSpend = {
    ...rows[idx]!,
    name,
    branchId: input.branchId ?? null,
    source: input.source,
    status: input.status ?? 'active',
    spendDate: input.spendDate,
    endDate: input.endDate ?? null,
    amount: input.amount,
    impressions: num(input.impressions),
    reach: num(input.reach),
    clicks: num(input.clicks),
    messages: num(input.messages),
    clients: num(input.clients),
    notes: input.notes?.trim() ?? '',
  }
  rows[idx] = updated
  writeLocal(rows)
  return updated
}

export async function deleteMarketingAdSpend(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('marketing_ad_spend').delete().eq('id', id)
    if (error) throw new Error(error.message)
    emit()
    return
  }
  writeLocal(readLocal().filter((r) => r.id !== id))
}

export function adSourceMatchesLead(
  adSource: AdSpendSource,
  leadSource: MarketingLeadSource,
): boolean {
  if (adSource === 'other') return true
  return adSource === leadSource
}
