import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { ensureBranchOpsSales, getSales } from '@/services/salesService'
import type { PaymentMethod, Sale } from '@/types'

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
): { channels: PaymentChannelRow[]; total: number; txnCount: number } {
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

/**
 * Sum customer-paid amounts by payment channel (actual `payments` rows).
 * Uses 100% paid amounts (not clinic net after doctor's fee).
 *
 * Loads sale headers first (same pattern as Franchise Sales), then payments —
 * nested PostgREST filters on payments→sales were returning empty under RLS.
 */
export async function fetchPaymentChannelsReport(input: {
  from: string
  to: string
  /** Clinic UUID, or omit / null for all branches (HQ). */
  branchId?: string | null
}): Promise<{ channels: PaymentChannelRow[]; total: number; txnCount: number }> {
  const fromDay = input.from.slice(0, 10)
  const toDay = input.to.slice(0, 10)
  if (!fromDay || !toDay) {
    return { channels: toRows(emptyBuckets()).channels, total: 0, txnCount: 0 }
  }

  if (isSupabaseConfigured && supabase) {
    const toExclusive = (() => {
      const d = new Date(`${toDay}T00:00:00+08:00`)
      d.setDate(d.getDate() + 1)
      return d.toISOString()
    })()
    const fromInclusive = `${fromDay}T00:00:00+08:00`
    const buckets = emptyBuckets()

    const saleIds: string[] = []
    const pageSize = 500
    for (let from = 0; from < 20_000; from += pageSize) {
      let query = supabase
        .from('sales')
        .select('id')
        .gte('created_at', fromInclusive)
        .lt('created_at', toExclusive)
        .or('lead_source.is.null,lead_source.neq.Migration')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1)

      if (input.branchId) {
        query = query.eq('branch_id', input.branchId)
      }

      const { data, error } = await query
      if (error) {
        console.error('[payment-channels] sales fetch failed', error.message)
        break
      }
      const rows = (data ?? []) as Array<{ id: string }>
      if (!rows.length) break
      for (const r of rows) saleIds.push(r.id)
      if (rows.length < pageSize) break
    }

    if (!saleIds.length) {
      return toRows(buckets)
    }

    const chunkSize = 200
    for (let i = 0; i < saleIds.length; i += chunkSize) {
      const chunk = saleIds.slice(i, i + chunkSize)
      const { data, error } = await supabase
        .from('payments')
        .select('payment_method, payment_amount, payment_status')
        .in('sale_id', chunk)

      if (error) {
        console.error('[payment-channels] payments fetch failed', error.message)
        continue
      }

      for (const row of (data ?? []) as Array<{
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
      }
    }

    return toRows(buckets)
  }

  await ensureBranchOpsSales({
    branchId: input.branchId || undefined,
    from: fromDay,
    to: toDay,
    syncClients: false,
  })
  return paymentChannelsFromSales(getSales(), fromDay, toDay, input.branchId || undefined)
}

/** Fallback aggregation from hydrated Sale lines (no per-split amounts). */
export function paymentChannelsFromSales(
  sales: Sale[],
  from: string,
  to: string,
  branchId?: string,
): { channels: PaymentChannelRow[]; total: number; txnCount: number } {
  const buckets = emptyBuckets()
  const seenHeaders = new Set<string>()

  for (const s of sales) {
    const day = s.createdAt.slice(0, 10)
    if (day < from || day > to) continue
    if (branchId && s.branchId !== branchId) continue
    if ((s.leadSource || '') === 'Migration') continue

    const headerId = s.id.includes(':') ? s.id.slice(0, s.id.indexOf(':')) : s.id
    if (seenHeaders.has(headerId)) continue
    seenHeaders.add(headerId)

    const methods: PaymentMethod[] =
      s.paymentMethods && s.paymentMethods.length
        ? s.paymentMethods
        : s.paymentMethod
          ? [s.paymentMethod]
          : ['cash']

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
