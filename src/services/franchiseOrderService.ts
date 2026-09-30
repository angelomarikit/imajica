import type { BranchOrderItem, FranchiseOrder, FranchiseOrderStatus } from '@/types'

const STORAGE_KEY = 'imajica_franchise_orders'
const CHANGE_EVENT = 'imajica:franchise-orders-changed'

export const FRANCHISE_ORDER_SUPPLIER = 'Imajica Aesthetic'
export const FRANCHISE_UNIT_TYPES = ['Piece', 'Box', 'Bottle', 'Pack', 'Case', 'Liter', 'Set'] as const

export const FRANCHISE_BRANCHES = [
  'Dasmariñas, Cavite',
  'Bacoor, Cavite',
  'Imajica Franchise — Quezon City',
  'Imajica Franchise — Cebu',
  'Imajica Franchise — Davao',
  'Imajica Franchise — Baguio',
  'Imajica Franchise — Iloilo',
]

/** Seed empty so UI matches empty-state screenshot; users create via form */
const DEFAULT_ORDERS: FranchiseOrder[] = []

function withTotals(
  order: Omit<FranchiseOrder, 'itemCount' | 'subtotal' | 'totalAmount'> &
    Partial<Pick<FranchiseOrder, 'itemCount' | 'subtotal' | 'totalAmount'>>,
): FranchiseOrder {
  const subtotal = order.items.reduce((s, i) => s + i.lineTotal, 0)
  const shipping = order.shipping ?? 0
  const otherCharges = order.otherCharges ?? 0
  return {
    ...order,
    supplier: order.supplier || FRANCHISE_ORDER_SUPPLIER,
    shipping,
    otherCharges,
    deductOnDailyCash: order.deductOnDailyCash ?? false,
    itemCount: order.items.reduce((s, i) => s + i.quantity, 0),
    subtotal,
    totalAmount: subtotal + shipping + otherCharges,
  }
}

function emit() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function readStored(): FranchiseOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as FranchiseOrder[]
    return Array.isArray(parsed) ? parsed.map((o) => withTotals(o)) : []
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

export function getFranchiseOrders(): FranchiseOrder[] {
  const extra = readStored()
  const deleted = readDeleted()
  const seedIds = new Set(DEFAULT_ORDERS.map((o) => o.id))
  const overrides = new Map(extra.filter((o) => seedIds.has(o.id)).map((o) => [o.id, o]))
  const customs = extra.filter((o) => !seedIds.has(o.id))
  return [...customs, ...DEFAULT_ORDERS.map((o) => overrides.get(o.id) ?? o)]
    .filter((o) => !deleted.has(o.id))
    .sort(
      (a, b) =>
        b.orderDate.localeCompare(a.orderDate) || b.invoiceNumber.localeCompare(a.invoiceNumber),
    )
}

export function getFranchiseOrderById(id: string) {
  return getFranchiseOrders().find((o) => o.id === id)
}

export function nextFranchiseInvoiceNumber(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const prefix = `FO-${y}${m}${d}-`
  const existing = getFranchiseOrders()
    .map((o) => o.invoiceNumber)
    .filter((n) => n.startsWith(prefix))
  const seq =
    existing.reduce((max, n) => {
      const part = Number(n.slice(prefix.length))
      return Number.isFinite(part) ? Math.max(max, part) : max
    }, 0) + 1
  return `${prefix}${String(seq).padStart(4, '0')}`
}

export function saveFranchiseOrder(order: FranchiseOrder): FranchiseOrder {
  const normalized = withTotals(order)
  const extra = readStored()
  const idx = extra.findIndex((o) => o.id === order.id)
  const next = idx >= 0 ? extra.map((o, i) => (i === idx ? normalized : o)) : [normalized, ...extra]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emit()
  return normalized
}

export type FranchiseOrderInput = {
  franchiseBranch: string
  phone?: string
  contactPerson: string
  orderDate: string
  shipping?: number
  otherCharges?: number
  deductOnDailyCash?: boolean
  remarks?: string
  status?: FranchiseOrderStatus
  items: Omit<BranchOrderItem, 'id' | 'lineTotal' | 'itemNo'>[]
}

export function createFranchiseOrder(input: FranchiseOrderInput): FranchiseOrder {
  const items: BranchOrderItem[] = input.items.map((i, idx) => ({
    id: `foi-${Date.now()}-${idx}`,
    itemNo: idx + 1,
    category: i.category.trim() || 'Product',
    unitType: i.unitType.trim() || 'Piece',
    name: i.name.trim(),
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    lineTotal: i.quantity * i.unitPrice,
  }))
  return saveFranchiseOrder({
    id: `fo-${Date.now()}`,
    invoiceNumber: nextFranchiseInvoiceNumber(new Date(input.orderDate)),
    orderDate: input.orderDate,
    franchiseBranch: input.franchiseBranch.trim(),
    phone: input.phone?.trim() || undefined,
    contactPerson: input.contactPerson.trim().toUpperCase(),
    supplier: FRANCHISE_ORDER_SUPPLIER,
    itemCount: 0,
    subtotal: 0,
    shipping: input.shipping ?? 0,
    otherCharges: input.otherCharges ?? 0,
    totalAmount: 0,
    deductOnDailyCash: input.deductOnDailyCash ?? false,
    status: input.status ?? 'pending',
    remarks: input.remarks?.trim() || undefined,
    items,
    createdAt: new Date().toISOString().slice(0, 10),
  })
}

export function updateFranchiseOrder(id: string, input: FranchiseOrderInput): FranchiseOrder | null {
  const existing = getFranchiseOrderById(id)
  if (!existing) return null
  const items: BranchOrderItem[] = input.items.map((i, idx) => ({
    id: existing.items[idx]?.id ?? `foi-${Date.now()}-${idx}`,
    itemNo: idx + 1,
    category: i.category.trim() || 'Product',
    unitType: i.unitType.trim() || 'Piece',
    name: i.name.trim(),
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    lineTotal: i.quantity * i.unitPrice,
  }))
  return saveFranchiseOrder({
    ...existing,
    orderDate: input.orderDate,
    franchiseBranch: input.franchiseBranch.trim(),
    phone: input.phone?.trim() || undefined,
    contactPerson: input.contactPerson.trim().toUpperCase(),
    shipping: input.shipping ?? 0,
    otherCharges: input.otherCharges ?? 0,
    deductOnDailyCash: input.deductOnDailyCash ?? false,
    status: input.status ?? existing.status,
    remarks: input.remarks?.trim() || undefined,
    items,
  })
}

export function deleteFranchiseOrder(id: string) {
  if (id.startsWith('fo-') && !DEFAULT_ORDERS.some((o) => o.id === id)) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(readStored().filter((o) => o.id !== id)),
    )
  } else {
    const deleted = readDeleted()
    deleted.add(id)
    localStorage.setItem(`${STORAGE_KEY}_deleted`, JSON.stringify([...deleted]))
  }
  emit()
}

export function subscribeFranchiseOrders(listener: () => void) {
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
