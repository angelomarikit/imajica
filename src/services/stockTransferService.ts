import { demoBranches } from '@/constants/demoData'
import { getCatalogProducts, getConsumables } from '@/services/productCatalogService'
import type { StockTransfer, StockTransferItemType } from '@/types'

const LOG_KEY = 'imajica_stock_transfers'
const STOCK_KEY = 'imajica_branch_item_stock'
const CHANGE_EVENT = 'imajica:stock-transfers-changed'

const DEFAULT_PERFORMER = 'HQ Admin'

function emit() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function readLogs(): StockTransfer[] {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StockTransfer[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readStockMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STOCK_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStockMap(map: Record<string, number>) {
  localStorage.setItem(STOCK_KEY, JSON.stringify(map))
}

function stockKey(branchId: string, itemType: StockTransferItemType, itemId: string) {
  return `${branchId}:${itemType}:${itemId}`
}

/** Demo default available stock when none recorded yet */
function defaultStock(itemType: StockTransferItemType, itemId: string, branchId: string): number {
  if (itemType === 'consumable') {
    const c = getConsumables().find((x) => x.id === itemId)
    if (c) {
      if (c.branchId && c.branchId === branchId) return c.stock
      if (!c.branchId || c.branchName === 'Global') return Math.max(0, Math.floor(c.stock / 2))
    }
  }
  // Stable pseudo-random small stock for products so overview isn't always 0
  let h = 0
  const s = `${branchId}:${itemId}`
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return (h % 18) + 2
}

export function getStockTransfers(): StockTransfer[] {
  return readLogs().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getBranchStock(
  branchId: string,
  itemType: StockTransferItemType,
  itemId: string,
): number {
  const map = readStockMap()
  const key = stockKey(branchId, itemType, itemId)
  if (key in map) return map[key]
  return defaultStock(itemType, itemId, branchId)
}

export function getTransferableItems(itemType: StockTransferItemType) {
  if (itemType === 'product') {
    return getCatalogProducts().map((p) => ({ id: p.id, name: p.name }))
  }
  return getConsumables().map((c) => ({ id: c.id, name: c.name }))
}

export function createStockTransfer(input: {
  sourceBranchId: string
  targetBranchId: string
  itemType: StockTransferItemType
  itemId: string
  quantity: number
  remarks?: string
  performedBy?: string
}): StockTransfer {
  if (input.sourceBranchId === input.targetBranchId) {
    throw new Error('Source and target branches must be different')
  }
  const qty = Math.floor(input.quantity)
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be greater than zero')
  }

  const source = demoBranches.find((b) => b.id === input.sourceBranchId)
  const target = demoBranches.find((b) => b.id === input.targetBranchId)
  if (!source || !target) throw new Error('Invalid branch selection')

  const items = getTransferableItems(input.itemType)
  const item = items.find((i) => i.id === input.itemId)
  if (!item) throw new Error('Select a valid item')

  const available = getBranchStock(input.sourceBranchId, input.itemType, input.itemId)
  if (qty > available) {
    throw new Error(`Only ${available} available at source branch`)
  }

  const map = readStockMap()
  const fromKey = stockKey(input.sourceBranchId, input.itemType, input.itemId)
  const toKey = stockKey(input.targetBranchId, input.itemType, input.itemId)
  const fromCurrent = fromKey in map ? map[fromKey] : available
  const toCurrent =
    toKey in map
      ? map[toKey]
      : defaultStock(input.itemType, input.itemId, input.targetBranchId)

  map[fromKey] = fromCurrent - qty
  map[toKey] = toCurrent + qty
  writeStockMap(map)

  const today = new Date().toISOString().slice(0, 10)
  const entry: StockTransfer = {
    id: `st-${Date.now()}`,
    transferDate: today,
    itemType: input.itemType,
    itemId: input.itemId,
    itemName: item.name,
    sourceBranchId: source.id,
    sourceBranchName: source.name,
    targetBranchId: target.id,
    targetBranchName: target.name,
    quantity: qty,
    performedBy: input.performedBy?.trim() || DEFAULT_PERFORMER,
    remarks: input.remarks?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }

  localStorage.setItem(LOG_KEY, JSON.stringify([entry, ...readLogs()]))
  emit()
  return entry
}

export function subscribeStockTransfers(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOG_KEY || e.key === STOCK_KEY) listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}
