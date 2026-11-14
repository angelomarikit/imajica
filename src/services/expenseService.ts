/**
 * Administration → Operations → Expenses.
 * Supabase `operational_expenses` is source of truth (feeds Cash on Hand RPC).
 */
import type { EntityStatus, ExpenseScope, ExpenseType, OperationalExpense } from '@/types'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { getBranches } from '@/services/branchService'
import { isUuid } from '@/utils/uuid'

const STORAGE_KEY = 'imajica_operational_expenses'
const CHANGE_EVENT = 'imajica:expenses-changed'
const MIGRATED_FLAG = 'imajica_expenses_migrated_v1'

const DEFAULT_EXPENSES: OperationalExpense[] = []

type DbExpenseRow = {
  id: string
  name: string
  category: string
  department: string | null
  amount: number | string
  expense_type: ExpenseType
  deduct_cash: boolean
  status: EntityStatus
  scope: ExpenseScope
  expense_date: string
  branch_id: string | null
  notes: string | null
  created_at: string
  created_by?: string | null
}

let cache: OperationalExpense[] = []
let remoteReady = false
let preloadError: string | null = null

function branchNameForId(branchId: string | null | undefined): string | undefined {
  if (!branchId) return undefined
  return getBranches().find((b) => b.id === branchId)?.name
}

function mapDbRow(row: DbExpenseRow): OperationalExpense {
  const amount = typeof row.amount === 'number' ? row.amount : Number(row.amount)
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    department: row.department ?? undefined,
    amount: Number.isFinite(amount) ? amount : 0,
    type: row.expense_type ?? 'manual',
    deductCash: Boolean(row.deduct_cash),
    status: row.status === 'inactive' ? 'inactive' : 'active',
    scope: row.scope,
    expenseDate: row.expense_date.slice(0, 10),
    createdAt: row.created_at.slice(0, 10),
    branchId: row.branch_id ?? undefined,
    branchName: branchNameForId(row.branch_id),
    notes: row.notes ?? undefined,
  }
}

function expenseToDbPayload(expense: OperationalExpense, createdBy?: string | null) {
  return {
    name: expense.name.trim(),
    category: expense.category.trim(),
    department: expense.department?.trim() || null,
    amount: expense.amount,
    expense_type: expense.type ?? 'manual',
    deduct_cash: expense.deductCash,
    status: expense.status,
    scope: expense.scope,
    expense_date: expense.expenseDate,
    branch_id: expense.scope === 'branch' ? expense.branchId ?? null : null,
    notes: expense.notes?.trim() || null,
    ...(createdBy ? { created_by: createdBy } : {}),
  }
}

