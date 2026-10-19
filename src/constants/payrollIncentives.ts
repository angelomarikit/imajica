/** Shared incentive rates shown on payslips (must stay transparent & consistent). */

/** Staff take-home on tagged checkout sales */
export const STAFF_SALES_COMMISSION_RATE = 0.005

/** Clinic manager (per clinic) and Operations Manager (org-wide) — 1% of paid sales */
export const CLINIC_MANAGER_COMMISSION_RATE = 0.01
/** Same 1% rate; OM applies it across all clinics */
export const OPERATIONS_MANAGER_COMMISSION_RATE = CLINIC_MANAGER_COMMISSION_RATE

/** When branch hits ₱2M paid sales in the month, one shared 1% pool is spread across the team (not 1% each). */
export const BRANCH_SALES_MILESTONE = 2_000_000
export const MILESTONE_SPLIT_RATE = 0.01

/**
 * 2M milestone share is only paid on this calendar day each month (Manila).
 * Shorter months (e.g. February) use the last day of the month.
 */
export const MILESTONE_PAYOUT_DAY = 30

/** Perfect attendance (no late / no absent) for the month */
export const ATTENDANCE_INCENTIVE_AMOUNT = 1000

/**
 * OT starts after this Manila clock time (past regular 7:00 PM shift end).
 * Pay = (daily basic ÷ 480 minutes) × OT minutes.
 */
export const OVERTIME_START_HOUR = 19
export const OVERTIME_START_MINUTE = 30
/** Paid workday minutes used for OT & late: 8 hours × 60 */
export const PAID_WORKDAY_MINUTES = 480

/**
 * Semi-monthly pay cuts (Manila calendar):
 * - 1st cut (1–15): basic pay only − late/absent + OT
 * - 2nd cut (16–end): basic + incentives, commission, allowance (and monthly benefits/statutory)
 */
export function isSecondSemiMonthlyCut(periodFrom: string, periodTo: string): boolean {
  const from = new Date(`${periodFrom}T12:00:00+08:00`)
  const to = new Date(`${periodTo}T12:00:00+08:00`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false
  const sameMonth =
    from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()
  const dayFrom = from.getDate()
  const dayTo = to.getDate()
  // Full-month view behaves like the 2nd cut (includes all incentives)
  if (sameMonth && dayFrom <= 1 && dayTo >= 28) return true
  return dayTo >= 16
}

export function isFirstSemiMonthlyCut(periodFrom: string, periodTo: string): boolean {
  if (!periodFrom || !periodTo) return false
  return !isSecondSemiMonthlyCut(periodFrom, periodTo)
}

/** Full calendar month bounds for the period’s “To” month (used to pay all month incentives on 2nd cut). */
export function monthBoundsForPeriod(periodTo: string): { from: string; to: string } {
  const month = (periodTo || '').slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { from: periodTo, to: periodTo }
  }
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y!, m!, 0)).getUTCDate()
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, '0')}`,
  }
}

/** YYYY-MM-DD payout date for a milestone month (day 30, or last day if shorter). */
export function milestonePayoutDateKey(periodMonth: string): string {
  const [y, m] = periodMonth.split('-').map(Number)
  const year = y || 1970
  const month = m || 1
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const day = Math.min(MILESTONE_PAYOUT_DAY, lastDay)
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** True when the pay period covers the monthly 2M payout day. */
export function periodIncludesMilestonePayout(
  periodFrom: string,
  periodTo: string,
  periodMonth?: string,
): boolean {
  const month = (periodMonth || periodTo || periodFrom || '').slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(month)) return false
  const payout = milestonePayoutDateKey(month)
  return periodFrom <= payout && periodTo >= payout
}

/** True when the 2M share for that month is already releasable (as-of ≥ payout day). */
export function isMilestonePayoutReleased(
  periodMonth: string,
  asOfDateKey: string,
): boolean {
  if (!/^\d{4}-\d{2}$/.test(periodMonth)) return false
  return asOfDateKey >= milestonePayoutDateKey(periodMonth)
}
