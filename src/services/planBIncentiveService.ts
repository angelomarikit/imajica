import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { PlanBIncentive } from '@/types'
import { isUuid } from '@/utils/uuid'

const KEY = 'imajica_plan_b_incentives'
const CHANGE = 'imajica:plan-b-changed'

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

function readLocal(): PlanBIncentive[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PlanBIncentive[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(rows: PlanBIncentive[]) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 500)))
  emit()
}

function mapRow(row: {
  id: string
  staff_user_id: string
  staff_name: string
  branch_id: string
  branch_name: string | null
  period_month: string
  amount: number
  notes: string | null
  created_by_user_id: string
  created_by_name: string | null
  created_at: string
  updated_at: string
}): PlanBIncentive {
  return {
    id: row.id,
    staffUserId: row.staff_user_id,
    staffName: row.staff_name,
    branchId: row.branch_id,
    branchName: row.branch_name || '',
    periodMonth: row.period_month,
    amount: Number(row.amount) || 0,
    notes: row.notes || undefined,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function subscribePlanBIncentives(listener: () => void) {
  window.addEventListener(CHANGE, listener)
  return () => window.removeEventListener(CHANGE, listener)
}

export function getPlanBIncentives(): PlanBIncentive[] {
  return readLocal().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function preloadPlanBIncentives(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const { data, error } = await supabase
    .from('plan_b_incentives')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(500)
  if (error) {
    if (!/does not exist|schema cache/i.test(error.message)) {
      console.error('[plan-b] preload failed', error.message)
    }
    return
  }
  if (!data) return
  writeLocal(data.map(mapRow))
}

export function listPlanBForStaff(opts: {
  staffUserId?: string
  staffName?: string
  periodMonth?: string
  branchId?: string
}): PlanBIncentive[] {
  const name = (opts.staffName || '').trim().toLowerCase()
  return getPlanBIncentives().filter((row) => {
    if (opts.periodMonth && row.periodMonth !== opts.periodMonth) return false
    if (opts.branchId && row.branchId !== opts.branchId) return false
    if (opts.staffUserId && row.staffUserId === opts.staffUserId) return true
    if (name && row.staffName.trim().toLowerCase() === name) return true
    if (opts.staffUserId || name) return false
    return true
  })
}

export function sumPlanBForStaff(opts: {
  staffUserId?: string
  staffName?: string
  periodMonth?: string
}): number {
  return listPlanBForStaff(opts).reduce((sum, r) => sum + r.amount, 0)
}

export async function savePlanBIncentive(input: {
  id?: string
  staffUserId: string
  staffName: string
  branchId: string
  branchName: string
  periodMonth: string
  amount: number
  notes?: string
  createdByUserId: string
  createdByName: string
}): Promise<PlanBIncentive> {
  const now = new Date().toISOString()
  const id = input.id || (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `planb-${Date.now()}`)
  const existing = input.id ? getPlanBIncentives().find((r) => r.id === input.id) : undefined

  const row: PlanBIncentive = {
    id,
    staffUserId: input.staffUserId,
    staffName: input.staffName.trim(),
    branchId: input.branchId,
    branchName: input.branchName,
    periodMonth: input.periodMonth,
    amount: Math.max(0, Math.round(input.amount * 100) / 100),
    notes: input.notes?.trim() || undefined,
    createdByUserId: existing?.createdByUserId || input.createdByUserId,
    createdByName: existing?.createdByName || input.createdByName,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  if (isSupabaseConfigured && supabase && isUuid(row.branchId) && isUuid(row.id)) {
    const payload = {
      id: row.id,
      staff_user_id: row.staffUserId,
      staff_name: row.staffName,
      branch_id: row.branchId,
      branch_name: row.branchName,
      period_month: row.periodMonth,
      amount: row.amount,
      notes: row.notes ?? null,
      created_by_user_id: row.createdByUserId,
      created_by_name: row.createdByName,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    }
    const { error } = await supabase.from('plan_b_incentives').upsert(payload)
    if (error && !/does not exist|schema cache/i.test(error.message)) {
      throw new Error(error.message || 'Could not save Plan B incentive')
    }
  }

  const all = getPlanBIncentives()
  const idx = all.findIndex((r) => r.id === row.id)
  const next = idx >= 0 ? all.map((r, i) => (i === idx ? row : r)) : [row, ...all]
  writeLocal(next)
  return row
}

export async function deletePlanBIncentive(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const { error } = await supabase.from('plan_b_incentives').delete().eq('id', id)
    if (error && !/does not exist|schema cache/i.test(error.message)) {
      throw new Error(error.message || 'Could not delete Plan B incentive')
    }
  }
  writeLocal(getPlanBIncentives().filter((r) => r.id !== id))
}

export function currentPeriodMonth(date = new Date()): string {
  const key = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
  }).format(date)
  // en-CA → YYYY-MM-DD; take YYYY-MM
  return key.slice(0, 7)
}

export function formatPeriodMonthLabel(periodMonth: string): string {
  const [y, m] = periodMonth.split('-').map(Number)
  if (!y || !m) return periodMonth
  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(new Date(Date.UTC(y, m - 1, 15)))
}