function emit() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function readStoredLegacy(): OperationalExpense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as OperationalExpense[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readDeletedLegacy(): Set<string> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_deleted`)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function getExpensesLegacy(): OperationalExpense[] {
  const extra = readStoredLegacy()
  const deleted = readDeletedLegacy()
  const seedIds = new Set(DEFAULT_EXPENSES.map((e) => e.id))
  const overrides = new Map(extra.filter((e) => seedIds.has(e.id)).map((e) => [e.id, e]))
  const customs = extra.filter((e) => !seedIds.has(e.id))
  return [...customs, ...DEFAULT_EXPENSES.map((e) => overrides.get(e.id) ?? e)].filter(
    (e) => !deleted.has(e.id),
  )
}

function upsertCache(expense: OperationalExpense) {
  const idx = cache.findIndex((e) => e.id === expense.id)
  cache = idx >= 0 ? cache.map((e, i) => (i === idx ? expense : e)) : [expense, ...cache]
}

function writeLocalMirror(expenses: OperationalExpense[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  } catch {
    /* quota */
  }
}

export function getExpenses(): OperationalExpense[] {
  if (isSupabaseConfigured && supabase && remoteReady) return [...cache]
  return getExpensesLegacy()
}

export function getExpensesPreloadError(): string | null {
  return preloadError
}

function expenseFingerprint(e: Pick<OperationalExpense, 'name' | 'expenseDate' | 'amount' | 'branchId' | 'scope'>) {
  return `${e.scope}|${e.branchId ?? ''}|${e.expenseDate}|${e.amount}|${e.name.trim().toLowerCase()}`
}

export async function preloadExpensesFromSupabase(options?: {
  branchId?: string
}): Promise<void> {
  preloadError = null
  if (!isSupabaseConfigured || !supabase) {
    remoteReady = false
    return
  }

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    remoteReady = false
    return
  }

  let query = supabase
    .from('operational_expenses')
    .select(
      'id, name, category, department, amount, expense_type, deduct_cash, status, scope, expense_date, branch_id, notes, created_at',
    )
    .order('expense_date', { ascending: false })

  if (options?.branchId) {
    query = query.or(`branch_id.eq.${options.branchId},scope.eq.ops`)
  }

  const { data, error } = await query

  if (error) {
    preloadError = error.message
    remoteReady = false
    console.warn('[expenses] preload failed', error.message)
    return
  }

  cache = (data ?? []).map((row) => mapDbRow(row as DbExpenseRow))
  remoteReady = true
  writeLocalMirror(cache)
  await migrateLocalExpensesToSupabase()
  emit()
}

export async function migrateLocalExpensesToSupabase(): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !remoteReady) return
  if (localStorage.getItem(MIGRATED_FLAG) === '1') return

  const local = getExpensesLegacy().filter((e) => !isUuid(e.id))
  if (local.length === 0) {
    localStorage.setItem(MIGRATED_FLAG, '1')
    return
  }

  const existing = new Set(cache.map(expenseFingerprint))
  const { data: userData } = await supabase.auth.getUser()
  const createdBy = userData.user?.id ?? null

  for (const exp of local) {
    const fp = expenseFingerprint(exp)
    if (existing.has(fp)) continue

    const payload = expenseToDbPayload(exp, createdBy)
    const { data: inserted, error } = await supabase
      .from('operational_expenses')
      .insert(payload)
      .select(
        'id, name, category, department, amount, expense_type, deduct_cash, status, scope, expense_date, branch_id, notes, created_at',
      )
      .single()

    if (error) {
      console.warn('[expenses] migrate insert failed', exp.name, error.message)
      continue
    }
    if (inserted) {
      const mapped = mapDbRow(inserted as DbExpenseRow)
      upsertCache(mapped)
      existing.add(fp)
    }
  }

  localStorage.setItem(MIGRATED_FLAG, '1')
  writeLocalMirror(cache)
  emit()
}

export async function saveExpense(expense: OperationalExpense): Promise<OperationalExpense> {
  const normalized: OperationalExpense = {
    ...expense,
    branchName: expense.branchName ?? branchNameForId(expense.branchId),
  }

  if (!isSupabaseConfigured || !supabase) {
    return saveExpenseLocal(normalized)
  }

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id ?? null

  if (isUuid(normalized.id)) {
    const { data, error } = await supabase
      .from('operational_expenses')
      .update({
        ...expenseToDbPayload(normalized),
        updated_at: new Date().toISOString(),
      })
      .eq('id', normalized.id)
      .select(
        'id, name, category, department, amount, expense_type, deduct_cash, status, scope, expense_date, branch_id, notes, created_at',
      )
      .single()

    if (error) throw new Error(error.message)
    const mapped = mapDbRow(data as DbExpenseRow)
    remoteReady = true
    upsertCache(mapped)
    writeLocalMirror(cache)
    emit()
    return mapped
  }

  const { data, error } = await supabase
    .from('operational_expenses')
    .insert({
      ...expenseToDbPayload(normalized, userId),
    })
    .select(
      'id, name, category, department, amount, expense_type, deduct_cash, status, scope, expense_date, branch_id, notes, created_at',
    )
    .single()

  if (error) throw new Error(error.message)
  const mapped = mapDbRow(data as DbExpenseRow)
  remoteReady = true
  upsertCache(mapped)
  writeLocalMirror(cache)
  emit()
  return mapped
}

function saveExpenseLocal(expense: OperationalExpense): OperationalExpense {
  const extra = readStoredLegacy()
  const idx = extra.findIndex((e) => e.id === expense.id)
  const next = idx >= 0 ? extra.map((e, i) => (i === idx ? expense : e)) : [expense, ...extra]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emit()
  return expense
}

export async function createExpense(input: {
  name: string
  category: string
  department?: string
  amount: number
  type?: ExpenseType
  deductCash?: boolean
  status?: EntityStatus
  scope: ExpenseScope
  expenseDate: string
  branchId?: string
  branchName?: string
  notes?: string
}): Promise<OperationalExpense> {
  const today = new Date().toISOString().slice(0, 10)
  const id = isSupabaseConfigured && supabase ? crypto.randomUUID() : `exp-${Date.now()}`
  return saveExpense({
    id,
    name: input.name.trim(),
    category: input.category.trim(),
    department: input.department?.trim() || undefined,
    amount: input.amount,
    type: input.type ?? 'manual',
    deductCash: input.deductCash ?? false,
    status: input.status ?? 'active',
    scope: input.scope,
    expenseDate: input.expenseDate,
    createdAt: today,
    branchId: input.branchId,
    branchName: input.branchName ?? branchNameForId(input.branchId),
    notes: input.notes,
  })
}

export async function deleteExpense(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const { error } = await supabase.from('operational_expenses').delete().eq('id', id)
    if (error) throw new Error(error.message)
    cache = cache.filter((e) => e.id !== id)
    remoteReady = true
    writeLocalMirror(cache)
    emit()
    return
  }

  if (id.startsWith('exp-') && !DEFAULT_EXPENSES.some((e) => e.id === id)) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(readStoredLegacy().filter((e) => e.id !== id)),
    )
  } else {
    const deleted = readDeletedLegacy()
    deleted.add(id)
    localStorage.setItem(`${STORAGE_KEY}_deleted`, JSON.stringify([...deleted]))
  }
  cache = cache.filter((e) => e.id !== id)
  emit()
}

export function subscribeExpenses(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === `${STORAGE_KEY}_deleted`) listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}