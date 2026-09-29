import type { EntityStatus, ExpenseScope, ExpenseType, OperationalExpense } from '@/types'

const STORAGE_KEY = 'imajica_operational_expenses'
const CHANGE_EVENT = 'imajica:expenses-changed'

const DEFAULT_EXPENSES: OperationalExpense[] = []

function emit() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function readStored(): OperationalExpense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as OperationalExpense[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readDeleted(): Set<string> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_deleted`)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function getExpenses(): OperationalExpense[] {
  const extra = readStored()
  const deleted = readDeleted()
  const seedIds = new Set(DEFAULT_EXPENSES.map((e) => e.id))
  const overrides = new Map(extra.filter((e) => seedIds.has(e.id)).map((e) => [e.id, e]))
  const customs = extra.filter((e) => !seedIds.has(e.id))
  return [...customs, ...DEFAULT_EXPENSES.map((e) => overrides.get(e.id) ?? e)].filter(
    (e) => !deleted.has(e.id),
  )
}

export function saveExpense(expense: OperationalExpense): OperationalExpense {
  const extra = readStored()
  const idx = extra.findIndex((e) => e.id === expense.id)
  const next = idx >= 0 ? extra.map((e, i) => (i === idx ? expense : e)) : [expense, ...extra]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emit()
  return expense
}

export function createExpense(input: {
  name: string
  category: string
  department?: string
  amount: number
  type?: ExpenseType
  deductCash?: boolean
  status?: EntityStatus
  scope: ExpenseScope
  expenseDate: string
  branchName?: string
  notes?: string
}): OperationalExpense {
  const today = new Date().toISOString().slice(0, 10)
  return saveExpense({
    id: `exp-${Date.now()}`,
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
    branchName: input.branchName,
    notes: input.notes,
  })
}

export function deleteExpense(id: string) {
  if (id.startsWith('exp-') && !DEFAULT_EXPENSES.some((e) => e.id === id)) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(readStored().filter((e) => e.id !== id)),
    )
  } else {
    const deleted = readDeleted()
    deleted.add(id)
    localStorage.setItem(`${STORAGE_KEY}_deleted`, JSON.stringify([...deleted]))
  }
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
