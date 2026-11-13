import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { cashBusinessDayBounds } from '@/services/cashDrawerService'

export type BranchDashboardSalesSummary = {
  ok: boolean
  error?: string
  branchId: string
  from: string
  to: string
  today: string
  /** Clinic-recognized (doctor procedure = clinic net). */
  rangeSales: number
  /** Gross customer paid (sum total_amount). */
  rangeGross: number
  rangeCount: number
  todaySales: number
  todayGross: number
  todayCount: number
  monthSales: number
  monthGross: number
  monthLabel: string
  patients: number
  bookings: number
  /** Doctor fees on doctor's-procedure sales in range. */
  doctorFees: number
  latestSaleDate: string | null
}

export type OrgBranchSalesRow = {
  branchId: string
  branchName: string
  clinicNet: number
  gross: number
  todayClinicNet: number
  todayGross: number
  monthClinicNet: number
  monthGross: number
  cashToday: number
  saleCount: number
  bookingCount: number
  patientCount: number
  doctorFees: number
}

export type OrgDashboardSalesByBranch = {
  ok: boolean
  error?: string
  from: string
  to: string
  today: string
  branches: OrgBranchSalesRow[]
}

/** Avoid hammering RPC after 429 — clears on full page reload. */
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
    rangeGross: num(raw.range_gross),
    rangeCount: num(raw.range_count),
    todaySales: num(raw.today_sales),
    todayGross: num(raw.today_gross),
    todayCount: num(raw.today_count),
    monthSales: num(raw.month_sales),
    monthGross: num(raw.month_gross),
    monthLabel: String(raw.month_label ?? ''),
    patients: num(raw.patients),
    bookings: num(raw.bookings),
    doctorFees: num(raw.doctor_fees),
    latestSaleDate: raw.latest_sale_date ? String(raw.latest_sale_date) : null,
  }
}

export type DashboardRpcResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string }
  | { status: 'loading' }

/**
 * Server-side dashboard totals for one clinic.
 * No localStorage fallback — caller must surface errors.
 */
export async function fetchBranchDashboardSalesSummary(input: {
  branchId: string
  from: string
  to: string
  today?: string
}): Promise<DashboardRpcResult<BranchDashboardSalesSummary>> {
  if (!isSupabaseConfigured || !supabase || !input.branchId) {
    return { status: 'error', message: 'Supabase is not configured' }
  }

  const coolKey = `branch:${input.branchId}`
  const cool = cooldownUntil.get(coolKey) ?? 0
  if (cool > Date.now()) {
    return { status: 'error', message: 'Sales summary temporarily rate-limited. Try again shortly.' }
  }

  const { data, error } = await supabase.rpc('branch_dashboard_sales_summary', {
    p_branch_id: input.branchId,
    p_from: input.from,
    p_to: input.to,
    p_today: input.today || undefined,
  })

  if (error) {
    const msg = error.message || ''
    if (/429|rate limit|too many/i.test(msg) || (error as { status?: number }).status === 429) {
      cooldownUntil.set(coolKey, Date.now() + 60_000)
      return { status: 'error', message: 'Sales summary rate-limited. Try again in a minute.' }
    }
    console.error('[dashboard] sales summary rpc failed', msg)
    return { status: 'error', message: msg || 'Could not load sales from server' }
  }
  if (!data || typeof data !== 'object') {
    return { status: 'error', message: 'Could not load sales from server' }
  }
  const mapped = mapSummary(data as Record<string, unknown>)
  if (!mapped.ok) {
    return {
      status: 'error',
      message: mapped.error || 'Not allowed to load sales for this branch',
    }
  }
  return { status: 'ok', data: mapped }
}

/**
 * HQ / OM All Branches — per-clinic clinic_net + gross from Supabase only.
 */
export async function fetchOrgDashboardSalesByBranch(input: {
  from: string
  to: string
  today?: string
}): Promise<DashboardRpcResult<OrgDashboardSalesByBranch>> {
  if (!isSupabaseConfigured || !supabase) {
    return { status: 'error', message: 'Supabase is not configured' }
  }

  const coolKey = 'org:by-branch'
  const cool = cooldownUntil.get(coolKey) ?? 0
  if (cool > Date.now()) {
    return { status: 'error', message: 'Org sales temporarily rate-limited. Try again shortly.' }
  }

  const { data, error } = await supabase.rpc('org_dashboard_sales_by_branch', {
    p_from: input.from,
    p_to: input.to,
    p_today: input.today || undefined,
  })

  if (error) {
    const msg = error.message || ''
    if (/429|rate limit|too many/i.test(msg) || (error as { status?: number }).status === 429) {
      cooldownUntil.set(coolKey, Date.now() + 60_000)
      return { status: 'error', message: 'Org sales rate-limited. Try again in a minute.' }
    }
    console.error('[dashboard] org sales by branch rpc failed', msg)
    return { status: 'error', message: msg || 'Could not load branch sales from server' }
  }
  if (!data || typeof data !== 'object') {
    return { status: 'error', message: 'Could not load branch sales from server' }
  }
  const raw = data as Record<string, unknown>
  if (raw.ok === false) {
    return {
      status: 'error',
      message: typeof raw.error === 'string' ? raw.error : 'Not allowed to load org sales',
    }
  }
  const branchesRaw = Array.isArray(raw.branches) ? raw.branches : []
  const branches: OrgBranchSalesRow[] = branchesRaw.map((row) => {
    const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>
    return {
      branchId: String(r.branch_id ?? ''),
      branchName: String(r.branch_name ?? ''),
      clinicNet: num(r.clinic_net),
      gross: num(r.gross),
      todayClinicNet: num(r.today_clinic_net),
      todayGross: num(r.today_gross),
      monthClinicNet: num(r.month_clinic_net),
      monthGross: num(r.month_gross),
      cashToday: num(r.cash_today),
      saleCount: num(r.sale_count),
      bookingCount: num(r.booking_count),
      patientCount: num(r.patient_count),
      doctorFees: num(r.doctor_fees),
    }
  })
  return {
    status: 'ok',
    data: {
      ok: true,
      from: String(raw.from ?? input.from),
      to: String(raw.to ?? input.to),
      today: String(raw.today ?? input.today ?? ''),
      branches,
    },
  }
}

/**
 * Physical cash collected in the till for one clinic over a cash business day
 * (8:00 AM Manila window). No local fallback — null means unavailable.
 */
export async function fetchBranchCashCollected(input: {
  branchId: string
  /** Cash business date key YYYY-MM-DD (8am Manila day). */
  cashDay: string
}): Promise<number | null> {
  if (!isSupabaseConfigured || !supabase || !input.branchId || !input.cashDay) return null

  const coolKey = `cash:${input.branchId}`
  const cool = cooldownUntil.get(coolKey) ?? 0
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
      cooldownUntil.set(coolKey, Date.now() + 60_000)
      console.warn('[dashboard] cash collected rate-limited')
      return null
    }
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
