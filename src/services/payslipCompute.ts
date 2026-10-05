import type { AttendancePayrollRow } from '@/services/payrollAttendanceService'
import {
  ATTENDANCE_INCENTIVE_AMOUNT,
  BRANCH_SALES_MILESTONE,
  CLINIC_MANAGER_COMMISSION_RATE,
  MILESTONE_SPLIT_RATE,
  STAFF_SALES_COMMISSION_RATE,
} from '@/constants/payrollIncentives'

export type PayslipLineKind =
  | 'earning'
  | 'incentive'
  | 'deduction'
  | 'info'

export type PayslipLine = {
  id: string
  kind: PayslipLineKind
  label: string
  /** Human-readable formula / rule so payroll stays transparent */
  computation: string
  amount: number
  /** Info lines show 0 in totals but still explain eligibility */
  includeInTotal?: boolean
}

export type PayslipIncentiveBundle = {
  staffSalesAmount: number
  staffSalesCommission: number
  managerBranchSales: number
  managerCommission: number
  isClinicManager: boolean
  milestoneSales: number
  milestoneReached: boolean
  milestonePool: number
  milestoneTeamSize: number
  milestoneShare: number
  attendanceIncentive: number
  attendanceEligible: boolean
  attendanceLateDays: number
  attendanceAbsentDays: number
  planBAmount: number
  planBNotes: string
}

