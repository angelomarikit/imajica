import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { BuiltPayslip } from '@/services/payslipCompute'
import { isUuid } from '@/utils/uuid'

const KEY = 'imajica_employee_payslips'
const CHANGE = 'imajica:payslips-changed'

export type EmployeePayslipStatus = 'draft' | 'sent' | 'viewed'

export type EmployeePayslip = {
  id: string
  employeeUserId: string | null
  employeeEmail: string
  employeeName: string
  branchId: string | null
  branchName: string
  periodFrom: string
  periodTo: string
  periodLabel: string
  grossEarnings: number
  totalIncentives: number
  totalDeductions: number
  netPay: number
  /** Full built payslip snapshot for transparent employee view */
  snapshot: BuiltPayslip
  status: EmployeePayslipStatus
  sentByUserId: string
  sentByName: string
  sentAt: string
  createdAt: string
}

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

function readLocal(): EmployeePayslip[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as EmployeePayslip[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(rows: EmployeePayslip[]) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 400)))
  emit()
}

export function subscribePayslips(listener: () => void) {
  window.addEventListener(CHANGE, listener)
  return () => window.removeEventListener(CHANGE, listener)
}

export function getPayslips(): EmployeePayslip[] {
  return readLocal().sort((a, b) => b.sentAt.localeCompare(a.sentAt))
}

export function listPayslipsForEmployee(opts: {
  userId?: string | null
  email?: string | null
}): EmployeePayslip[] {
  const email = (opts.email || '').trim().toLowerCase()
  return getPayslips().filter((p) => {
    if (p.status !== 'sent' && p.status !== 'viewed') return false
    if (opts.userId && p.employeeUserId === opts.userId) return true
    if (email && p.employeeEmail.trim().toLowerCase() === email) return true
    return false
  })
}

export async function preloadPayslips(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const { data, error } = await supabase
    .from('employee_payslips')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(400)
  if (error) {
    if (!/does not exist|schema cache/i.test(error.message)) {
      console.error('[payslips] preload failed', error.message)
    }
    return
  }
  if (!data) return
  writeLocal(
    data.map((row) => ({
      id: row.id,
      employeeUserId: row.employee_user_id,
      employeeEmail: row.employee_email,
      employeeName: row.employee_name,
      branchId: row.branch_id,
      branchName: row.branch_name || '',
      periodFrom: row.period_from,
      periodTo: row.period_to,
      periodLabel: row.period_label || '',
      grossEarnings: Number(row.gross_earnings) || 0,
      totalIncentives: Number(row.total_incentives) || 0,
      totalDeductions: Number(row.total_deductions) || 0,
      netPay: Number(row.net_pay) || 0,
      snapshot: row.snapshot as BuiltPayslip,
      status: (row.status as EmployeePayslipStatus) || 'sent',
      sentByUserId: row.sent_by_user_id,
      sentByName: row.sent_by_name || '',
      sentAt: row.sent_at,
      createdAt: row.created_at,
    })),
  )
}

/** HR sends a payslip — employee sees it on My Salary. */
export async function sendPayslipToEmployee(input: {
  payslip: BuiltPayslip
  sentByUserId: string
  sentByName: string
}): Promise<EmployeePayslip> {
  const now = new Date().toISOString()
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `payslip-${Date.now()}`
  const p = input.payslip
  const row: EmployeePayslip = {
    id,
    employeeUserId: p.matchedUserId,
    employeeEmail: p.email,
    employeeName: p.employeeName,
    branchId: p.base.employee.branchId,
    branchName: p.branchName,
    periodFrom: p.periodFrom,
    periodTo: p.periodTo,
    periodLabel: p.periodLabel,
    grossEarnings: p.grossEarnings,
    totalIncentives: p.totalIncentives,
    totalDeductions: p.totalDeductions,
    netPay: p.netPay,
    snapshot: p,
    status: 'sent',
    sentByUserId: input.sentByUserId,
    sentByName: input.sentByName,
    sentAt: now,
    createdAt: now,
  }

  if (isSupabaseConfigured && supabase && isUuid(row.id)) {
    const payload = {
      id: row.id,
      employee_user_id: row.employeeUserId,
      employee_email: row.employeeEmail,
      employee_name: row.employeeName,
      branch_id: row.branchId,
      branch_name: row.branchName,
      period_from: row.periodFrom,
      period_to: row.periodTo,
      period_label: row.periodLabel,
      gross_earnings: row.grossEarnings,
      total_incentives: row.totalIncentives,
      total_deductions: row.totalDeductions,
      net_pay: row.netPay,
      snapshot: row.snapshot,
      status: row.status,
      sent_by_user_id: row.sentByUserId,
      sent_by_name: row.sentByName,
      sent_at: row.sentAt,
      created_at: row.createdAt,
    }
    const { error } = await supabase.from('employee_payslips').upsert(payload)
    if (error && !/does not exist|schema cache/i.test(error.message)) {
      throw new Error(error.message || 'Could not send payslip')
    }
  }

  writeLocal([row, ...readLocal().filter((x) => x.id !== row.id)])
  return row
}

export function markPayslipViewed(id: string) {
  const rows = readLocal().map((r) =>
    r.id === id && r.status === 'sent' ? { ...r, status: 'viewed' as const } : r,
  )
  writeLocal(rows)
}

/** All released payslips HR can manage (local cache; preload first). */
export function listAllPayslips(): EmployeePayslip[] {
  return getPayslips().filter((p) => p.status === 'sent' || p.status === 'viewed')
}

export function listPayslipsForStaff(opts: {
  userId?: string | null
  email?: string | null
}): EmployeePayslip[] {
  const email = (opts.email || '').trim().toLowerCase()
  return listAllPayslips().filter((p) => {
    if (opts.userId && p.employeeUserId === opts.userId) return true
    if (email && p.employeeEmail.trim().toLowerCase() === email) return true
    return false
  })
}

/** HR removes a released payslip (e.g. wrong calculation). Employee My Salary updates immediately. */
export async function deletePayslip(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const { error } = await supabase.from('employee_payslips').delete().eq('id', id)
    if (error && !/does not exist|schema cache/i.test(error.message)) {
      throw new Error(error.message || 'Could not delete payslip')
    }
  }
  writeLocal(readLocal().filter((x) => x.id !== id))
}
