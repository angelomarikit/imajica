import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type {
  LeaveBalance,
  LeaveRequest,
  LeaveRequestSource,
  LeaveRequestStatus,
  LeaveType,
} from '@/types'
import { isUuid } from '@/utils/uuid'

const BALANCE_KEY = 'imajica_leave_balances'
const REQUEST_KEY = 'imajica_leave_requests'
const CHANGE = 'imajica:leave-changed'

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  sick: 'Sick leave',
  vacation: 'Vacation leave',
  emergency: 'Emergency leave',
}

export const DEFAULT_LEAVE_CREDITS = {
  sickDays: 10,
  vacationDays: 15,
  emergencyDays: 5,
} as const

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

export function subscribeLeave(listener: () => void) {
  window.addEventListener(CHANGE, listener)
  return () => window.removeEventListener(CHANGE, listener)
}

export function leaveYear(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
    }).format(date),
  )
}

/** Inclusive calendar-day count (YYYY-MM-DD). */
export function countLeaveDays(startDate: string, endDate: string): number {
  const a = new Date(`${startDate}T12:00:00`)
  const b = new Date(`${endDate}T12:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1
}

function readBalances(): LeaveBalance[] {
  try {
    const raw = localStorage.getItem(BALANCE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LeaveBalance[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeBalances(rows: LeaveBalance[], opts?: { silent?: boolean }) {
  localStorage.setItem(BALANCE_KEY, JSON.stringify(rows))
  if (!opts?.silent) emit()
}

function readRequests(): LeaveRequest[] {
  try {
    const raw = localStorage.getItem(REQUEST_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LeaveRequest[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRequests(rows: LeaveRequest[], opts?: { silent?: boolean }) {
  localStorage.setItem(REQUEST_KEY, JSON.stringify(rows.slice(0, 2000)))
  if (!opts?.silent) emit()
}

function mapBalance(row: {
  id: string
  user_id: string
  year: number
  sick_days: number
  vacation_days: number
  emergency_days: number
  sick_used: number
  vacation_used: number
  emergency_used: number
  updated_at: string
}): LeaveBalance {
  return {
    id: row.id,
    userId: row.user_id,
    year: row.year,
    sickDays: Number(row.sick_days) || 0,
    vacationDays: Number(row.vacation_days) || 0,
    emergencyDays: Number(row.emergency_days) || 0,
    sickUsed: Number(row.sick_used) || 0,
    vacationUsed: Number(row.vacation_used) || 0,
    emergencyUsed: Number(row.emergency_used) || 0,
    updatedAt: row.updated_at,
  }
}

function mapRequest(row: {
  id: string
  user_id: string
  employee_name: string
  employee_email: string | null
  branch_id: string | null
  branch_name: string | null
  leave_type: string
  start_date: string
  end_date: string
  days: number
  reason: string | null
  status: string
  source: string
  reviewed_by: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}): LeaveRequest {
  return {
    id: row.id,
    userId: row.user_id,
    employeeName: row.employee_name,
    employeeEmail: row.employee_email || undefined,
    branchId: row.branch_id,
    branchName: row.branch_name || '',
    leaveType: row.leave_type as LeaveType,
    startDate: row.start_date,
    endDate: row.end_date,
    days: Number(row.days) || 0,
    reason: row.reason || undefined,
    status: row.status as LeaveRequestStatus,
    source: row.source as LeaveRequestSource,
    reviewedBy: row.reviewed_by,
    reviewedByName: row.reviewed_by_name || undefined,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function defaultBalance(userId: string, year: number): LeaveBalance {
  return {
    id: `local-bal-${userId}-${year}`,
    userId,
    year,
    sickDays: DEFAULT_LEAVE_CREDITS.sickDays,
    vacationDays: DEFAULT_LEAVE_CREDITS.vacationDays,
    emergencyDays: DEFAULT_LEAVE_CREDITS.emergencyDays,
    sickUsed: 0,
    vacationUsed: 0,
    emergencyUsed: 0,
    updatedAt: new Date().toISOString(),
  }
}

export function remainingCredits(balance: LeaveBalance, type: LeaveType): number {
  if (type === 'sick') return Math.max(0, balance.sickDays - balance.sickUsed)
  if (type === 'vacation') return Math.max(0, balance.vacationDays - balance.vacationUsed)
  return Math.max(0, balance.emergencyDays - balance.emergencyUsed)
}

function applyUsage(balance: LeaveBalance, type: LeaveType, days: number, direction: 1 | -1): LeaveBalance {
  const delta = days * direction
  if (type === 'sick') return { ...balance, sickUsed: Math.max(0, balance.sickUsed + delta) }
  if (type === 'vacation') return { ...balance, vacationUsed: Math.max(0, balance.vacationUsed + delta) }
  return { ...balance, emergencyUsed: Math.max(0, balance.emergencyUsed + delta) }
}

async function persistBalance(
  balance: LeaveBalance,
  opts?: { silent?: boolean },
): Promise<LeaveBalance> {
  const now = new Date().toISOString()
  const next = { ...balance, updatedAt: now }

  if (isSupabaseConfigured && supabase && isUuid(balance.userId)) {
    const payload = {
      user_id: balance.userId,
      year: balance.year,
      sick_days: next.sickDays,
      vacation_days: next.vacationDays,
      emergency_days: next.emergencyDays,
      sick_used: next.sickUsed,
      vacation_used: next.vacationUsed,
      emergency_used: next.emergencyUsed,
      updated_at: now,
    }
    const { data, error } = await supabase
      .from('leave_balances')
      .upsert(payload, { onConflict: 'user_id,year' })
      .select('*')
      .single()
    if (!error && data) {
      const mapped = mapBalance(data as Parameters<typeof mapBalance>[0])
      const local = readBalances().filter((b) => !(b.userId === mapped.userId && b.year === mapped.year))
      writeBalances([mapped, ...local], { silent: opts?.silent })
      return mapped
    }
  }

  const all = readBalances()
  const idx = all.findIndex((b) => b.userId === next.userId && b.year === next.year)
  const merged = idx >= 0 ? all.map((b, i) => (i === idx ? next : b)) : [next, ...all]
  writeBalances(merged, { silent: opts?.silent })
  return next
}

export async function getLeaveBalance(userId: string, year = leaveYear()): Promise<LeaveBalance> {
  if (isSupabaseConfigured && supabase && isUuid(userId)) {
    const { data, error } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .maybeSingle()
    if (!error && data) {
      const mapped = mapBalance(data as Parameters<typeof mapBalance>[0])
      const local = readBalances().filter((b) => !(b.userId === userId && b.year === year))
      writeBalances([mapped, ...local], { silent: true })
      return mapped
    }
  }

  const existing = readBalances().find((b) => b.userId === userId && b.year === year)
  if (existing) return existing

  // Default credits in local cache only — do not emit (avoids HR page refresh loops)
  const created = defaultBalance(userId, year)
  const all = readBalances().filter((b) => !(b.userId === userId && b.year === year))
  writeBalances([created, ...all], { silent: true })
  return created
}

/** Batch-load balances for the credits table (one pass, no event storms). */
export async function listLeaveBalancesForUsers(
  userIds: string[],
  year = leaveYear(),
): Promise<Map<string, LeaveBalance>> {
  const map = new Map<string, LeaveBalance>()
  const ids = [...new Set(userIds.filter(Boolean))]
  if (!ids.length) return map

  if (isSupabaseConfigured && supabase) {
    const uuidIds = ids.filter((id) => isUuid(id))
    if (uuidIds.length) {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('year', year)
        .in('user_id', uuidIds)
      if (!error && data) {
        for (const row of data as Parameters<typeof mapBalance>[0][]) {
          const mapped = mapBalance(row)
          map.set(mapped.userId, mapped)
        }
        const local = readBalances().filter(
          (b) => !(b.year === year && uuidIds.includes(b.userId)),
        )
        writeBalances([...map.values(), ...local], { silent: true })
      }
    }
  }

  for (const id of ids) {
    if (map.has(id)) continue
    map.set(id, await getLeaveBalance(id, year))
  }
  return map
}

export async function setLeaveCredits(input: {
  userId: string
  year?: number
  sickDays: number
  vacationDays: number
  emergencyDays: number
}): Promise<LeaveBalance> {
  const year = input.year ?? leaveYear()
  const current = await getLeaveBalance(input.userId, year)
  return persistBalance({
    ...current,
    sickDays: Math.max(0, input.sickDays),
    vacationDays: Math.max(0, input.vacationDays),
    emergencyDays: Math.max(0, input.emergencyDays),
  })
}

export async function listLeaveRequests(opts?: {
  userId?: string
  branchId?: string | null
  status?: LeaveRequestStatus | 'all'
  year?: number
}): Promise<LeaveRequest[]> {
  const year = opts?.year ?? leaveYear()
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('leave_requests').select('*').order('created_at', { ascending: false }).limit(1000)
    if (opts?.userId) query = query.eq('user_id', opts.userId)
    if (opts?.branchId) query = query.eq('branch_id', opts.branchId)
    if (opts?.status && opts.status !== 'all') query = query.eq('status', opts.status)
    query = query.gte('start_date', yearStart).lte('start_date', yearEnd)
    const { data, error } = await query
    if (!error && data) {
      const mapped = (data as Parameters<typeof mapRequest>[0][]).map(mapRequest)
      // Merge into local cache for offline helpers (silent — reads must not re-trigger UI)
      const others = readRequests().filter((r) => !mapped.some((m) => m.id === r.id))
      writeRequests([...mapped, ...others], { silent: true })
      return mapped
    }
  }

  return readRequests()
    .filter((r) => {
      if (opts?.userId && r.userId !== opts.userId) return false
      if (opts?.branchId && r.branchId !== opts.branchId) return false
      if (opts?.status && opts.status !== 'all' && r.status !== opts.status) return false
      if (r.startDate < yearStart || r.startDate > yearEnd) return false
      return true
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

async function saveRequestRow(row: LeaveRequest): Promise<LeaveRequest> {
  if (isSupabaseConfigured && supabase && isUuid(row.id) && isUuid(row.userId)) {
    const payload = {
      id: row.id,
      user_id: row.userId,
      employee_name: row.employeeName,
      employee_email: row.employeeEmail ?? null,
      branch_id: row.branchId && isUuid(row.branchId) ? row.branchId : null,
      branch_name: row.branchName || null,
      leave_type: row.leaveType,
      start_date: row.startDate,
      end_date: row.endDate,
      days: row.days,
      reason: row.reason ?? null,
      status: row.status,
      source: row.source,
      reviewed_by: row.reviewedBy && isUuid(row.reviewedBy) ? row.reviewedBy : null,
      reviewed_by_name: row.reviewedByName ?? null,
      reviewed_at: row.reviewedAt ?? null,
      review_note: row.reviewNote ?? null,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    }
    const { data, error } = await supabase.from('leave_requests').upsert(payload).select('*').single()
    if (error) throw new Error(error.message)
    if (data) {
      const mapped = mapRequest(data as Parameters<typeof mapRequest>[0])
      const all = readRequests().filter((r) => r.id !== mapped.id)
      writeRequests([mapped, ...all], { silent: false })
      return mapped
    }
  }

  const all = readRequests()
  const idx = all.findIndex((r) => r.id === row.id)
  const next = idx >= 0 ? all.map((r, i) => (i === idx ? row : r)) : [row, ...all]
  writeRequests(next)
  return row
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `leave-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function applyForLeave(input: {
  userId: string
  employeeName: string
  employeeEmail?: string
  branchId?: string | null
  branchName?: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  reason?: string
}): Promise<LeaveRequest> {
  const days = countLeaveDays(input.startDate, input.endDate)
  if (days <= 0) throw new Error('Invalid leave dates')

  const year = Number(input.startDate.slice(0, 4)) || leaveYear()
  const balance = await getLeaveBalance(input.userId, year)
  const remaining = remainingCredits(balance, input.leaveType)
  if (days > remaining) {
    throw new Error(
      `Not enough ${LEAVE_TYPE_LABELS[input.leaveType].toLowerCase()} credits (${remaining} left, need ${days}).`,
    )
  }

  const now = new Date().toISOString()
  const row: LeaveRequest = {
    id: newId(),
    userId: input.userId,
    employeeName: input.employeeName.trim(),
    employeeEmail: input.employeeEmail,
    branchId: input.branchId ?? null,
    branchName: input.branchName || '',
    leaveType: input.leaveType,
    startDate: input.startDate,
    endDate: input.endDate,
    days,
    reason: input.reason?.trim() || undefined,
    status: 'pending',
    source: 'employee_applied',
    createdAt: now,
    updatedAt: now,
  }
  return saveRequestRow(row)
}

/** HR / manager designates leave for an employee (auto-approved + credits deducted). */
export async function designateLeave(input: {
  userId: string
  employeeName: string
  employeeEmail?: string
  branchId?: string | null
  branchName?: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  reason?: string
  reviewerId: string
  reviewerName: string
  source?: LeaveRequestSource
}): Promise<LeaveRequest> {
  const days = countLeaveDays(input.startDate, input.endDate)
  if (days <= 0) throw new Error('Invalid leave dates')

  const year = Number(input.startDate.slice(0, 4)) || leaveYear()
  const balance = await getLeaveBalance(input.userId, year)
  const remaining = remainingCredits(balance, input.leaveType)
  if (days > remaining) {
    throw new Error(
      `Not enough ${LEAVE_TYPE_LABELS[input.leaveType].toLowerCase()} credits (${remaining} left, need ${days}).`,
    )
  }

  const now = new Date().toISOString()
  const row: LeaveRequest = {
    id: newId(),
    userId: input.userId,
    employeeName: input.employeeName.trim(),
    employeeEmail: input.employeeEmail,
    branchId: input.branchId ?? null,
    branchName: input.branchName || '',
    leaveType: input.leaveType,
    startDate: input.startDate,
    endDate: input.endDate,
    days,
    reason: input.reason?.trim() || undefined,
    status: 'approved',
    source: input.source || 'hr_designated',
    reviewedBy: input.reviewerId,
    reviewedByName: input.reviewerName,
    reviewedAt: now,
    reviewNote: 'Designated by approver',
    createdAt: now,
    updatedAt: now,
  }
  const saved = await saveRequestRow(row)
  await persistBalance(applyUsage(balance, input.leaveType, days, 1))
  return saved
}

export async function reviewLeaveRequest(input: {
  id: string
  status: 'approved' | 'rejected'
  reviewerId: string
  reviewerName: string
  reviewNote?: string
}): Promise<LeaveRequest> {
  const all = await listLeaveRequests({ status: 'all', year: leaveYear() })
  // Also search local / other years
  const found =
    all.find((r) => r.id === input.id) ||
    readRequests().find((r) => r.id === input.id) ||
    (isSupabaseConfigured && supabase
      ? await (async () => {
          const { data } = await supabase!.from('leave_requests').select('*').eq('id', input.id).maybeSingle()
          return data ? mapRequest(data as Parameters<typeof mapRequest>[0]) : null
        })()
      : null)

  if (!found) throw new Error('Leave request not found')
  if (found.status !== 'pending') throw new Error('Only pending requests can be reviewed')

  const now = new Date().toISOString()
  if (input.status === 'approved') {
    const year = Number(found.startDate.slice(0, 4)) || leaveYear()
    const balance = await getLeaveBalance(found.userId, year)
    const remaining = remainingCredits(balance, found.leaveType)
    if (found.days > remaining) {
      throw new Error(
        `Cannot approve — only ${remaining} ${LEAVE_TYPE_LABELS[found.leaveType].toLowerCase()} credit(s) left.`,
      )
    }
    await persistBalance(applyUsage(balance, found.leaveType, found.days, 1))
  }

  return saveRequestRow({
    ...found,
    status: input.status,
    reviewedBy: input.reviewerId,
    reviewedByName: input.reviewerName,
    reviewedAt: now,
    reviewNote: input.reviewNote?.trim() || undefined,
    updatedAt: now,
  })
}

export async function cancelLeaveRequest(input: {
  id: string
  byUserId: string
  asApprover?: boolean
}): Promise<LeaveRequest> {
  const found =
    readRequests().find((r) => r.id === input.id) ||
    (await listLeaveRequests({ status: 'all' })).find((r) => r.id === input.id)

  if (!found) throw new Error('Leave request not found')
  if (!input.asApprover && found.userId !== input.byUserId) {
    throw new Error('Not allowed to cancel this request')
  }
  if (found.status === 'cancelled' || found.status === 'rejected') {
    throw new Error('Request is already closed')
  }

  const now = new Date().toISOString()
  if (found.status === 'approved') {
    const year = Number(found.startDate.slice(0, 4)) || leaveYear()
    const balance = await getLeaveBalance(found.userId, year)
    await persistBalance(applyUsage(balance, found.leaveType, found.days, -1))
  }

  return saveRequestRow({
    ...found,
    status: 'cancelled',
    updatedAt: now,
  })
}

export function statusTone(status: LeaveRequestStatus) {
  if (status === 'approved') return 'success' as const
  if (status === 'rejected') return 'danger' as const
  if (status === 'cancelled') return 'neutral' as const
  return 'warning' as const
}
