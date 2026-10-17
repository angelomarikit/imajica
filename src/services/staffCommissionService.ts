/**
 * Shared staff commission / tagged-sales math.
 * My Commission & Sales and HR payslips must use the same matcher + rates.
 */
import {
  BRANCH_SALES_MILESTONE,
  CLINIC_MANAGER_COMMISSION_RATE,
  MILESTONE_SPLIT_RATE,
  STAFF_SALES_COMMISSION_RATE,
} from '@/constants/payrollIncentives'
import {
  clinicRecognizedAmount,
  getBookingRows,
  type TodayBookingRow,
} from '@/services/salesService'
import { getDirectoryStaff, matchesStaffBranch } from '@/services/staffDirectoryService'
import { getAccessUsers } from '@/services/userAccessService'
import type { AccessUser, AttendancePunch, Sale } from '@/types'

function normalizePersonName(value: string | undefined | null) {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(dr\.?|dra\.?)\s+/i, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Match checkout STAFF tag to an account / roster name (middle names / initials). */
export function staffNamesMatch(accountName: string, saleStaffName: string) {
  const a = normalizePersonName(accountName)
  const b = normalizePersonName(saleStaffName)
  if (!a || !b || b === '-') return false
  if (a === b) return true
  const aParts = a.split(' ').filter(Boolean)
  const bParts = b.split(' ').filter(Boolean)
  if (aParts.length < 1 || bParts.length < 1) return false
  const aFirst = aParts[0]!
  const aLast = aParts[aParts.length - 1]!
  const bFirst = bParts[0]!
  const bLast = bParts[bParts.length - 1]!
  // Same first + last (ignore middle names / initials)
  if (aParts.length >= 2 && bParts.length >= 2 && aFirst === bFirst && aLast === bLast) {
    return true
  }
  // First+last appear in both name bags (handles "Janice B. Aguirre" ↔ "Janice Bagadiong Aguirre")
  if (aParts.length >= 2 && bParts.includes(aFirst) && bParts.includes(aLast)) return true
  if (bParts.length >= 2 && aParts.includes(bFirst) && aParts.includes(bLast)) return true
  // Shared first name + any other shared token ("Noraisa Unayan Esmael" ↔ "Noraisa Unayan")
  if (
    aFirst === bFirst &&
    aParts.some((p) => p !== aFirst && bParts.includes(p))
  ) {
    return true
  }
  return false
}

export function saleDateKey(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function isPaidBooking(row: TodayBookingRow) {
  return row.status === 'Paid' || row.status === 'paid'
}

/** Unique non-empty display names used to match checkout STAFF tags. */
export function collectStaffMatchNames(input: {
  fullName?: string | null
  aliases?: Array<string | null | undefined>
}): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of [input.fullName, ...(input.aliases || [])]) {
    const name = (raw || '').trim()
    if (!name) continue
    const key = normalizePersonName(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

/**
 * Resolve every display name that belongs to this payroll employee:
 * linked login account(s), roster name, and directory aliases that share
 * email or the same first+last (e.g. Janice Aguirre / Janice B. Aguirre).
 */
export function resolveEmployeeMatchNames(input: {
  matchedUserId?: string | null
  rosterFullName?: string | null
  rosterEmails?: string[]
}): string[] {
  const users = getAccessUsers()
  const emails = new Set(
    (input.rosterEmails || []).map((e) => e.trim().toLowerCase()).filter(Boolean),
  )
  const aliases: string[] = []
  if (input.rosterFullName) aliases.push(input.rosterFullName)

  let primary: AccessUser | undefined
  if (input.matchedUserId) {
    primary = users.find((u) => u.id === input.matchedUserId)
  }

  for (const u of users) {
    const email = u.email.trim().toLowerCase()
    const linkedById = Boolean(input.matchedUserId && u.id === input.matchedUserId)
    const linkedByEmail = Boolean(email && emails.has(email))
    const linkedByName =
      Boolean(input.rosterFullName) && staffNamesMatch(input.rosterFullName!, u.fullName)
    if (linkedById || linkedByEmail || linkedByName) {
      aliases.push(u.fullName)
      if (email) emails.add(email)
      if (!primary && (linkedById || linkedByEmail)) primary = u
    }
  }

  // Second pass: any other accounts sharing newly discovered emails
  for (const u of users) {
    const email = u.email.trim().toLowerCase()
    if (email && emails.has(email)) aliases.push(u.fullName)
  }

  return collectStaffMatchNames({
    fullName: primary?.fullName || input.rosterFullName,
    aliases,
  })
}

export function bookingMatchesStaffNames(row: TodayBookingRow, matchNames: string[]) {
  return matchNames.some((name) => staffNamesMatch(name, row.staffName))
}

/** Tagged checkout bookings for one employee (same rules as My Commission). */
export function listEmployeeTaggedBookings(input: {
  matchNames: string[]
  from?: string
  to?: string
  /** When set, only that branch — leave unset for personal commission (all clinics). */
  branchId?: string | null
}): TodayBookingRow[] {
  if (!input.matchNames.length) return []
  const rows = getBookingRows(input.branchId ? { branchId: input.branchId } : undefined)
  return rows.filter((row) => {
    if (!bookingMatchesStaffNames(row, input.matchNames)) return false
    const day = saleDateKey(row.dateIso)
    if (input.from && day < input.from) return false
    if (input.to && day > input.to) return false
    return true
  })
}

/** 0.5% staff commission on paid tagged sales — identical to My Commission cards. */
export function computeEmployeeStaffCommission(input: {
  matchNames: string[]
  from: string
  to: string
}): { salesAmount: number; commission: number; bookings: TodayBookingRow[] } {
  const bookings = listEmployeeTaggedBookings({
    matchNames: input.matchNames,
    from: input.from,
    to: input.to,
  })
  const paid = bookings.filter(isPaidBooking)
  const salesAmount = round2(paid.reduce((s, r) => s + (r.payment || 0), 0))
  const commission = round2(salesAmount * STAFF_SALES_COMMISSION_RATE)
  return { salesAmount, commission, bookings }
}

/** Clinic manager 1% on whole-clinic paid sales in the period. */
export function computeClinicManagerCommission(input: {
  branchId: string | null | undefined
  from: string
  to: string
}): { branchSales: number; commission: number } {
  if (!input.branchId) return { branchSales: 0, commission: 0 }
  const branchSales = round2(
    getBookingRows({ branchId: input.branchId })
      .filter((r) => {
        if (!isPaidBooking(r)) return false
        const day = saleDateKey(r.dateIso)
        return day >= input.from && day <= input.to
      })
      .reduce((s, r) => s + (r.payment || 0), 0),
  )
  return {
    branchSales,
    commission: round2(branchSales * CLINIC_MANAGER_COMMISSION_RATE),
  }
}

export type GrossCommissionBreakdown = {
  /** Paid clinic-recognized sales in range (doctor’s procedure at 80%). */
  branchSales: number
  /** 0.5% staff pool on paid sales */
  staffCommission: number
  /** 1% clinic manager / owner pool on paid sales */
  managerCommission: number
  /** staff + manager — Sales Reports “Gross Commission” */
  grossCommission: number
  staffRate: number
  managerRate: number
}

/**
 * Gross commission for Sales Reports / owner view:
 * staff 0.5% + clinic manager 1% on paid sales in the period.
 * Pass `sales` from a fresh analytics fetch so the KPI matches the page table.
 */
export function computeGrossCommissionForPeriod(input: {
  from: string
  to: string
  branchId?: string | null
  sales?: Sale[]
}): GrossCommissionBreakdown {
  let branchSales = 0

  if (input.sales && input.sales.length) {
    const groups = new Map<string, Sale[]>()
    for (const s of input.sales) {
      const day = (s.createdAt || '').slice(0, 10)
      if (input.from && day < input.from) continue
      if (input.to && day > input.to) continue
      if (input.branchId && s.branchId !== input.branchId) continue
      if ((s.leadSource || '') === 'Migration') continue
      const key = s.bookingRef || s.invoiceNumber || s.id
      const list = groups.get(key) ?? []
      list.push(s)
      groups.set(key, list)
    }
    for (const lines of groups.values()) {
      const paid = lines.every((l) => l.status === 'paid')
      if (!paid) continue
      branchSales += lines.reduce((sum, l) => sum + clinicRecognizedAmount(l), 0)
    }
    branchSales = round2(branchSales)
  } else {
    branchSales = round2(
      getBookingRows(input.branchId ? { branchId: input.branchId } : undefined)
        .filter((r) => {
          if (!isPaidBooking(r)) return false
          const day = saleDateKey(r.dateIso)
          return day >= input.from && day <= input.to
        })
        .reduce((s, r) => s + (r.payment || 0), 0),
    )
  }

  const staffCommission = round2(branchSales * STAFF_SALES_COMMISSION_RATE)
  const managerCommission = round2(branchSales * CLINIC_MANAGER_COMMISSION_RATE)
  return {
    branchSales,
    staffCommission,
    managerCommission,
    grossCommission: round2(staffCommission + managerCommission),
    staffRate: STAFF_SALES_COMMISSION_RATE,
    managerRate: CLINIC_MANAGER_COMMISSION_RATE,
  }
}

const MILESTONE_TEAM_ROLES = new Set([
  'BRANCH_ADMIN',
  'DOCTOR',
  'NURSE',
  'AESTHETICIAN',
  'RECEPTIONIST',
  'STAFF',
])

function milestoneMonthBounds(periodMonth: string) {
  const monthFrom = `${periodMonth}-01`
  const [y, m] = periodMonth.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y!, m!, 0)).getUTCDate()
  const monthTo = `${periodMonth}-${String(lastDay).padStart(2, '0')}`
  return { monthFrom, monthTo }
}

/** Access-user ids eligible for the branch 2M pool (clinic staff + clinic manager). */
export function listBranchTeamUserIds(branchId: string | null | undefined): string[] {
  if (!branchId) return []
  const ids = new Set<string>()
  for (const u of getAccessUsers()) {
    if (u.status !== 'active') continue
    if (!u.branchId || !matchesStaffBranch(u, branchId)) continue
    if (MILESTONE_TEAM_ROLES.has(u.role)) ids.add(u.id)
  }
  for (const s of getDirectoryStaff()) {
    if (s.status !== 'active') continue
    if (!matchesStaffBranch(s, branchId)) continue
    if (s.id) ids.add(s.id)
  }
  return [...ids]
}

/** Active branch teammates who share the 2M split (staff + clinic manager). */
export function countBranchTeamShare(branchId: string | null | undefined): number {
  return Math.max(1, listBranchTeamUserIds(branchId).length)
}

/** Paid booking totals by Manila day for one branch in a month. */
export function paidSalesByDayForBranch(
  branchId: string,
  monthFrom: string,
  monthTo: string,
): Map<string, number> {
  const byDay = new Map<string, number>()
  for (const r of getBookingRows({ branchId })) {
    if (!isPaidBooking(r)) continue
    const day = saleDateKey(r.dateIso)
    if (day < monthFrom || day > monthTo) continue
    byDay.set(day, round2((byDay.get(day) || 0) + (r.payment || 0)))
  }
  return byDay
}

/** Manila day → user ids who Time In that day (branch punches). */
export function presentUserIdsByDay(
  punches: AttendancePunch[],
  teamUserIds: Set<string>,
): Map<string, Set<string>> {
  const byDay = new Map<string, Set<string>>()
  for (const p of punches) {
    if (p.punchType !== 'time_in') continue
    if (!teamUserIds.has(p.userId)) continue
    const day = saleDateKey(p.punchedAt)
    if (!day) continue
    let set = byDay.get(day)
    if (!set) {
      set = new Set()
      byDay.set(day, set)
    }
    set.add(p.userId)
  }
  return byDay
}

/**
 * Day-weighted 1% pool: each day’s share split equally among team members
 * who timed in that Manila day. Absentees get ₱0 for that day.
 *
 * When `projectIfLocked` is true and the branch is under ₱2M, still allocates using
 * pool = 1% of ₱2M and current day-sales weights (estimate at unlock).
 */
export function computeMilestoneSharesByUser(input: {
  branchId: string | null | undefined
  periodMonth: string
  /** Branch attendance punches for the month (all teammates). */
  branchPunches: AttendancePunch[]
  /** Estimate shares even before the branch hits ₱2M. */
  projectIfLocked?: boolean
}): {
  milestoneSales: number
  milestoneReached: boolean
  milestonePool: number
  milestoneTeamSize: number
  monthFrom: string
  monthTo: string
  sharesByUserId: Map<string, number>
  unallocatedPool: number
  /** True when shares are a projection (branch has not unlocked yet). */
  isProjected: boolean
} {
  const { monthFrom, monthTo } = milestoneMonthBounds(input.periodMonth)
  const teamIds = listBranchTeamUserIds(input.branchId)
  const teamSet = new Set(teamIds)
  const milestoneTeamSize = Math.max(1, teamIds.length)

  const salesByDay = input.branchId
    ? paidSalesByDayForBranch(input.branchId, monthFrom, monthTo)
    : new Map<string, number>()
  let milestoneSales = 0
  for (const amt of salesByDay.values()) milestoneSales = round2(milestoneSales + amt)

  const milestoneReached = milestoneSales >= BRANCH_SALES_MILESTONE
  const isProjected = !milestoneReached && Boolean(input.projectIfLocked)
  const milestonePool = milestoneReached
    ? round2(milestoneSales * MILESTONE_SPLIT_RATE)
    : isProjected
      ? round2(BRANCH_SALES_MILESTONE * MILESTONE_SPLIT_RATE)
      : 0
  const sharesByUserId = new Map<string, number>()
  let unallocatedPool = 0

  const canAllocate =
    milestonePool > 0 && milestoneSales > 0 && (milestoneReached || isProjected)

  if (!canAllocate) {
    return {
      milestoneSales,
      milestoneReached,
      milestonePool,
      milestoneTeamSize,
      monthFrom,
      monthTo,
      sharesByUserId,
      unallocatedPool: 0,
      isProjected: false,
    }
  }

  const presentByDay = presentUserIdsByDay(input.branchPunches, teamSet)
  /** For projection at ₱2M unlock, day weights stay based on sales so far. */
  const weightBase = milestoneSales

  for (const [day, daySales] of salesByDay) {
    if (daySales <= 0) continue
    const dayPool = round2((daySales / weightBase) * milestonePool)
    const present = presentByDay.get(day)
    if (!present || present.size === 0) {
      unallocatedPool = round2(unallocatedPool + dayPool)
      continue
    }
    const each = round2(dayPool / present.size)
    for (const userId of present) {
      sharesByUserId.set(userId, round2((sharesByUserId.get(userId) || 0) + each))
    }
  }

  return {
    milestoneSales,
    milestoneReached,
    milestonePool,
    milestoneTeamSize,
    monthFrom,
    monthTo,
    sharesByUserId,
    unallocatedPool,
    isProjected,
  }
}

export type MilestoneTrackerMember = {
  userId: string
  fullName: string
  role: string
  branchId: string
  branchName: string
  employeeCode: string | null
  daysTimedIn: number
  share: number
}

/** Roster + day-share amounts for the 2M Milestone tracker page. */
export function listBranchMilestoneTracker(input: {
  branchId: string | null | undefined
  periodMonth: string
  branchPunches: AttendancePunch[]
}): {
  milestoneSales: number
  milestoneReached: boolean
  milestonePool: number
  milestoneTeamSize: number
  unallocatedPool: number
  isProjected: boolean
  monthFrom: string
  monthTo: string
  members: MilestoneTrackerMember[]
} {
  const result = computeMilestoneSharesByUser({
    branchId: input.branchId,
    periodMonth: input.periodMonth,
    branchPunches: input.branchPunches,
    projectIfLocked: true,
  })

  const teamIds = listBranchTeamUserIds(input.branchId)
  const teamSet = new Set(teamIds)
  const presentByDay = presentUserIdsByDay(input.branchPunches, teamSet)
  const daysByUser = new Map<string, number>()
  for (const present of presentByDay.values()) {
    for (const id of present) {
      daysByUser.set(id, (daysByUser.get(id) || 0) + 1)
    }
  }

  const profileById = new Map<
    string,
    { fullName: string; role: string; branchId: string; branchName: string; employeeCode: string | null }
  >()
  for (const u of getAccessUsers()) {
    if (!teamIds.includes(u.id)) continue
    profileById.set(u.id, {
      fullName: u.fullName,
      role: u.role,
      branchId: u.branchId || input.branchId || '',
      branchName: u.branchName || '',
      employeeCode: u.employeeCode ?? null,
    })
  }
  for (const s of getDirectoryStaff()) {
    if (!s.id || !teamIds.includes(s.id)) continue
    if (profileById.has(s.id)) continue
    profileById.set(s.id, {
      fullName: s.fullName,
      role: s.role || 'STAFF',
      branchId: s.branchId || input.branchId || '',
      branchName: s.branchName || '',
      employeeCode: s.employeeCode ?? null,
    })
  }

  const members: MilestoneTrackerMember[] = teamIds.map((userId) => {
    const profile = profileById.get(userId)
    return {
      userId,
      fullName: profile?.fullName || 'Teammate',
      role: profile?.role || 'STAFF',
      branchId: profile?.branchId || input.branchId || '',
      branchName: profile?.branchName || '',
      employeeCode: profile?.employeeCode ?? null,
      daysTimedIn: daysByUser.get(userId) || 0,
      share: result.sharesByUserId.get(userId) || 0,
    }
  })

  members.sort((a, b) => b.share - a.share || a.fullName.localeCompare(b.fullName))

  return {
    milestoneSales: result.milestoneSales,
    milestoneReached: result.milestoneReached,
    milestonePool: result.milestonePool,
    milestoneTeamSize: result.milestoneTeamSize,
    unallocatedPool: result.unallocatedPool,
    isProjected: result.isProjected,
    monthFrom: result.monthFrom,
    monthTo: result.monthTo,
    members,
  }
}

/** One employee’s milestone share (sum of daily equal splits on days they timed in). */
export function computeEmployeeMilestoneShare(input: {
  branchId: string | null | undefined
  periodMonth: string
  userId: string | null | undefined
  /** Linked login ids for the same person (email / name aliases). */
  linkedUserIds?: string[]
  branchPunches: AttendancePunch[]
}): number {
  if (!input.userId && !input.linkedUserIds?.length) return 0
  const result = computeMilestoneSharesByUser({
    branchId: input.branchId,
    periodMonth: input.periodMonth,
    branchPunches: input.branchPunches,
  })
  if (!result.milestoneReached) return 0
  const ids = new Set<string>([
    ...(input.userId ? [input.userId] : []),
    ...(input.linkedUserIds || []),
  ])
  let share = 0
  for (const id of ids) {
    share = round2(share + (result.sharesByUserId.get(id) || 0))
  }
  return share
}

/**
 * Branch milestone progress for UI.
 * `milestoneShare` is only filled when `forUserId` + `branchPunches` are provided;
 * otherwise share is 0 (use {@link computeEmployeeMilestoneShare} for payslips).
 */
export function computeBranchMilestoneSplit(input: {
  branchId: string | null | undefined
  /** YYYY-MM */
  periodMonth: string
  branchPunches?: AttendancePunch[]
  forUserId?: string | null
  linkedUserIds?: string[]
}): {
  milestoneSales: number
  milestoneReached: boolean
  milestonePool: number
  milestoneTeamSize: number
  milestoneShare: number
  monthFrom: string
  monthTo: string
  unallocatedPool: number
} {
  const punches = input.branchPunches || []
  const detailed = computeMilestoneSharesByUser({
    branchId: input.branchId,
    periodMonth: input.periodMonth,
    branchPunches: punches,
  })

  let milestoneShare = 0
  if (input.forUserId || input.linkedUserIds?.length) {
    milestoneShare = computeEmployeeMilestoneShare({
      branchId: input.branchId,
      periodMonth: input.periodMonth,
      userId: input.forUserId,
      linkedUserIds: input.linkedUserIds,
      branchPunches: punches,
    })
  }

  return {
    milestoneSales: detailed.milestoneSales,
    milestoneReached: detailed.milestoneReached,
    milestonePool: detailed.milestonePool,
    milestoneTeamSize: detailed.milestoneTeamSize,
    milestoneShare,
    monthFrom: detailed.monthFrom,
    monthTo: detailed.monthTo,
    unallocatedPool: detailed.unallocatedPool,
  }
}
