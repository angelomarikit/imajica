import type { BranchOrder, BranchOrderItem } from '@/types'

const STORAGE_KEY = 'imajica_branch_orders'
const CHANGE_EVENT = 'imajica:branch-orders-changed'

export const BRANCH_ORDER_SUPPLIER = 'Imajica Aesthetic'

const UNIT_TYPES = ['Piece', 'Box', 'Bottle', 'Pack', 'Case', 'Liter', 'Set'] as const

export function createBranchOrderLine(
  itemNo: number,
  category: string,
  unitType: string,
  name: string,
  quantity: number,
  unitPrice: number,
  id: string,
): BranchOrderItem {
  return {
    id,
    itemNo,
    category,
    unitType,
    name,
    quantity,
    unitPrice,
    lineTotal: quantity * unitPrice,
  }
}

function withTotals(
  order: Omit<BranchOrder, 'itemCount' | 'subtotal' | 'totalAmount'> &
    Partial<Pick<BranchOrder, 'itemCount' | 'subtotal' | 'totalAmount'>>,
): BranchOrder {
  const subtotal = order.items.reduce((s, i) => s + i.lineTotal, 0)
  const shipping = order.shipping ?? 0
  const otherCharges = order.otherCharges ?? 0
  return {
    ...order,
    supplier: order.supplier || BRANCH_ORDER_SUPPLIER,
    shipping,
    otherCharges,
    deductOnDailyCash: order.deductOnDailyCash ?? false,
    itemCount: order.items.reduce((s, i) => s + i.quantity, 0),
    subtotal,
    totalAmount: subtotal + shipping + otherCharges,
  }
}

const DEFAULT_ORDERS: BranchOrder[] = []

function emit() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function readStored(): BranchOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as BranchOrder[]
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

export function getBranchOrders(): BranchOrder[] {
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

export function getBranchOrderById(id: string) {
  return getBranchOrders().find((o) => o.id === id)
}

export function nextBranchInvoiceNumber(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const prefix = `BO-${y}${m}${d}-`
  const existing = getBranchOrders()
    .map((o) => o.invoiceNumber)
    .filter((n) => n.startsWith(prefix))
  const seq =
    existing.reduce((max, n) => {
      const part = Number(n.slice(prefix.length))
      return Number.isFinite(part) ? Math.max(max, part) : max
    }, 0) + 1
  return `${prefix}${String(seq).padStart(4, '0')}`
}

export function saveBranchOrder(order: BranchOrder): BranchOrder {
  const normalized = withTotals(order)
  const extra = readStored()
  const idx = extra.findIndex((o) => o.id === order.id)
  const next = idx >= 0 ? extra.map((o, i) => (i === idx ? normalized : o)) : [normalized, ...extra]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emit()
  return normalized
}

export type BranchOrderInput = {
  branchId?: string
  branchName: string
  phone?: string
  contactPerson: string
  orderDate: string
  shipping?: number
  otherCharges?: number
  deductOnDailyCash?: boolean
  remarks?: string
  items: Omit<BranchOrderItem, 'id' | 'lineTotal' | 'itemNo'>[]
}

export function createBranchOrder(input: BranchOrderInput): BranchOrder {
  const items: BranchOrderItem[] = input.items.map((i, idx) => ({
    id: `boi-${Date.now()}-${idx}`,
    itemNo: idx + 1,
    category: i.category.trim() || 'Product',
    unitType: i.unitType.trim() || 'Piece',
    name: i.name.trim(),
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    lineTotal: i.quantity * i.unitPrice,
  }))
  return saveBranchOrder({
    id: `bo-${Date.now()}`,
    invoiceNumber: nextBranchInvoiceNumber(new Date(input.orderDate)),
    orderDate: input.orderDate,
    branchId: input.branchId,
    branchName: input.branchName.trim(),
    phone: input.phone?.trim() || undefined,
    contactPerson: input.contactPerson.trim().toUpperCase(),
    supplier: BRANCH_ORDER_SUPPLIER,
    itemCount: 0,
    subtotal: 0,
    shipping: input.shipping ?? 0,
    otherCharges: input.otherCharges ?? 0,
    totalAmount: 0,
    deductOnDailyCash: input.deductOnDailyCash ?? false,
    status: 'submitted',
    remarks: input.remarks?.trim() || undefined,
    items,
    createdAt: new Date().toISOString().slice(0, 10),
  })
}

export function updateBranchOrder(id: string, input: BranchOrderInput): BranchOrder | null {
  const existing = getBranchOrderById(id)
  if (!existing) return null
  const items: BranchOrderItem[] = input.items.map((i, idx) => ({
    id: existing.items[idx]?.id ?? `boi-${Date.now()}-${idx}`,
    itemNo: idx + 1,
    category: i.category.trim() || 'Product',
    unitType: i.unitType.trim() || 'Piece',
    name: i.name.trim(),
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    lineTotal: i.quantity * i.unitPrice,
  }))
  return saveBranchOrder({
    ...existing,
    orderDate: input.orderDate,
    branchId: input.branchId,
    branchName: input.branchName.trim(),
    phone: input.phone?.trim() || undefined,
    contactPerson: input.contactPerson.trim().toUpperCase(),
    shipping: input.shipping ?? 0,
    otherCharges: input.otherCharges ?? 0,
    deductOnDailyCash: input.deductOnDailyCash ?? false,
    remarks: input.remarks?.trim() || undefined,
    items,
  })
}

export function deleteBranchOrder(id: string) {
  if (id.startsWith('bo-') && !DEFAULT_ORDERS.some((o) => o.id === id)) {
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

export function subscribeBranchOrders(listener: () => void) {
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

export { UNIT_TYPES }
