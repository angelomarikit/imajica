import { isSupabaseConfigured, supabase } from '@/lib/supabase'

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

  const { data, error } = await supabase.rpc('branch_dashboard_sales_summary', {
    p_branch_id: input.branchId,
    p_from: input.from,
    p_to: input.to,
    p_today: input.today || undefined,
  })

  if (error) {
    console.error('[dashboard] sales summary rpc failed', error.message)
    return null
  }
  if (!data || typeof data !== 'object') return null
  const mapped = mapSummary(data as Record<string, unknown>)
  if (!mapped.ok) {
    console.error('[dashboard] sales summary denied', mapped.error)
    return null
  }
  return mapped
}
