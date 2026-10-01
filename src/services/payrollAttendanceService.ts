import {
  PAYROLL_DEFAULT_SHIFT,
  PAYROLL_ROSTER_SEED,
  monthlyBasicSalary,
  type PayrollRosterEmployee,
} from '@/constants/payrollRosterSeed'
import {
  buildAttendanceSessions,
  listAttendanceForBranches,
  manilaDateKey,
  type AttendanceSession,
} from '@/services/attendanceService'
import type { AttendancePunch } from '@/types'
import { getAccessUsers } from '@/services/userAccessService'
import { BRANCH_IDS } from '@/constants/teamAccountsSeed'

const MANILA_TZ = 'Asia/Manila'

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/** Minutes from midnight in Asia/Manila for an ISO timestamp. */
export function manilaMinutesOfDay(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: MANILA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

export function scheduledMinutesPerDay(): number {
  const start = PAYROLL_DEFAULT_SHIFT.startHour * 60 + PAYROLL_DEFAULT_SHIFT.startMinute
  const end = PAYROLL_DEFAULT_SHIFT.endHour * 60 + PAYROLL_DEFAULT_SHIFT.endMinute
  return Math.max(1, end - start)
}

export function isScheduledWorkday(dateKey: string): boolean {
  const d = new Date(`${dateKey}T12:00:00+08:00`)
  const weekday = d.getUTCDay() // Manila noon → correct weekday
  return (PAYROLL_DEFAULT_SHIFT.workWeekdays as readonly number[]).includes(weekday)
}

/** Inclusive Manila date keys that are scheduled workdays (Tue–Sun). */
export function scheduledDateKeys(from: string, to: string): string[] {
  const keys: string[] = []
  const cursor = new Date(`${from}T12:00:00+08:00`)
  const end = new Date(`${to}T12:00:00+08:00`)
  while (cursor <= end) {
    const key = manilaDateKey(cursor)
    if (isScheduledWorkday(key)) keys.push(key)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return keys
}

export type PayrollDayDetail = {
  dateKey: string
  status: 'present' | 'absent' | 'open' | 'off'
  timeIn: string | null
  timeOut: string | null
  lateMinutes: number
  undertimeMinutes: number
  lateDeduction: number
  undertimeDeduction: number
  hours: number | null
}

export type AttendancePayrollRow = {
  employee: PayrollRosterEmployee
  matchedUserId: string | null
  daysScheduled: number
  daysPresent: number
  daysAbsent: number
  daysOpen: number
  lateMinutes: number
  undertimeMinutes: number
  /** daysPresent × salary/day */
  grossPay: number
  lateDeduction: number
  undertimeDeduction: number
  absenceDeduction: number
  /** Prorated monthly statutory (SSS+MPF + Pag-IBIG + PhilHealth employee) */
  sssDeduction: number
  pagibigDeduction: number
  philhealthDeduction: number
  statutoryTotal: number
  attendanceDeductions: number
  totalDeductions: number
  netPay: number
  mbs: number
  dayDetails: PayrollDayDetail[]
  sessions: AttendanceSession[]
}

function resolveUserId(employee: PayrollRosterEmployee): string | null {
  const users = getAccessUsers()
  const emails = new Set(
    [employee.email, ...employee.matchEmails].map(normalizeEmail).filter(Boolean),
  )
  const byEmail = users.find((u) => emails.has(normalizeEmail(u.email)))
  if (byEmail) return byEmail.id

  const target = normalizeName(employee.fullName)
  const targetParts = target.split(' ').filter(Boolean)
  const byName = users.find((u) => {
    const n = normalizeName(u.fullName)
    if (n === target) return true
    // first + last match
    const parts = n.split(' ').filter(Boolean)
    if (parts.length < 2 || targetParts.length < 2) return false
    return (
      parts[0] === targetParts[0] &&
      parts[parts.length - 1] === targetParts[targetParts.length - 1]
    )
  })
  return byName?.id ?? null
}

function prorateMonthly(amount: number, scheduledInPeriod: number): number {
  const base = PAYROLL_DEFAULT_SHIFT.mbsDaysPerMonth
  if (scheduledInPeriod <= 0) return 0
  return Math.round(((amount * scheduledInPeriod) / base) * 100) / 100
}

function computeDay(
  dateKey: string,
  session: AttendanceSession | undefined,
  salaryPerDay: number,
): PayrollDayDetail {
  if (!isScheduledWorkday(dateKey)) {
    return {
      dateKey,
      status: 'off',
      timeIn: null,
      timeOut: null,
      lateMinutes: 0,
      undertimeMinutes: 0,
      lateDeduction: 0,
      undertimeDeduction: 0,
      hours: null,
    }
  }
  if (!session) {
    return {
      dateKey,
      status: 'absent',
      timeIn: null,
      timeOut: null,
      lateMinutes: 0,
      undertimeMinutes: 0,
      lateDeduction: 0,
      undertimeDeduction: 0,
      hours: null,
    }
  }

  const scheduleStart =
    PAYROLL_DEFAULT_SHIFT.startHour * 60 + PAYROLL_DEFAULT_SHIFT.startMinute
  const scheduleEnd = PAYROLL_DEFAULT_SHIFT.endHour * 60 + PAYROLL_DEFAULT_SHIFT.endMinute
  const perMinute = salaryPerDay / scheduledMinutesPerDay()

  const inMin = manilaMinutesOfDay(session.timeIn.punchedAt)
  const lateMinutes = Math.max(0, inMin - scheduleStart)

  let undertimeMinutes = 0
  if (session.timeOut) {
    const outMin = manilaMinutesOfDay(session.timeOut.punchedAt)
    undertimeMinutes = Math.max(0, scheduleEnd - outMin)
  }

  const lateDeduction = Math.round(lateMinutes * perMinute * 100) / 100
  const undertimeDeduction = Math.round(undertimeMinutes * perMinute * 100) / 100

  return {
    dateKey,
    status: session.timeOut ? 'present' : 'open',
    timeIn: session.timeIn.punchedAt,
    timeOut: session.timeOut?.punchedAt ?? null,
    lateMinutes,
    undertimeMinutes,
    lateDeduction,
    undertimeDeduction,
    hours: session.hours,
  }
}

function buildRow(
  employee: PayrollRosterEmployee,
  punches: AttendancePunch[],
  from: string,
  to: string,
): AttendancePayrollRow {
  const matchedUserId = resolveUserId(employee)
  const userPunches = matchedUserId
    ? punches.filter((p) => p.userId === matchedUserId)
    : []
  const sessions = buildAttendanceSessions(userPunches)
  const byDate = new Map<string, AttendanceSession>()
  for (const s of sessions) {
    // Prefer completed session if multiple
    const prev = byDate.get(s.dateKey)
    if (!prev || (!prev.timeOut && s.timeOut)) byDate.set(s.dateKey, s)
  }

  const scheduleKeys = scheduledDateKeys(from, to)
  const dayDetails = scheduleKeys.map((key) =>
    computeDay(key, byDate.get(key), employee.salaryPerDay),
  )

  const daysPresent = dayDetails.filter((d) => d.status === 'present' || d.status === 'open').length
  const daysAbsent = dayDetails.filter((d) => d.status === 'absent').length
  const daysOpen = dayDetails.filter((d) => d.status === 'open').length
  const lateMinutes = dayDetails.reduce((sum, d) => sum + d.lateMinutes, 0)
  const undertimeMinutes = dayDetails.reduce((sum, d) => sum + d.undertimeMinutes, 0)
  const lateDeduction = dayDetails.reduce((sum, d) => sum + d.lateDeduction, 0)
  const undertimeDeduction = dayDetails.reduce((sum, d) => sum + d.undertimeDeduction, 0)
  const absenceDeduction = daysAbsent * employee.salaryPerDay
  const grossPay = daysPresent * employee.salaryPerDay

  const scheduledCount = scheduleKeys.length
  const sssDeduction = prorateMonthly(
    employee.sssEmployee + employee.mpfEmployee,
    scheduledCount,
  )
  const pagibigDeduction = prorateMonthly(employee.pagibigEmployee, scheduledCount)
  const philhealthDeduction = prorateMonthly(employee.philhealthEmployee, scheduledCount)
  const statutoryTotal = sssDeduction + pagibigDeduction + philhealthDeduction
  const attendanceDeductions = lateDeduction + undertimeDeduction + absenceDeduction
  const totalDeductions = statutoryTotal + lateDeduction + undertimeDeduction
  // Absences reduce gross (not paid) — do not double-count in net
  const netPay = Math.max(0, Math.round((grossPay - totalDeductions) * 100) / 100)

  return {
    employee,
    matchedUserId,
    daysScheduled: scheduledCount,
    daysPresent,
    daysAbsent,
    daysOpen,
    lateMinutes,
    undertimeMinutes,
    grossPay,
    lateDeduction,
    undertimeDeduction,
    absenceDeduction,
    sssDeduction,
    pagibigDeduction,
    philhealthDeduction,
    statutoryTotal,
    attendanceDeductions,
    totalDeductions: totalDeductions + absenceDeduction,
    netPay,
    mbs: monthlyBasicSalary(employee.salaryPerDay),
    dayDetails,
    sessions,
  }
}

const ALL_CLINIC_BRANCH_IDS = Object.values(BRANCH_IDS)

/**
 * Build attendance-based payroll for the seeded roster over a Manila date range.
 * Gross = present days × salary/day; late/undertime from shift vs punches; statutory prorated.
 */
export async function computeAttendancePayroll(
  from: string,
  to: string,
): Promise<AttendancePayrollRow[]> {
  const punches = await listAttendanceForBranches(ALL_CLINIC_BRANCH_IDS, from, to)
  return PAYROLL_ROSTER_SEED.map((employee) => buildRow(employee, punches, from, to)).sort(
    (a, b) => a.employee.fullName.localeCompare(b.employee.fullName),
  )
}

export function getPayrollRoster(): PayrollRosterEmployee[] {
  return PAYROLL_ROSTER_SEED
}
