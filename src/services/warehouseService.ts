import type { WarehouseItem, WarehouseItemType, WarehouseStockMovement } from '@/types'

const STORAGE_KEY = 'imajica_warehouse_items'
const MOVEMENTS_KEY = 'imajica_warehouse_movements'
const CHANGE_EVENT = 'imajica:warehouse-changed'

export const WAREHOUSE_UNIT_TYPES = [
  'Piece',
  'Box',
  'Bottle',
  'Pack',
  'Case',
  'Liter',
  'Set',
  'Tube',
] as const

const DEFAULT_ITEMS: WarehouseItem[] = []

function emit() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function readItems(): WarehouseItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WarehouseItem[]
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

function readMovements(): WarehouseStockMovement[] {
  try {
    const raw = localStorage.getItem(MOVEMENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WarehouseStockMovement[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getWarehouseItems(): WarehouseItem[] {
  const extra = readItems()
  const deleted = readDeleted()
  const seedIds = new Set(DEFAULT_ITEMS.map((i) => i.id))
  const overrides = new Map(extra.filter((i) => seedIds.has(i.id)).map((i) => [i.id, i]))
  const customs = extra.filter((i) => !seedIds.has(i.id))
  return [...customs, ...DEFAULT_ITEMS.map((i) => overrides.get(i.id) ?? i)]
    .filter((i) => !deleted.has(i.id))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getWarehouseItemsByType(type: WarehouseItemType) {
  return getWarehouseItems().filter((i) => i.itemType === type)
}

export function getWarehouseItemById(id: string) {
  return getWarehouseItems().find((i) => i.id === id)
}

export function getWarehouseMovements(itemId: string) {
  return readMovements()
    .filter((m) => m.itemId === itemId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function saveWarehouseItem(item: WarehouseItem): WarehouseItem {
  const extra = readItems()
  const idx = extra.findIndex((i) => i.id === item.id)
  const next = idx >= 0 ? extra.map((i, n) => (n === idx ? item : i)) : [item, ...extra]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emit()
  return item
}

export function createWarehouseItem(input: {
  itemType: WarehouseItemType
  name: string
  unitType?: string
  warehouseStock: number
  acquisitionPrice: number
}): WarehouseItem {
  const stock = Math.max(0, Math.floor(input.warehouseStock))
  const item = saveWarehouseItem({
    id: `wh-${input.itemType[0]}-${Date.now()}`,
    itemType: input.itemType,
    name: input.name.trim().toUpperCase(),
    unitType: input.unitType || undefined,
    warehouseStock: stock,
    acquisitionPrice: Math.max(0, input.acquisitionPrice),
    createdAt: new Date().toISOString().slice(0, 10),
  })
  if (stock > 0) {
    const movements = readMovements()
    movements.unshift({
      id: `whm-${Date.now()}`,
      itemId: item.id,
      delta: stock,
      note: 'Initial stock',
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements.slice(0, 500)))
    emit()
  }
  return item
}

export function updateWarehouseItem(
  id: string,
  patch: Partial<Pick<WarehouseItem, 'name' | 'unitType' | 'acquisitionPrice' | 'itemType'>>,
): WarehouseItem | null {
  const existing = getWarehouseItemById(id)
  if (!existing) return null
  return saveWarehouseItem({
    ...existing,
    ...patch,
    name: patch.name ? patch.name.trim().toUpperCase() : existing.name,
  })
}

export function adjustWarehouseStock(id: string, delta: number, note?: string): WarehouseItem | null {
  const existing = getWarehouseItemById(id)
  if (!existing) return null
  const nextStock = Math.max(0, existing.warehouseStock + delta)
  const actualDelta = nextStock - existing.warehouseStock
  if (actualDelta === 0 && delta !== 0) return existing
  const updated = saveWarehouseItem({ ...existing, warehouseStock: nextStock })
  if (actualDelta !== 0) {
    const movements = readMovements()
    movements.unshift({
      id: `whm-${Date.now()}`,
      itemId: id,
      delta: actualDelta,
      note,
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements.slice(0, 500)))
    emit()
  }
  return updated
}

export function deleteWarehouseItem(id: string) {
  if (!DEFAULT_ITEMS.some((i) => i.id === id)) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(readItems().filter((i) => i.id !== id)),
    )
  } else {
    const deleted = readDeleted()
    deleted.add(id)
    localStorage.setItem(`${STORAGE_KEY}_deleted`, JSON.stringify([...deleted]))
  }
  emit()
}

export function subscribeWarehouse(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === STORAGE_KEY ||
      e.key === `${STORAGE_KEY}_deleted` ||
      e.key === MOVEMENTS_KEY
    ) {
      listener()
    }
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}
