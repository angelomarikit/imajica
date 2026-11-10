import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { cashBusinessDayBounds } from '@/services/cashDrawerService'

export type BranchDashboardSalesSummary = {
  ok: boolean
  error?: string
  branchId: string
  from: string
  to: string
  today: string
  rangeSales: number
  rangeCount: number
  todaySales: number
  todayCount: number
  monthSales: number
  monthLabel: string
  patients: number
  bookings: number
  latestSaleDate: string | null
}

/** Avoid hammering RPC after "not allowed" / 429 — clears on full page reload. */
const deniedBranchIds = new Set<string>()
const cooldownUntil = new Map<string, number>()

function num(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function mapSummary(raw: Record<string, unknown>): BranchDashboardSalesSummary {
  return {
    ok: raw.ok !== false,
    error: typeof raw.error === 'string' ? raw.error : undefined,
    branchId: String(raw.branch_id ?? ''),
    from: String(raw.from ?? ''),
    to: String(raw.to ?? ''),
    today: String(raw.today ?? ''),
    rangeSales: num(raw.range_sales),
    rangeCount: num(raw.range_count),
    todaySales: num(raw.today_sales),
    todayCount: num(raw.today_count),
    monthSales: num(raw.month_sales),
    monthLabel: String(raw.month_label ?? ''),
    patients: num(raw.patients),
    bookings: num(raw.bookings),
    latestSaleDate: raw.latest_sale_date ? String(raw.latest_sale_date) : null,
  }
}

/**
 * Server-side dashboard totals for one clinic (migration history + live checkouts).
 * Avoids downloading every sale_item row into the browser.
 */
export async function fetchBranchDashboardSalesSummary(input: {
  branchId: string
  from: string
  to: string
  today?: string
}): Promise<BranchDashboardSalesSummary | null> {
  if (!isSupabaseConfigured || !supabase || !input.branchId) return null

  if (deniedBranchIds.has(input.branchId)) {
    return null
  }
  const cool = cooldownUntil.get(input.branchId) ?? 0
  if (cool > Date.now()) {
    return null
  }

  const { data, error } = await supabase.rpc('branch_dashboard_sales_summary', {
    p_branch_id: input.branchId,
    p_from: input.from,
    p_to: input.to,
    p_today: input.today || undefined,
  })

  if (error) {
    const msg = error.message || ''
    // 429 / rate limit — back off this branch for 60s
    if (/429|rate limit|too many/i.test(msg) || (error as { status?: number }).status === 429) {
      cooldownUntil.set(input.branchId, Date.now() + 60_000)
      console.warn('[dashboard] sales summary rate-limited; using local sales for 60s')
      return null
    }
    console.error('[dashboard] sales summary rpc failed', msg)
    return null
  }
  if (!data || typeof data !== 'object') return null
  const mapped = mapSummary(data as Record<string, unknown>)
  if (!mapped.ok) {
    // Permanent for this session until role/branch is fixed in DB
    if (/not allowed/i.test(mapped.error || '')) {
      deniedBranchIds.add(input.branchId)
      console.warn(
        '[dashboard] sales summary denied for this branch — check user_roles.branch_id for this login (run migration 20261022000094). Falling back to local sales.',
        mapped.error,
      )
      return null
    }
    console.error('[dashboard] sales summary denied', mapped.error)
    return null
  }
  return mapped
}

/**
 * Physical cash collected in the till for one clinic over a cash business day
 * (8:00 AM Manila window). Sums payments.payment_amount where method is cash —
 * includes Medical Procedure at full cash collected (not clinic net).
 */
export async function fetchBranchCashCollected(input: {
  branchId: string
  /** Cash business date key YYYY-MM-DD (8am Manila day). */
  cashDay: string
}): Promise<number | null> {
  if (!isSupabaseConfigured || !supabase || !input.branchId || !input.cashDay) return null

  if (deniedBranchIds.has(input.branchId)) return null
  const cool = cooldownUntil.get(input.branchId) ?? 0
  if (cool > Date.now()) return null

  const { fromIso, toIso } = cashBusinessDayBounds(input.cashDay)
  const { data, error } = await supabase.rpc('branch_cash_collected', {
    p_branch_id: input.branchId,
    p_from: fromIso,
    p_to: toIso,
  })

  if (error) {
    const msg = error.message || ''
    if (/429|rate limit|too many/i.test(msg) || (error as { status?: number }).status === 429) {
      cooldownUntil.set(input.branchId, Date.now() + 60_000)
      console.warn('[dashboard] cash collected rate-limited; using local sales for 60s')
      return null
    }
    // Missing RPC on older projects — fall back to client-side cash sum
    if (/could not find|does not exist|PGRST202/i.test(msg)) {
      console.warn('[dashboard] branch_cash_collected missing — apply migration 20261111000105')
      return null
    }
    console.error('[dashboard] cash collected rpc failed', msg)
    return null
  }
  const n = Number(data)
  return Number.isFinite(n) ? n : 0
}
