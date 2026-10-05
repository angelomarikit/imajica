/**
 * HR KPI / Performance — aggregates the same incentive inputs used on
 * My Commission, Plan B, and payslips so HR sees one clear scorecard per employee.
 */
import {
  ATTENDANCE_INCENTIVE_AMOUNT,
  STAFF_SALES_COMMISSION_RATE,
} from '@/constants/payrollIncentives'
import { listAttendanceForBranches } from '@/services/attendanceService'
import {
  currentPeriodMonth,
  listPlanBForStaff,
  sumPlanBForStaff,
} from '@/services/planBIncentiveService'
import {
  computeBranchMilestoneSplit,
  computeClinicManagerCommission,
  computeEmployeeStaffCommission,
  resolveEmployeeMatchNames,
  staffNamesMatch,
} from '@/services/staffCommissionService'
import { listDirectoryStaff } from '@/services/staffDirectoryService'
import { getSalesForBooking } from '@/services/salesService'
import {
  computeMonthlyAttendanceIncentive,
  type MonthlyAttendanceIncentive,
} from '@/services/payrollAttendanceService'
import { getAccessUsers } from '@/services/userAccessService'
import { getBranches } from '@/services/branchService'
import type { AttendancePunch, Staff } from '@/types'
import { formatRoleLabel } from '@/utils/roleLabels'

export type EmployeeKpiLineBreak = {
  name: string
  units: number
  revenue: number
}

export type EmployeeKpiRow = {
  id: string
  fullName: string
  email: string
  role: string
  roleLabel: string
  title: string
  branchId: string
  branchName: string
  employeeCode?: string | null
  status: Staff['status']
  /** Paid tagged bookings in period */
  bookingCount: number
  /** Gross paid sales tagged to employee */
  salesAmount: number
  /** Staff 0.5% (or clinic-manager 1% when BRANCH_ADMIN) */
  commission: number
  commissionKind: 'staff' | 'clinic_manager'
  serviceUnits: number
  serviceRevenue: number
  productUnits: number
  productRevenue: number
  packageUnits: number
  packageRevenue: number
  topServices: EmployeeKpiLineBreak[]
  topProducts: EmployeeKpiLineBreak[]
  planBAmount: number
  planBNotes: string
  attendance: MonthlyAttendanceIncentive
  attendanceIncentive: number
  /** Milestone share is branch-level; shown when employee has a branch */
  milestoneShare: number
  milestoneReached: boolean
  /** 0–100 composite for HR ranking */
  performanceScore: number
  totalIncentivePay: number
}

