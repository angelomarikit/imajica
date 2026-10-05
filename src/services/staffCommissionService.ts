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
import { getBookingRows, type TodayBookingRow } from '@/services/salesService'
import { getDirectoryStaff, matchesStaffBranch } from '@/services/staffDirectoryService'
import { getAccessUsers } from '@/services/userAccessService'
import type { AccessUser } from '@/types'

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

/** Active branch teammates who share the 2M split (staff + clinic manager). */
export function countBranchTeamShare(branchId: string | null | undefined): number {
  if (!branchId) return 1
  const ids = new Set<string>()
  for (const s of getDirectoryStaff()) {
    if (s.status !== 'active') continue
    if (!matchesStaffBranch(s, branchId)) continue
    ids.add(s.email?.trim().toLowerCase() || s.id)
  }
  for (const u of getAccessUsers()) {
    if (u.status !== 'active') continue
    if (!u.branchId || !matchesStaffBranch(u, branchId)) continue
    if (
      u.role === 'BRANCH_ADMIN' ||
      u.role === 'DOCTOR' ||
      u.role === 'NURSE' ||
      u.role === 'AESTHETICIAN' ||
      u.role === 'RECEPTIONIST' ||
      u.role === 'STAFF'
    ) {
      ids.add(u.email?.trim().toLowerCase() || u.id)
    }
  }
  return Math.max(1, ids.size)
}

/** Calendar-month ₱2M milestone + equal 1% team split. */
export function computeBranchMilestoneSplit(input: {
  branchId: string | null | undefined
  /** YYYY-MM */
  periodMonth: string
}): {
  milestoneSales: number
  milestoneReached: boolean
  milestonePool: number
  milestoneTeamSize: number
  milestoneShare: number
  monthFrom: string
  monthTo: string
} {
  const periodMonth = input.periodMonth
  const monthFrom = `${periodMonth}-01`
  const [y, m] = periodMonth.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y!, m!, 0)).getUTCDate()
  const monthTo = `${periodMonth}-${String(lastDay).padStart(2, '0')}`
  const teamSize = countBranchTeamShare(input.branchId)

  let milestoneSales = 0
  if (input.branchId) {
    milestoneSales = round2(
      getBookingRows({ branchId: input.branchId })
        .filter((r) => {
          if (!isPaidBooking(r)) return false
          const day = saleDateKey(r.dateIso)
          return day >= monthFrom && day <= monthTo
        })
        .reduce((s, r) => s + (r.payment || 0), 0),
    )
  }
  const milestoneReached = milestoneSales >= BRANCH_SALES_MILESTONE
  const milestonePool = milestoneReached ? round2(milestoneSales * MILESTONE_SPLIT_RATE) : 0
  const milestoneShare = milestoneReached ? round2(milestonePool / teamSize) : 0
  return {
    milestoneSales,
    milestoneReached,
    milestonePool,
    milestoneTeamSize: teamSize,
    milestoneShare,
    monthFrom,
    monthTo,
  }
}