export type BuiltPayslip = {
  periodFrom: string
  periodTo: string
  periodLabel: string
  employeeName: string
  jobTitle: string
  branchName: string
  email: string
  employeeCode?: string
  matchedUserId: string | null
  lines: PayslipLine[]
  grossEarnings: number
  totalIncentives: number
  totalDeductions: number
  netPay: number
  incentives: PayslipIncentiveBundle
  /** Snapshot of attendance payroll base row */
  base: AttendancePayrollRow
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function formatPeriodLabel(from: string, to: string) {
  try {
    const a = new Date(`${from}T12:00:00`)
    const b = new Date(`${to}T12:00:00`)
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
    return `${a.toLocaleDateString('en-US', opts)} – ${b.toLocaleDateString('en-US', opts)}`
  } catch {
    return `${from} – ${to}`
  }
}

export function buildPayslipDocument(input: {
  row: AttendancePayrollRow
  periodFrom: string
  periodTo: string
  incentives: PayslipIncentiveBundle
}): BuiltPayslip {
  const { row, periodFrom, periodTo, incentives: inc } = input
  const e = row.employee
  const lines: PayslipLine[] = []

  lines.push({
    id: 'base',
    kind: 'earning',
    label: 'Basic pay (days present)',
    computation: `${row.daysPresent} day(s) × ${e.salaryPerDay.toLocaleString('en-PH', {
      style: 'currency',
      currency: 'PHP',
    })}/day`,
    amount: round2(row.grossPay),
  })

  // Always show staff commission so HR can see the same base as My Commission (even ₱0)
  lines.push({
    id: 'staff-commission',
    kind: inc.staffSalesCommission > 0 ? 'incentive' : 'info',
    label: 'Staff sales commission (0.5%)',
    computation:
      inc.staffSalesAmount > 0
        ? `${inc.staffSalesAmount.toLocaleString('en-PH', {
            style: 'currency',
            currency: 'PHP',
          })} tagged paid sales (My Commission) × ${(STAFF_SALES_COMMISSION_RATE * 100).toFixed(1)}%`
        : `No tagged paid sales in this period × ${(STAFF_SALES_COMMISSION_RATE * 100).toFixed(1)}%`,
    amount: round2(inc.staffSalesCommission),
    includeInTotal: inc.staffSalesCommission > 0,
  })

  if (inc.isClinicManager) {
    lines.push({
      id: 'manager-commission',
      kind: 'incentive',
      label: 'Clinic manager commission (1%)',
      computation: `${inc.managerBranchSales.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
      })} branch paid sales × ${(CLINIC_MANAGER_COMMISSION_RATE * 100).toFixed(0)}%`,
      amount: round2(inc.managerCommission),
    })
  }

  if (inc.milestoneReached) {
    lines.push({
      id: 'milestone-split',
      kind: 'incentive',
      label: '2M milestone team split (1%)',
      computation: `Branch hit ₱${(BRANCH_SALES_MILESTONE / 1_000_000).toFixed(0)}M · pool ${inc.milestonePool.toLocaleString(
        'en-PH',
        { style: 'currency', currency: 'PHP' },
      )} (${(MILESTONE_SPLIT_RATE * 100).toFixed(0)}% of ${inc.milestoneSales.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
      })}) ÷ ${inc.milestoneTeamSize} teammates`,
      amount: round2(inc.milestoneShare),
    })
  } else {
    lines.push({
      id: 'milestone-locked',
      kind: 'info',
      label: '2M milestone team split',
      computation: `Unlocks when branch paid sales ≥ ₱${BRANCH_SALES_MILESTONE.toLocaleString(
        'en-PH',
      )} this month (now ${inc.milestoneSales.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
      })})`,
      amount: 0,
      includeInTotal: false,
    })
  }

  lines.push({
    id: 'attendance-incentive',
    kind: inc.attendanceEligible ? 'incentive' : 'info',
    label: 'Attendance incentive',
    computation: inc.attendanceEligible
      ? `₱${ATTENDANCE_INCENTIVE_AMOUNT.toLocaleString('en-PH')} — no lates and no absences this month`
      : `Not earned (${inc.attendanceLateDays} late day(s), ${inc.attendanceAbsentDays} absent) — requires ₱${ATTENDANCE_INCENTIVE_AMOUNT.toLocaleString(
          'en-PH',
        )} perfect attendance`,
    amount: round2(inc.attendanceIncentive),
    includeInTotal: inc.attendanceEligible,
  })

  if (inc.planBAmount > 0) {
    lines.push({
      id: 'plan-b',
      kind: 'incentive',
      label: 'Plan B incentive',
      computation: inc.planBNotes || 'KPI / Plan B amount entered by clinic manager or HQ',
      amount: round2(inc.planBAmount),
    })
  }

  lines.push({
    id: 'late',
    kind: 'deduction',
    label: 'Late deduction',
    computation: `${row.lateMinutes} minute(s) × (salary/day ÷ scheduled minutes)`,
    amount: -round2(row.lateDeduction),
  })
  lines.push({
    id: 'undertime',
    kind: 'deduction',
    label: 'Undertime deduction',
    computation: `${row.undertimeMinutes} minute(s) × (salary/day ÷ scheduled minutes)`,
    amount: -round2(row.undertimeDeduction),
  })
  lines.push({
    id: 'sss',
    kind: 'deduction',
    label: 'SSS + MPF (employee share)',
    computation: 'Prorated from monthly sheet contribution for days in period',
    amount: -round2(row.sssDeduction),
  })
  lines.push({
    id: 'pagibig',
    kind: 'deduction',
    label: 'Pag-IBIG (employee share)',
    computation: 'Prorated from monthly sheet contribution for days in period',
    amount: -round2(row.pagibigDeduction),
  })
  lines.push({
    id: 'philhealth',
    kind: 'deduction',
    label: 'PhilHealth (employee share)',
    computation: 'Prorated from monthly sheet contribution for days in period',
    amount: -round2(row.philhealthDeduction),
  })
  if (row.otherDeduction > 0) {
    lines.push({
      id: 'other-deduction',
      kind: 'deduction',
      label: 'Other recurring deduction',
      computation: 'HR-set monthly other deduction, prorated for days in period',
      amount: -round2(row.otherDeduction),
    })
  }
  if (row.allowance > 0) {
    lines.push({
      id: 'allowance',
      kind: 'earning',
      label: 'Recurring allowance',
      computation: 'HR-set monthly allowance / benefit, prorated for days in period',
      amount: round2(row.allowance),
    })
  }

  const grossEarnings = round2(row.grossPay + (row.allowance || 0))
  const totalIncentives = round2(
    (inc.staffSalesCommission || 0) +
      (inc.managerCommission || 0) +
      (inc.milestoneShare || 0) +
      (inc.attendanceIncentive || 0) +
      (inc.planBAmount || 0),
  )
  const totalDeductions = round2(
    row.lateDeduction +
      row.undertimeDeduction +
      row.sssDeduction +
      row.pagibigDeduction +
      row.philhealthDeduction +
      (row.otherDeduction || 0),
  )
  const netPay = round2(grossEarnings + totalIncentives - totalDeductions)

  return {
    periodFrom: periodFrom,
    periodTo: periodTo,
    periodLabel: formatPeriodLabel(periodFrom, periodTo),
    employeeName: e.fullName,
    jobTitle: e.jobTitle,
    branchName: e.branchLabel,
    email: e.email,
    matchedUserId: row.matchedUserId,
    lines,
    grossEarnings,
    totalIncentives,
    totalDeductions,
    netPay,
    incentives: inc,
    base: row,
  }
}

/** Recalculate totals after HR edits line amounts (before send). */
export function recomputePayslipTotals(payslip: BuiltPayslip): BuiltPayslip {
  const lines = payslip.lines.map((line) => ({
    ...line,
    amount: round2(Number(line.amount) || 0),
  }))

  const grossEarnings = round2(
    lines
      .filter((l) => l.kind === 'earning' && l.includeInTotal !== false)
      .reduce((s, l) => s + l.amount, 0),
  )
  const totalIncentives = round2(
    lines
      .filter((l) => l.kind === 'incentive' && l.includeInTotal !== false)
      .reduce((s, l) => s + l.amount, 0),
  )
  const deductionRaw = lines
    .filter((l) => l.kind === 'deduction')
    .reduce((s, l) => s + l.amount, 0)
  // Deduction lines are stored as negatives; totalDeductions is the positive sum withheld
  const totalDeductions = round2(Math.abs(deductionRaw))
  const netPay = round2(grossEarnings + totalIncentives - totalDeductions)

  return {
    ...payslip,
    lines,
    grossEarnings,
    totalIncentives,
    totalDeductions,
    netPay,
  }
}

/** Update one line (amount and/or computation note), then recompute totals. */
export function patchPayslipLine(
  payslip: BuiltPayslip,
  lineId: string,
  patch: { amount?: number; computation?: string; label?: string },
): BuiltPayslip {
  const lines = payslip.lines.map((line) => {
    if (line.id !== lineId) return line
    const next = { ...line }
    if (patch.amount !== undefined) {
      let amount = round2(Number(patch.amount) || 0)
      // Keep deduction convention: negative amounts
      if (line.kind === 'deduction' && amount > 0) amount = -amount
      next.amount = amount
      // Promoting an info line with a real amount so it counts as an incentive
      if (line.kind === 'info' && amount !== 0) {
        next.kind = 'incentive'
        next.includeInTotal = true
      }
    }
    if (patch.computation !== undefined) next.computation = patch.computation
    if (patch.label !== undefined) next.label = patch.label
    return next
  })
  return recomputePayslipTotals({ ...payslip, lines })
}
