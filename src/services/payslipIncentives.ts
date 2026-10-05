import { ATTENDANCE_INCENTIVE_AMOUNT } from '@/constants/payrollIncentives'
import type { AttendancePayrollRow } from '@/services/payrollAttendanceService'
import { computeMonthlyAttendanceIncentive } from '@/services/payrollAttendanceService'
import { sumPlanBForStaff, listPlanBForStaff } from '@/services/planBIncentiveService'
import {
  computeBranchMilestoneSplit,
  computeClinicManagerCommission,
  computeEmployeeStaffCommission,
  resolveEmployeeMatchNames,
} from '@/services/staffCommissionService'
import { getAccessUsers } from '@/services/userAccessService'
import type { PayslipIncentiveBundle } from '@/services/payslipCompute'
import type { AttendancePunch } from '@/types'

function periodMonthFromRange(from: string, to: string) {
  return (to || from).slice(0, 7)
}

function isClinicManagerForEmployee(row: AttendancePayrollRow): boolean {
  const emails = new Set(
    [row.employee.email, ...row.employee.matchEmails].map((e) => e.trim().toLowerCase()).filter(Boolean),
  )
  const users = getAccessUsers()
  const match = users.find((u) => emails.has(u.email.trim().toLowerCase()))
  if (match?.role === 'BRANCH_ADMIN') return true
  if (row.matchedUserId) {
    const byId = users.find((u) => u.id === row.matchedUserId)
    if (byId?.role === 'BRANCH_ADMIN') return true
  }
  return /clinic manager|branch manager|branch admin/i.test(row.employee.jobTitle)
}

/**
 * Gather every incentive line for a payroll row over the selected date range.
 * Staff 0.5% uses the same employee-tagged sales as My Commission & Sales.
 */
export function gatherPayslipIncentives(input: {
  row: AttendancePayrollRow
  periodFrom: string
  periodTo: string
  attendancePunches?: AttendancePunch[]
}): PayslipIncentiveBundle {
  const { row, periodFrom, periodTo, attendancePunches = [] } = input
  const name = row.employee.fullName
  const branchId = row.employee.branchId
  const periodMonth = periodMonthFromRange(periodFrom, periodTo)

  const matchNames = resolveEmployeeMatchNames({
    matchedUserId: row.matchedUserId,
    rosterFullName: row.employee.fullName,
    rosterEmails: [row.employee.email, ...row.employee.matchEmails],
  })

  const staff = computeEmployeeStaffCommission({
    matchNames,
    from: periodFrom,
    to: periodTo,
  })

  const isClinicManager = isClinicManagerForEmployee(row)
  let managerBranchSales = 0
  let managerCommission = 0
  if (isClinicManager) {
    const mgr = computeClinicManagerCommission({
      branchId,
      from: periodFrom,
      to: periodTo,
    })
    managerBranchSales = mgr.branchSales
    managerCommission = mgr.commission
  }

  const milestone = computeBranchMilestoneSplit({
    branchId,
    periodMonth,
  })

  const att = computeMonthlyAttendanceIncentive(attendancePunches, periodTo)
  const lateDays = att.lateDays || (row.lateMinutes > 0 ? 1 : 0)
  const absentDays = att.absentDays || row.daysAbsent
  const attendanceEligible =
    Boolean(row.matchedUserId) && lateDays === 0 && absentDays === 0 && row.daysPresent > 0
  const attendanceIncentive = attendanceEligible ? ATTENDANCE_INCENTIVE_AMOUNT : 0

  const planBRows = listPlanBForStaff({
    staffUserId: row.matchedUserId || undefined,
    staffName: name,
    periodMonth,
  })
  const planBAmount = Math.round(
    sumPlanBForStaff({
      staffUserId: row.matchedUserId || undefined,
      staffName: name,
      periodMonth,
    }) * 100,
  ) / 100
  const planBNotes = planBRows
    .map((r) => r.notes)
    .filter(Boolean)
    .join(' · ')

  return {
    staffSalesAmount: staff.salesAmount,
    staffSalesCommission: staff.commission,
    managerBranchSales,
    managerCommission,
    isClinicManager,
    milestoneSales: milestone.milestoneSales,
    milestoneReached: milestone.milestoneReached,
    milestonePool: milestone.milestonePool,
    milestoneTeamSize: milestone.milestoneTeamSize,
    milestoneShare: milestone.milestoneShare,
    attendanceIncentive,
    attendanceEligible,
    attendanceLateDays: lateDays,
    attendanceAbsentDays: absentDays,
    planBAmount,
    planBNotes: planBNotes || 'Pass the KPI set by the branch',
  }
}
