import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { resolveSalePaymentMethods } from '@/services/salesService'
import type { Sale } from '@/types'

/** Checkout payment channels shown on the Payment Channels Report. */
export const PAYMENT_CHANNEL_KEYS = [
  'cash',
  'credit_card',
  'debit_card',
  'qr_ph',
  'owners_account',
] as const

export type PaymentChannelKey = (typeof PAYMENT_CHANNEL_KEYS)[number]

export type PaymentChannelRow = {
  key: PaymentChannelKey | 'other'
  label: string
  amount: number
  count: number
  sharePct: number
}

export type PaymentChannelsReportResult = {
  channels: PaymentChannelRow[]
  total: number
  txnCount: number
  /** Sum of sales.total_amount in range (matches dashboard gross). */
  salesGross?: number
  salesCount?: number
}

const CHANNEL_LABELS: Record<PaymentChannelKey | 'other', string> = {
  cash: 'Cash',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  qr_ph: 'QR PH',
  owners_account: 'Owners Account',
  other: 'Other',
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/** Map DB / legacy method strings onto the five report channels (+ other). */
export function normalizePaymentChannel(raw: string | null | undefined): PaymentChannelKey | 'other' {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (!key) return 'other'
  if (key === 'cash') return 'cash'
  if (key === 'credit_card' || key === 'creditcard' || key === 'card') return 'credit_card'
  if (key === 'debit_card' || key === 'debitcard') return 'debit_card'
  if (
    key === 'qr_ph' ||
    key === 'qrph' ||
    key === 'qr' ||
    key === 'gcash' ||
    key === 'paymaya' ||
    key === 'paymongo'
  ) {
    return 'qr_ph'
  }
  if (key === 'owners_account' || key === 'ownersaccount') return 'owners_account'
  return 'other'
}

function emptyBuckets(): Record<PaymentChannelKey | 'other', { amount: number; count: number }> {
  return {
    cash: { amount: 0, count: 0 },
    credit_card: { amount: 0, count: 0 },
    debit_card: { amount: 0, count: 0 },
    qr_ph: { amount: 0, count: 0 },
    owners_account: { amount: 0, count: 0 },
    other: { amount: 0, count: 0 },
  }
}

function toRows(
  buckets: Record<PaymentChannelKey | 'other', { amount: number; count: number }>,
): PaymentChannelsReportResult {
  const keys: Array<PaymentChannelKey | 'other'> = [...PAYMENT_CHANNEL_KEYS, 'other']
  const total = round2(keys.reduce((s, k) => s + buckets[k].amount, 0))
  const txnCount = keys.reduce((s, k) => s + buckets[k].count, 0)
  const channels = keys
    .filter((k) => k !== 'other' || buckets[k].amount > 0 || buckets[k].count > 0)
    .map((k) => ({
      key: k,
      label: CHANNEL_LABELS[k],
      amount: round2(buckets[k].amount),
      count: buckets[k].count,
      sharePct: total > 0 ? round2((buckets[k].amount / total) * 100) : 0,
    }))
  return { channels, total, txnCount }
}

function mapRpcChannels(
  raw: Array<{ key?: string; amount?: number; count?: number }> | null | undefined,
): PaymentChannelsReportResult {
  const buckets = emptyBuckets()
  for (const row of raw ?? []) {
    const key = normalizePaymentChannel(row.key)
    buckets[key].amount += Number(row.amount) || 0
    buckets[key].count += Number(row.count) || 0
  }
  const built = toRows(buckets)
  return built
}

async function fetchPaymentChannelsViaRpc(input: {
  from: string
  to: string
  branchId?: string | null
}): Promise<PaymentChannelsReportResult | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('payment_channels_report', {
    p_branch_id: input.branchId || null,
    p_from: input.from,
    p_to: input.to,
  })
  if (error) {
    if (/does not exist|schema cache|42883/i.test(error.message)) return null
    throw new Error(error.message)
  }
  const payload = (data ?? {}) as {
    ok?: boolean
    error?: string
    channels?: Array<{ key?: string; amount?: number; count?: number }>
    total?: number
    txn_count?: number
    sales_gross?: number
    sales_count?: number
  }
  if (payload.ok === false) {
    throw new Error(payload.error || 'Payment channels report not allowed')
  }
  const mapped = mapRpcChannels(payload.channels)
  return {
    ...mapped,
    total: round2(Number(payload.total) ?? mapped.total),
    txnCount: Number(payload.txn_count) ?? mapped.txnCount,
    salesGross: Number(payload.sales_gross) || undefined,
    salesCount: Number(payload.sales_count) || undefined,
  }
}

/**
 * Sum customer-paid amounts by payment channel from Supabase (RPC — same rules as dashboard).
 */