export type EmployeeKpiSummary = {
  periodMonth: string
  monthFrom: string
  monthTo: string
  employeeCount: number
  totalBookings: number
  totalSales: number
  totalCommission: number
  totalPlanB: number
  totalAttendanceIncentives: number
  avgPerformanceScore: number
  planBPassCount: number
  perfectAttendanceCount: number
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function periodBounds(periodMonth: string) {
  const [y, m] = periodMonth.split('-').map(Number)
  const year = y || new Date().getFullYear()
  const month = m || new Date().getMonth() + 1
  const monthFrom = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { monthFrom, monthTo }
}

function accumulateLines(
  bookingKeys: string[],
): {
  serviceUnits: number
  serviceRevenue: number
  productUnits: number
  productRevenue: number
  packageUnits: number
  packageRevenue: number
  topServices: EmployeeKpiLineBreak[]
  topProducts: EmployeeKpiLineBreak[]
} {
  const services = new Map<string, EmployeeKpiLineBreak>()
  const products = new Map<string, EmployeeKpiLineBreak>()
  let serviceUnits = 0
  let serviceRevenue = 0
  let productUnits = 0
  let productRevenue = 0
  let packageUnits = 0
  let packageRevenue = 0

  for (const key of bookingKeys) {
    for (const line of getSalesForBooking(key)) {
      const name = (line.treatmentOrPackage || 'Item').trim() || 'Item'
      const units = Number(line.quantity) || 1
      const revenue = Number(line.totalAmount) || 0
      const type = line.itemType || 'service'
      if (type === 'product') {
        productUnits += units
        productRevenue += revenue
        const prev = products.get(name) || { name, units: 0, revenue: 0 }
        prev.units += units
        prev.revenue += revenue
        products.set(name, prev)
      } else if (type === 'package') {
        packageUnits += units
        packageRevenue += revenue
      } else {
        serviceUnits += units
        serviceRevenue += revenue
        const prev = services.get(name) || { name, units: 0, revenue: 0 }
        prev.units += units
        prev.revenue += revenue
        services.set(name, prev)
      }
    }
  }

  const sortTop = (map: Map<string, EmployeeKpiLineBreak>) =>
    [...map.values()].sort((a, b) => b.revenue - a.revenue || b.units - a.units).slice(0, 5)

  return {
    serviceUnits,
    serviceRevenue: round2(serviceRevenue),
    productUnits,
    productRevenue: round2(productRevenue),
    packageUnits,
    packageRevenue: round2(packageRevenue),
    topServices: sortTop(services),
    topProducts: sortTop(products),
  }
}

/** Visible 0–100 score: sales, bookings, mix, attendance, Plan B KPI. */
export function computePerformanceScore(input: {
  salesAmount: number
  bookingCount: number
  serviceUnits: number
  productUnits: number
  attendance: MonthlyAttendanceIncentive
  planBAmount: number
}): number {
  const salesPts = Math.min(30, (input.salesAmount / 200_000) * 30)
  const bookingPts = Math.min(20, (input.bookingCount / 40) * 20)
  const mixPts = Math.min(
    15,
    ((input.serviceUnits + input.productUnits) / 60) * 15,
  )
  const scheduled = Math.max(1, input.attendance.scheduledDaysSoFar)
  const presentRatio = input.attendance.presentDays / scheduled
  const latePenalty = Math.min(10, input.attendance.lateDays * 2)
  const absentPenalty = Math.min(15, input.attendance.absentDays * 3)
  const attendancePts = Math.max(0, presentRatio * 20 - latePenalty - absentPenalty)
  const planBPts = input.planBAmount > 0 ? 15 : 0
  return Math.round(Math.min(100, salesPts + bookingPts + mixPts + attendancePts + planBPts))
}

function clinicBranchIds(): string[] {
  return getBranches()
    .filter((b) => b.status === 'active' && b.branchType !== 'warehouse')
    .map((b) => b.id)
}

/**
 * Build HR KPI rows for every directory employee in a calendar month (YYYY-MM).
 */
export async function buildEmployeeKpiRows(opts?: {
  periodMonth?: string
  branchId?: string | null
}): Promise<{ summary: EmployeeKpiSummary; rows: EmployeeKpiRow[] }> {
  const periodMonth = opts?.periodMonth || currentPeriodMonth()
  const { monthFrom, monthTo } = periodBounds(periodMonth)
  const branchFilter = opts?.branchId || null

  const employees = (await listDirectoryStaff()).filter((s) => {
    if (s.status === 'inactive') return false
    if (branchFilter && s.branchId !== branchFilter) return false
    // Focus on people who operate in clinics / earn incentives
    const role = s.role
    return (
      role === 'STAFF' ||
      role === 'AESTHETICIAN' ||
      role === 'RECEPTIONIST' ||
      role === 'NURSE' ||
      role === 'DOCTOR' ||
      role === 'BRANCH_ADMIN' ||
      Boolean(s.employeeCode) ||
      Boolean(s.branchId)
    )
  })

  const branchIds = branchFilter ? [branchFilter] : clinicBranchIds()
  let punches: AttendancePunch[] = []
  try {
    punches = await listAttendanceForBranches(branchIds, monthFrom, monthTo)
  } catch {
    punches = []
  }
  const punchesByUser = new Map<string, AttendancePunch[]>()
  for (const p of punches) {
    const list = punchesByUser.get(p.userId) || []
    list.push(p)
    punchesByUser.set(p.userId, list)
  }

  const rows: EmployeeKpiRow[] = employees.map((emp) => {
    const matchNames = resolveEmployeeMatchNames({
      matchedUserId: emp.id,
      rosterFullName: emp.fullName,
      rosterEmails: emp.email ? [emp.email] : [],
    })

    const isClinicManager = emp.role === 'BRANCH_ADMIN'
    let salesAmount = 0
    let commission = 0
    let commissionKind: 'staff' | 'clinic_manager' = 'staff'
    let bookings = computeEmployeeStaffCommission({
      matchNames,
      from: monthFrom,
      to: monthTo,
    }).bookings

    if (isClinicManager && emp.branchId) {
      const cm = computeClinicManagerCommission({
        branchId: emp.branchId,
        from: monthFrom,
        to: monthTo,
      })
      salesAmount = cm.branchSales
      commission = cm.commission
      commissionKind = 'clinic_manager'
      // Still count personal tagged bookings for activity
      const tagged = computeEmployeeStaffCommission({
        matchNames,
        from: monthFrom,
        to: monthTo,
      })
      bookings = tagged.bookings
    } else {
      const staff = computeEmployeeStaffCommission({
        matchNames,
        from: monthFrom,
        to: monthTo,
      })
      salesAmount = staff.salesAmount
      commission = staff.commission
      bookings = staff.bookings
    }

    const paidKeys = bookings
      .filter((b) => b.status === 'Paid' || b.status === 'paid')
      .map((b) => b.bookingKey)
    const lines = accumulateLines(paidKeys)

    const planBRows = listPlanBForStaff({
      staffUserId: emp.id,
      staffName: emp.fullName,
      periodMonth,
    })
    const planBAmount = sumPlanBForStaff({
      staffUserId: emp.id,
      staffName: emp.fullName,
      periodMonth,
    })
    const planBNotes =
      planBRows
        .map((r) => r.notes)
        .filter(Boolean)
        .join('; ') || (planBAmount > 0 ? 'Plan B KPI met' : 'No Plan B this month')

    const userPunches: AttendancePunch[] = []
    const linkedIds = new Set<string>([emp.id])
    for (const u of getAccessUsers()) {
      if (u.id === emp.id) linkedIds.add(u.id)
      else if (emp.email && u.email.trim().toLowerCase() === emp.email.trim().toLowerCase()) {
        linkedIds.add(u.id)
      } else if (staffNamesMatch(emp.fullName, u.fullName)) {
        linkedIds.add(u.id)
      }
    }
    for (const id of linkedIds) {
      for (const p of punchesByUser.get(id) || []) userPunches.push(p)
    }
    const attendance = computeMonthlyAttendanceIncentive(userPunches, monthFrom)
    const attendanceIncentive = attendance.amount

    const milestone = computeBranchMilestoneSplit({
      branchId: emp.branchId || null,
      periodMonth,
    })

    const performanceScore = computePerformanceScore({
      salesAmount,
      bookingCount: paidKeys.length,
      serviceUnits: lines.serviceUnits,
      productUnits: lines.productUnits,
      attendance,
      planBAmount,
    })

    const totalIncentivePay = round2(
      commission + planBAmount + attendanceIncentive + (milestone.milestoneReached ? milestone.milestoneShare : 0),
    )

    return {
      id: emp.id,
      fullName: emp.fullName,
      email: emp.email,
      role: emp.role,
      roleLabel: formatRoleLabel(emp.role),
      title: emp.title || formatRoleLabel(emp.role),
      branchId: emp.branchId,
      branchName: emp.branchName,
      employeeCode: emp.employeeCode,
      status: emp.status,
      bookingCount: paidKeys.length,
      salesAmount,
      commission,
      commissionKind,
      serviceUnits: lines.serviceUnits,
      serviceRevenue: lines.serviceRevenue,
      productUnits: lines.productUnits,
      productRevenue: lines.productRevenue,
      packageUnits: lines.packageUnits,
      packageRevenue: lines.packageRevenue,
      topServices: lines.topServices,
      topProducts: lines.topProducts,
      planBAmount: round2(planBAmount),
      planBNotes,
      attendance,
      attendanceIncentive,
      milestoneShare: milestone.milestoneShare,
      milestoneReached: milestone.milestoneReached,
      performanceScore,
      totalIncentivePay,
    }
  })

  rows.sort(
    (a, b) =>
      b.performanceScore - a.performanceScore ||
      b.totalIncentivePay - a.totalIncentivePay ||
      b.salesAmount - a.salesAmount ||
      a.fullName.localeCompare(b.fullName),
  )

  const summary: EmployeeKpiSummary = {
    periodMonth,
    monthFrom,
    monthTo,
    employeeCount: rows.length,
    totalBookings: rows.reduce((s, r) => s + r.bookingCount, 0),
    totalSales: round2(rows.reduce((s, r) => s + r.salesAmount, 0)),
    totalCommission: round2(rows.reduce((s, r) => s + r.commission, 0)),
    totalPlanB: round2(rows.reduce((s, r) => s + r.planBAmount, 0)),
    totalAttendanceIncentives: round2(rows.reduce((s, r) => s + r.attendanceIncentive, 0)),
    avgPerformanceScore:
      rows.length === 0
        ? 0
        : Math.round(rows.reduce((s, r) => s + r.performanceScore, 0) / rows.length),
    planBPassCount: rows.filter((r) => r.planBAmount > 0).length,
    perfectAttendanceCount: rows.filter((r) => r.attendance.eligible).length,
  }

  return { summary, rows }
}

export { STAFF_SALES_COMMISSION_RATE, ATTENDANCE_INCENTIVE_AMOUNT, currentPeriodMonth }
