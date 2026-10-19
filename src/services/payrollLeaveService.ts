/**
 * SL / VL days on salary — from approved leave filings and HR manual adjustments.
 * Each SL/VL day = 1 regular full-day pay (salary per day).
 */
import { PAYROLL_DEFAULT_SHIFT } from '@/constants/payrollRosterSeed'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import {
  countLeaveDays,
  leaveYear,
  listLeaveRequests,
  subscribeLeave,
} from '@/services/leaveService'
import type { LeaveRequest } from '@/types'
import { isUuid } from '@/utils/uuid'

function isLeaveWorkday(dateKey: string): boolean {
  const d = new Date(`${dateKey}T12:00:00+08:00`)
  const weekday = d.getUTCDay()
  return (PAYROLL_DEFAULT_SHIFT.workWeekdays as readonly number[]).includes(weekday)
}

const KEY = 'imajica_payroll_leave_adjustments'
const CHANGE = 'imajica:payroll-leave-changed'

export type PayrollLeaveAdjustment = {
  id: string
  userId: string
  /** Match key when userId is not a UUID (email or roster id) */
  matchKey: string
  employeeName: string
  periodFrom: string
  periodTo: string
  sickDays: number
  vacationDays: number
  notes?: string
  updatedAt: string
}

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

export function subscribePayrollLeaveAdjustments(listener: () => void) {
  window.addEventListener(CHANGE, listener)
  const unsubLeave = subscribeLeave(listener)
  return () => {
    window.removeEventListener(CHANGE, listener)
    unsubLeave()
  }
}

function readLocal(): PayrollLeaveAdjustment[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PayrollLeaveAdjustment[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(rows: PayrollLeaveAdjustment[], silent = false) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 2000)))
  if (!silent) emit()
}

function periodKey(from: string, to: string) {
  return `${from}|${to}`
}