export async function fetchPaymentChannelsReport(input: {
  from: string
  to: string
  /** Clinic UUID, or omit / null for all branches (HQ). */
  branchId?: string | null
}): Promise<PaymentChannelsReportResult> {
  const fromDay = input.from.slice(0, 10)
  const toDay = input.to.slice(0, 10)
  if (!fromDay || !toDay) {
    return toRows(emptyBuckets())
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const rpc = await fetchPaymentChannelsViaRpc({
        from: fromDay,
        to: toDay,
        branchId: input.branchId,
      })
      if (rpc) return rpc
    } catch (err) {
      console.error('[payment-channels] rpc failed', err)
      throw err instanceof Error ? err : new Error('Payment channels load failed')
    }

    return fetchPaymentChannelsClientDirect({
      from: fromDay,
      to: toDay,
      branchId: input.branchId,
    })
  }

  return { channels: toRows(emptyBuckets()).channels, total: 0, txnCount: 0 }
}

/** Client-side path when RPC not migrated yet — mirrors RPC logic. */
async function fetchPaymentChannelsClientDirect(input: {
  from: string
  to: string
  branchId?: string | null
}): Promise<PaymentChannelsReportResult> {
  const buckets = emptyBuckets()
  let salesGross = 0
  let salesCount = 0

  type SaleHeader = {
    id: string
    total_amount: number
    payment_methods: string[] | null
    created_at: string
  }

  const headers: SaleHeader[] = []
  const pageSize = 500
  for (let from = 0; from < 20_000; from += pageSize) {
    let query = supabase!
      .from('sales')
      .select('id, total_amount, payment_methods, created_at')
      .or('lead_source.is.null,lead_source.neq.Migration')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (input.branchId) query = query.eq('branch_id', input.branchId)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as SaleHeader[]
    if (!rows.length) break
    for (const row of rows) {
      const manilaDay = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(row.created_at))
      if (manilaDay < input.from || manilaDay > input.to) continue
      headers.push(row)
      salesGross += Number(row.total_amount) || 0
      salesCount += 1
    }
    if (rows.length < pageSize) break
  }

  const paidBySale = new Map<string, number>()
  const saleIds = headers.map((h) => h.id)

  const chunkSize = 200
  for (let i = 0; i < saleIds.length; i += chunkSize) {
    const chunk = saleIds.slice(i, i + chunkSize)
    const { data, error } = await supabase!
      .from('payments')
      .select('sale_id, payment_method, payment_amount, payment_status')
      .in('sale_id', chunk)
    if (error) throw new Error(error.message)

    for (const row of (data ?? []) as Array<{
      sale_id: string
      payment_method: string
      payment_amount: number
      payment_status: string
    }>) {
      const status = String(row.payment_status || '').toLowerCase()
      if (status === 'failed' || status === 'cancelled' || status === 'refunded') continue
      const amount = Number(row.payment_amount) || 0
      if (amount <= 0) continue
      const channel = normalizePaymentChannel(row.payment_method)
      buckets[channel].amount += amount
      buckets[channel].count += 1
      paidBySale.set(row.sale_id, (paidBySale.get(row.sale_id) ?? 0) + amount)
    }
  }

  for (const h of headers) {
    if ((paidBySale.get(h.id) ?? 0) > 0) continue
    const total = Number(h.total_amount) || 0
    if (total <= 0) continue
    const methods = (h.payment_methods ?? [])
      .map((m) => normalizePaymentChannel(m))
      .filter((m) => m !== 'other')
    const list = methods.length ? methods : (['other'] as const)
    const share = total / list.length
    for (const channel of list) {
      buckets[channel].amount += share
      buckets[channel].count += 1
    }
  }

  const built = toRows(buckets)
  return { ...built, salesGross: round2(salesGross), salesCount }
}

/** Fallback aggregation from hydrated Sale lines (offline / tests only). */
export function paymentChannelsFromSales(
  sales: Sale[],
  from: string,
  to: string,
  branchId?: string,
): PaymentChannelsReportResult {
  const buckets = emptyBuckets()
  const seenHeaders = new Set<string>()

  for (const s of sales) {
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(s.createdAt))
    if (day < from || day > to) continue
    if (branchId && s.branchId !== branchId) continue
    if ((s.leadSource || '') === 'Migration') continue

    const headerId = s.id.includes(':') ? s.id.slice(0, s.id.indexOf(':')) : s.id
    if (seenHeaders.has(headerId)) continue
    seenHeaders.add(headerId)

    if (s.paymentBreakdown?.length) {
      for (const row of s.paymentBreakdown) {
        const status = String(row.status || '').toLowerCase()
        if (status === 'failed' || status === 'cancelled' || status === 'refunded') continue
        const amount = Number(row.amount) || 0
        if (amount <= 0) continue
        const channel = normalizePaymentChannel(row.method)
        buckets[channel].amount += amount
        buckets[channel].count += 1
      }
      continue
    }

    const methods = resolveSalePaymentMethods(s)
    if (!methods.length) continue

    const gross = sales
      .filter((x) => {
        const hid = x.id.includes(':') ? x.id.slice(0, x.id.indexOf(':')) : x.id
        return hid === headerId
      })
      .reduce((sum, x) => sum + (x.totalAmount || 0), 0)

    if (gross <= 0) continue
    const share = gross / methods.length
    for (const m of methods) {
      const channel = normalizePaymentChannel(m)
      buckets[channel].amount += share
      buckets[channel].count += 1
    }
  }

  return toRows(buckets)
}