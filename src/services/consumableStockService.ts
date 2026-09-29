import type { ProductBranchStock, ProductStockHistoryEntry } from '@/types'
import { getBranches } from '@/services/branchService'
import { getConsumableById } from '@/services/productCatalogService'

const STOCKS_KEY = 'imajica_consumable_branch_stocks'
const HISTORY_KEY = 'imajica_consumable_stock_history'
const CHANGE = 'imajica:consumable-stock-changed'

type StockMap = Record<string, Array<{ branchId: string; stock: number }>>

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

function readStocks(): StockMap {
  try {
    const raw = localStorage.getItem(STOCKS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StockMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStocks(map: StockMap) {
  localStorage.setItem(STOCKS_KEY, JSON.stringify(map))
  emit()
}

function readHistory(): ProductStockHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ProductStockHistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeHistory(rows: ProductStockHistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(rows))
  emit()
}

/** All active branches including warehouse (matches View Consumable screenshot). */
export function getConsumableStockBranches() {
  return getBranches().filter((b) => b.status === 'active')
}

function distributeTotal(
  total: number,
  branches: ReturnType<typeof getConsumableStockBranches>,
): Array<{ branchId: string; stock: number }> {
  const rows = branches.map((b) => ({ branchId: b.id, stock: 0 }))
  if (total <= 0 || branches.length === 0) return rows

  const clinics = branches.filter((b) => b.branchType !== 'warehouse')
  const pool = clinics.length ? clinics : branches
  const pasig = pool.find((b) => /pasig/i.test(b.name)) ?? pool[0]!
  const sanMateo = pool.find((b) => /san mateo/i.test(b.name))

  const setStock = (id: string, qty: number) => {
    const row = rows.find((r) => r.branchId === id)
    if (row) row.stock = qty
  }

  if (total === 1) {
    setStock((sanMateo ?? pasig).id, 1)
  } else if (sanMateo && total > 1) {
    setStock(pasig.id, total - 1)
    setStock(sanMateo.id, 1)
  } else {
    setStock(pasig.id, total)
  }
  return rows
}

function ensureStocks(consumableId: string) {
  const map = readStocks()
  const branches = getConsumableStockBranches()
  const existing = map[consumableId]
  if (existing?.length) {
    const byId = new Map(existing.map((r) => [r.branchId, r.stock]))
    return branches.map((b) => ({
      branchId: b.id,
      stock: byId.get(b.id) ?? 0,
    }))
  }
  const item = getConsumableById(consumableId)
  const next = distributeTotal(item?.stock ?? 0, branches)
  map[consumableId] = next
  writeStocks(map)
  return next
}

export type ConsumableBranchStock = ProductBranchStock & { hasHistory: boolean }

export function getConsumableBranchStocks(consumableId: string): ConsumableBranchStock[] {
  const rows = ensureStocks(consumableId)
  const branches = getConsumableStockBranches()
  const history = readHistory().filter((h) => h.productId === consumableId)
  return branches.map((b) => {
    const stock = rows.find((r) => r.branchId === b.id)?.stock ?? 0
    return {
      branchId: b.id,
      branchName: b.name.replace(/ Branch$/, ''),
      stock,
      restockPoint: 0,
      hasHistory: stock > 0 || history.some((h) => h.branchId === b.id),
    }
  })
}

function ensureDemoHistory(consumableId: string) {
  const all = readHistory()
  if (all.some((h) => h.productId === consumableId)) return
  const stocks = getConsumableBranchStocks(consumableId)
  const withStock = stocks.filter((s) => s.stock > 0)
  if (withStock.length === 0) return

  const now = Date.now()
  const seed: ProductStockHistoryEntry[] = []
  for (const row of withStock) {
    seed.push({
      id: `csh-${consumableId}-${row.branchId}`,
      productId: consumableId,
      branchId: row.branchId,
      branchName: row.branchName,
      createdAt: new Date(now - 864e5 * 2).toISOString(),
      previousQty: Math.max(0, row.stock - 1),
      newQty: row.stock,
      adjustment: 1,
      movementType: 'stock adjustment',
      reference: 'INIT',
      notes: `Opening stock recorded for ${row.branchName}`,
    })
  }
  writeHistory([...seed, ...all])
}

export function getConsumableStockHistory(
  consumableId: string,
  branchId?: string,
): ProductStockHistoryEntry[] {
  ensureDemoHistory(consumableId)
  return readHistory()
    .filter((h) => h.productId === consumableId && (!branchId || h.branchId === branchId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function subscribeConsumableStock(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STOCKS_KEY || e.key === HISTORY_KEY) listener()
  }
  window.addEventListener(CHANGE, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE, listener)
    window.removeEventListener('storage', onStorage)
  }
}