/** Inclusive YYYY-MM-DD keys in range. */
export function dateKeysInRange(from: string, to: string): string[] {
  const keys: string[] = []
  const cursor = new Date(`${from}T12:00:00+08:00`)
  const end = new Date(`${to}T12:00:00+08:00`)
  while (cursor <= end) {
    const y = cursor.getUTCFullYear()
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0')
    const d = String(cursor.getUTCDate()).padStart(2, '0')
    keys.push(`${y}-${m}-${d}`)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return keys
}

/**
 * Count approved SL/VL days that fall on scheduled workdays inside the pay period.
 */
export function countApprovedLeaveInPeriod(input: {
  userIds: string[]
  employeeName?: string
  employeeEmail?: string
  /** All login / kiosk emails for this employee */
  employeeEmails?: string[]
  requests: LeaveRequest[]
  periodFrom: string
  periodTo: string
}): { sickDays: number; vacationDays: number; leaveDateKeys: Map<string, 'sick' | 'vacation'> } {
  const ids = new Set(input.userIds.filter(Boolean))
  const emails = new Set(
    [input.employeeEmail, ...(input.employeeEmails || [])]
      .map((e) => (e || '').trim().toLowerCase())
      .filter(Boolean),
  )
  const name = (input.employeeName || '').trim().toLowerCase()
  const leaveDateKeys = new Map<string, 'sick' | 'vacation'>()

  for (const r of input.requests) {
    if (r.status !== 'approved') continue
    if (r.leaveType !== 'sick' && r.leaveType !== 'vacation') continue
    const matchUser = ids.has(r.userId)
    const reqEmail = (r.employeeEmail || '').trim().toLowerCase()
    const matchEmail = Boolean(reqEmail) && emails.has(reqEmail)
    const matchName =
      Boolean(name) && r.employeeName.trim().toLowerCase() === name
    if (!matchUser && !matchEmail && !matchName) continue

    // Overlap of leave range with pay period
    const start = r.startDate > input.periodFrom ? r.startDate : input.periodFrom
    const end = r.endDate < input.periodTo ? r.endDate : input.periodTo
    if (start > end) continue

    for (const key of dateKeysInRange(start, end)) {
      if (!isLeaveWorkday(key)) continue
      leaveDateKeys.set(key, r.leaveType === 'sick' ? 'sick' : 'vacation')
    }
  }

  let sickDays = 0
  let vacationDays = 0
  for (const kind of leaveDateKeys.values()) {
    if (kind === 'sick') sickDays += 1
    else vacationDays += 1
  }
  return { sickDays, vacationDays, leaveDateKeys }
}

export function getPayrollLeaveAdjustments(
  periodFrom: string,
  periodTo: string,
): PayrollLeaveAdjustment[] {
  const pk = periodKey(periodFrom, periodTo)
  return readLocal().filter((r) => periodKey(r.periodFrom, r.periodTo) === pk)
}

export function findPayrollLeaveAdjustment(input: {
  userId?: string | null
  matchKey?: string
  email?: string
  periodFrom: string
  periodTo: string
}): PayrollLeaveAdjustment | undefined {
  const rows = getPayrollLeaveAdjustments(input.periodFrom, input.periodTo)
  const email = (input.email || '').trim().toLowerCase()
  const matchKey = (input.matchKey || '').trim().toLowerCase()
  return rows.find(
    (r) =>
      (input.userId && r.userId === input.userId) ||
      (matchKey && r.matchKey === matchKey) ||
      (email && r.matchKey === email),
  )
}

export async function preloadPayrollLeaveAdjustments(): Promise<void> {
  ensureVeronicaDefaultSl()
  if (!isSupabaseConfigured || !supabase) return
  const { data, error } = await supabase
    .from('payroll_leave_adjustments')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(2000)
  if (error || !data) return
  const mapped: PayrollLeaveAdjustment[] = (
    data as Array<{
      id: string
      user_id: string
      match_key: string | null
      employee_name: string | null
      period_from: string
      period_to: string
      sick_days: number
      vacation_days: number
      notes: string | null
      updated_at: string
    }>
  ).map((row) => ({
    id: row.id,
    userId: row.user_id,
    matchKey: (row.match_key || row.user_id || '').toLowerCase(),
    employeeName: row.employee_name || '',
    periodFrom: row.period_from,
    periodTo: row.period_to,
    sickDays: Math.max(0, Number(row.sick_days) || 0),
    vacationDays: Math.max(0, Number(row.vacation_days) || 0),
    notes: row.notes || undefined,
    updatedAt: row.updated_at,
  }))
  const byKey = new Map(readLocal().map((r) => [`${r.matchKey}|${r.periodFrom}|${r.periodTo}`, r]))
  for (const m of mapped) {
    byKey.set(`${m.matchKey}|${m.periodFrom}|${m.periodTo}`, m)
  }
  writeLocal([...byKey.values()], true)
}

export async function savePayrollLeaveAdjustment(input: {
  userId: string
  matchKey?: string
  employeeName: string
  email?: string
  periodFrom: string
  periodTo: string
  sickDays: number
  vacationDays: number
  notes?: string
}): Promise<PayrollLeaveAdjustment> {
  const matchKey = (
    input.matchKey ||
    input.email ||
    input.userId
  )
    .trim()
    .toLowerCase()
  const existing = findPayrollLeaveAdjustment({
    userId: input.userId,
    matchKey,
    email: input.email,
    periodFrom: input.periodFrom,
    periodTo: input.periodTo,
  })
  const nextId =
    existing?.id && isUuid(existing.id)
      ? existing.id
      : isUuid(input.userId)
        ? crypto.randomUUID()
        : existing?.id || `leave-adj-${Date.now()}`
  const row: PayrollLeaveAdjustment = {
    id: nextId,
    userId: input.userId,
    matchKey,
    employeeName: input.employeeName,
    periodFrom: input.periodFrom,
    periodTo: input.periodTo,
    sickDays: Math.max(0, Math.round(Number(input.sickDays) || 0)),
    vacationDays: Math.max(0, Math.round(Number(input.vacationDays) || 0)),
    notes: input.notes?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  }

  if (isSupabaseConfigured && supabase && isUuid(row.userId) && isUuid(row.id)) {
    const { error } = await supabase.from('payroll_leave_adjustments').upsert({
      id: row.id,
      user_id: row.userId,
      match_key: row.matchKey,
      employee_name: row.employeeName,
      period_from: row.periodFrom,
      period_to: row.periodTo,
      sick_days: row.sickDays,
      vacation_days: row.vacationDays,
      notes: row.notes ?? null,
      updated_at: row.updatedAt,
    })
    if (error) throw new Error(error.message || 'Could not save SL/VL adjustment')
  }

  const others = readLocal().filter(
    (r) =>
      !(
        r.periodFrom === row.periodFrom &&
        r.periodTo === row.periodTo &&
        (r.id === row.id || r.matchKey === row.matchKey || r.userId === row.userId)
      ),
  )
  writeLocal([...others, row])
  return row
}

/**
 * Seed: Veronica Mayo — 2 SL on the active semi-monthly cut (1–15 or 16–end).
 * Idempotent; only writes if no adjustment exists for that period yet.
 */
function ensureVeronicaDefaultSl() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const [y, m, dayStr] = today.split('-')
  const day = Number(dayStr)
  const month = `${y}-${m}`
  const lastDay = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate()
  const periodFrom = day <= 15 ? `${month}-01` : `${month}-16`
  const periodTo =
    day <= 15 ? `${month}-15` : `${month}-${String(lastDay).padStart(2, '0')}`
  const matchKey = 'veronnemay@gmail.com'
  const existing = findPayrollLeaveAdjustment({
    matchKey,
    email: matchKey,
    periodFrom,
    periodTo,
  })
  if (existing) return
  const row: PayrollLeaveAdjustment = {
    id: `leave-adj-veronica-${periodFrom}-${periodTo}`,
    userId: 'veronica-mayo',
    matchKey,
    employeeName: 'Veronica Mayo',
    periodFrom,
    periodTo,
    sickDays: 2,
    vacationDays: 0,
    notes: 'Seeded: 2 SL',
    updatedAt: new Date().toISOString(),
  }
  writeLocal([...readLocal(), row], true)
}

/** Re-export helpers used by payroll UI */
export { countLeaveDays, leaveYear, listLeaveRequests }
