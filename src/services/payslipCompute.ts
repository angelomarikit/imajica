import type { AttendancePayrollRow } from '@/services/payrollAttendanceService'
import { latePerMinuteRate } from '@/services/payrollAttendanceService'
import {
  ATTENDANCE_INCENTIVE_AMOUNT,
  BRANCH_SALES_MILESTONE,
  CLINIC_MANAGER_COMMISSION_RATE,
  MILESTONE_PAYOUT_DAY,
  OVERTIME_START_HOUR,
  OVERTIME_START_MINUTE,
  PAID_WORKDAY_MINUTES,
  STAFF_SALES_COMMISSION_RATE,
} from '@/constants/payrollIncentives'
import { STANDARD_WORK_HOURS_PER_DAY } from '@/constants/payrollRosterSeed'

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
  /** Operations Manager 1% on org-wide (or scoped) paid sales */
  isOperationsManager: boolean
  milestoneSales: number
  milestoneReached: boolean
  milestonePool: number
  milestoneTeamSize: number
  milestoneShare: number
  /** Operations Manager (and similar) are not in the clinic 2M pool */
  milestoneExcluded: boolean
  /** Pay period covers the monthly payout day (30th) */
  milestonePayoutEligible: boolean
  milestonePayoutDate: string
  milestonePayoutDay: number
  attendanceIncentive: number
  attendanceEligible: boolean
  attendanceLateDays: number
  attendanceAbsentDays: number
  planBAmount: number
  planBNotes: string
  /** 1st cut (1–15): incentives/commission deferred to 16–end */
  incentivesDeferredToSecondCut: boolean
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

  if (row.overtimePay > 0 || row.overtimeMinutes > 0) {
    const perMin = latePerMinuteRate(e.salaryPerDay)
    const otLabel = `${OVERTIME_START_HOUR % 12 || 12}:${String(OVERTIME_START_MINUTE).padStart(2, '0')} ${OVERTIME_START_HOUR >= 12 ? 'PM' : 'AM'}`
    lines.push({
      id: 'overtime',
      kind: 'earning',
      label: 'Overtime pay',
      computation: `(₱${e.salaryPerDay.toLocaleString('en-PH')} ÷ ${PAID_WORKDAY_MINUTES} min) × ${row.overtimeMinutes} OT min after ${otLabel} = ₱${perMin.toFixed(4)}/min`,
      amount: round2(row.overtimePay),
    })
  }

  if (inc.incentivesDeferredToSecondCut) {
    lines.push({
      id: 'incentives-deferred',
      kind: 'info',
      label: 'Incentives & commission (deferred)',
      computation:
        '1st cut (1–15) is basic pay only (− late/absent + OT). Commission, Plan B, attendance incentive, 2M split, and allowance pay on the 2nd cut (16–30/31)',
      amount: 0,
      includeInTotal: false,
    })
  } else {
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
            })} tagged paid sales this month (My Commission) × ${(STAFF_SALES_COMMISSION_RATE * 100).toFixed(1)}%`
          : `No tagged paid sales this month × ${(STAFF_SALES_COMMISSION_RATE * 100).toFixed(1)}%`,
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
        })} branch paid sales this month × ${(CLINIC_MANAGER_COMMISSION_RATE * 100).toFixed(0)}%`,
        amount: round2(inc.managerCommission),
      })
    } else if (inc.isOperationsManager) {
      lines.push({
        id: 'om-commission',
        kind: 'incentive',
        label: 'Operations manager commission (1%)',
        computation: `${inc.managerBranchSales.toLocaleString('en-PH', {
          style: 'currency',
          currency: 'PHP',
        })} all-clinic paid sales this month × ${(CLINIC_MANAGER_COMMISSION_RATE * 100).toFixed(0)}%`,
        amount: round2(inc.managerCommission),
      })
    }

    if (inc.milestoneExcluded) {
      lines.push({
        id: 'milestone-locked',
        kind: 'info',
        label: '2M milestone team split',
        computation:
          'Not included — Operations Manager is paid via 1% org commission, not the clinic 2M team split',
        amount: 0,
        includeInTotal: false,
      })
    } else if (inc.milestoneReached && inc.milestonePayoutEligible && inc.milestoneShare > 0) {
      lines.push({
        id: 'milestone-split',
        kind: 'incentive',
        label: '2M milestone team split (1%)',
        computation: `Paid on the ${MILESTONE_PAYOUT_DAY}th · branch hit ₱${(BRANCH_SALES_MILESTONE / 1_000_000).toFixed(0)}M · shared 1% pool ${inc.milestonePool.toLocaleString(
          'en-PH',
          { style: 'currency', currency: 'PHP' },
        )} spread by day among staff who timed in`,
        amount: round2(inc.milestoneShare),
      })
    } else if (inc.milestoneReached && !inc.milestonePayoutEligible) {
      lines.push({
        id: 'milestone-locked',
        kind: 'info',
        label: '2M milestone team split',
        computation: `Branch unlocked ₱2M this month, but share is paid only on the ${MILESTONE_PAYOUT_DAY}th (${inc.milestonePayoutDate})`,
        amount: 0,
        includeInTotal: false,
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
        })}). Share is paid once on the ${MILESTONE_PAYOUT_DAY}th among staff who timed in.`,
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
  }

  const perMin = latePerMinuteRate(e.salaryPerDay)
  lines.push({
    id: 'late',
    kind: 'deduction',
    label: 'Late deduction',
    computation: `${row.lateMinutes} min × ((₱${e.salaryPerDay.toLocaleString('en-PH')} ÷ ${STANDARD_WORK_HOURS_PER_DAY} hrs ÷ 60) = ₱${perMin.toFixed(4)}/min)`,
    amount: -round2(row.lateDeduction),
  })
  lines.push({
    id: 'undertime',
    kind: 'deduction',
    label: 'Undertime deduction',
    computation: `${row.undertimeMinutes} min × (daily wage ÷ ${STANDARD_WORK_HOURS_PER_DAY} hrs ÷ 60)`,
    amount: -round2(row.undertimeDeduction),
  })

  if (row.isSecondCut) {
    lines.push({
      id: 'sss',
      kind: 'deduction',
      label: 'SSS + MPF (employee share)',
      computation: 'Full monthly employee share — deducted on 2nd cut (16–30/31)',
      amount: -round2(row.sssDeduction),
    })
    lines.push({
      id: 'pagibig',
      kind: 'deduction',
      label: 'Pag-IBIG (employee share)',
      computation: 'Full monthly employee share — deducted on 2nd cut (16–30/31)',
      amount: -round2(row.pagibigDeduction),
    })
    lines.push({
      id: 'philhealth',
      kind: 'deduction',
      label: 'PhilHealth (employee share)',
      computation: 'Full monthly employee share — deducted on 2nd cut (16–30/31)',
      amount: -round2(row.philhealthDeduction),
    })
    if (row.otherDeduction > 0) {
      lines.push({
        id: 'other-deduction',
        kind: 'deduction',
        label: 'Other recurring deduction',
        computation: 'HR-set monthly other deduction — 2nd cut',
        amount: -round2(row.otherDeduction),
      })
    }
  } else {
    lines.push({
      id: 'statutory-deferred',
      kind: 'info',
      label: 'SSS / Pag-IBIG / PhilHealth',
      computation: 'Deferred to 2nd cut (16–30/31) — 1st cut is basic pay only',
      amount: 0,
      includeInTotal: false,
    })
  }

  const benefitLines = e.benefits ?? []
  const benefitsMonthlyTotal = benefitLines.reduce(
    (s, b) => s + Math.max(0, Number(b.monthlyCost) || 0),
    0,
  )
  if (benefitLines.length > 0) {
    if (row.benefitsAppliedThisPeriod) {
      for (const b of benefitLines) {
        lines.push({
          id: `benefit-${b.id}`,
          kind: 'deduction',
          label: `Benefit: ${b.name}`,
          computation:
            'Full monthly cost — deducted once this month on 2nd semi-monthly pay (not split across both pays)',
          amount: -round2(b.monthlyCost),
        })
      }
    } else {
      lines.push({
        id: 'benefits-deferred',
        kind: 'info',
        label: 'Monthly benefits (Employee Database)',
        computation: `₱${benefitsMonthlyTotal.toLocaleString('en-PH', {
          minimumFractionDigits: 2,
        })} total — deducted only on the 2nd cut (16–30/31)`,
        amount: 0,
        includeInTotal: false,
      })
    }
  }

  if (row.isSecondCut && row.allowance > 0) {
    lines.push({
      id: 'allowance',
      kind: 'earning',
      label: 'Recurring allowance',
      computation: 'HR-set monthly allowance — paid on 2nd cut (16–30/31)',
      amount: round2(row.allowance),
    })
  } else if (!row.isSecondCut && (e.allowance || 0) > 0) {
    lines.push({
      id: 'allowance-deferred',
      kind: 'info',
      label: 'Recurring allowance',
      computation: `₱${Number(e.allowance || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
      })} — paid on 2nd cut (16–30/31), not on this 1st-cut slip`,
      amount: 0,
      includeInTotal: false,
    })
  }

  const grossEarnings = round2(row.grossPay + (row.overtimePay || 0) + (row.allowance || 0))
  const totalIncentives = round2(
    (inc.staffSalesCommission || 0) +
      (inc.isClinicManager || inc.isOperationsManager ? inc.managerCommission || 0 : 0) +
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
      (row.otherDeduction || 0) +
      (row.benefitsDeduction || 0),
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

/**
 * Migration-friendly override: set days present and/or daily rate, then
 * recalculate basic pay amount (days × rate) while leaving other lines alone.
 */
export function applyPayslipBasicOverride(
  payslip: BuiltPayslip,
  patch: { daysPresent?: number; salaryPerDay?: number },
): BuiltPayslip {
  const daysPresent = Math.max(
    0,
    patch.daysPresent != null ? Number(patch.daysPresent) || 0 : payslip.base.daysPresent,
  )
  const salaryPerDay = Math.max(
    0,
    patch.salaryPerDay != null
      ? Number(patch.salaryPerDay) || 0
      : payslip.base.employee.salaryPerDay,
  )
  const grossPay = round2(daysPresent * salaryPerDay)
  const peso = salaryPerDay.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })
  const withLine = patchPayslipLine(payslip, 'base', {
    amount: grossPay,
    computation: `${daysPresent} day(s) × ${peso}/day (manual)`,
  })
  return recomputePayslipTotals({
    ...withLine,
    base: {
      ...withLine.base,
      daysPresent,
      grossPay,
      employee: {
        ...withLine.base.employee,
        salaryPerDay,
      },
    },
  })
}

function lineAmountAbs(payslip: BuiltPayslip, ...ids: string[]): number {
  for (const id of ids) {
    const line = payslip.lines.find((l) => l.id === id)
    if (line) return Math.abs(Number(line.amount) || 0)
  }
  return 0
}

export function getPayslipManualFieldAmounts(payslip: BuiltPayslip) {
  return {
    lateMinutes: payslip.base.lateMinutes,
    lateDeduction: payslip.base.lateDeduction,
    staffCommission: lineAmountAbs(payslip, 'staff-commission'),
    milestoneShare: lineAmountAbs(payslip, 'milestone-split', 'milestone-locked'),
    attendanceIncentive: lineAmountAbs(payslip, 'attendance-incentive'),
  }
}

function upsertIncentiveAmount(
  payslip: BuiltPayslip,
  ids: string[],
  amount: number,
  meta: { label: string; computation: string; preferredId: string },
): BuiltPayslip {
  const value = round2(Math.max(0, Number(amount) || 0))
  const existing = payslip.lines.find((l) => ids.includes(l.id))
  if (!existing) {
    const lines = [
      ...payslip.lines,
      {
        id: meta.preferredId,
        kind: (value > 0 ? 'incentive' : 'info') as PayslipLineKind,
        label: meta.label,
        computation: meta.computation,
        amount: value,
        includeInTotal: value > 0,
      },
    ]
    return recomputePayslipTotals({ ...payslip, lines })
  }
  const lines = payslip.lines.map((line) => {
    if (!ids.includes(line.id)) return line
    return {
      ...line,
      id: meta.preferredId,
      kind: (value > 0 ? 'incentive' : 'info') as PayslipLineKind,
      label: meta.label,
      computation: meta.computation,
      amount: value,
      includeInTotal: value > 0,
    }
  })
  return recomputePayslipTotals({ ...payslip, lines })
}

/**
 * Manual overrides for migration: late minutes, staff commission, 2M milestone,
 * attendance incentive — each updates the matching payslip line / totals.
 */
export function applyPayslipManualOverrides(
  payslip: BuiltPayslip,
  patch: {
    lateMinutes?: number
    staffCommission?: number
    milestoneShare?: number
    attendanceIncentive?: number
  },
): BuiltPayslip {
  let next = payslip

  if (patch.lateMinutes != null) {
    const lateMinutes = Math.max(0, Number(patch.lateMinutes) || 0)
    const rate = latePerMinuteRate(next.base.employee.salaryPerDay)
    const lateDeduction = round2(lateMinutes * rate)
    next = patchPayslipLine(next, 'late', {
      amount: -lateDeduction,
      computation: `${lateMinutes} min × ((₱${next.base.employee.salaryPerDay.toLocaleString('en-PH')} ÷ ${STANDARD_WORK_HOURS_PER_DAY} hrs ÷ 60) = ₱${rate.toFixed(4)}/min) (manual)`,
    })
    next = {
      ...next,
      base: {
        ...next.base,
        lateMinutes,
        lateDeduction,
      },
    }
  }

  if (patch.staffCommission != null) {
    const amount = Math.max(0, Number(patch.staffCommission) || 0)
    next = upsertIncentiveAmount(next, ['staff-commission'], amount, {
      preferredId: 'staff-commission',
      label: 'Staff sales commission (0.5%)',
      computation: `Manual entry ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    })
  }

  if (patch.milestoneShare != null) {
    const amount = Math.max(0, Number(patch.milestoneShare) || 0)
    next = upsertIncentiveAmount(next, ['milestone-split', 'milestone-locked'], amount, {
      preferredId: 'milestone-split',
      label: '2M milestone team split (1%)',
      computation: `Manual entry ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    })
  }

  if (patch.attendanceIncentive != null) {
    const amount = Math.max(0, Number(patch.attendanceIncentive) || 0)
    next = upsertIncentiveAmount(next, ['attendance-incentive'], amount, {
      preferredId: 'attendance-incentive',
      label: 'Attendance incentive',
      computation: `Manual entry ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    })
  }

  return next
}
