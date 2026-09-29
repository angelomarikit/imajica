import type { CatalogProduct, ConsumableItem, ProductCategory } from '@/types'
import { PRODUCT_CATALOG_SEED, type ProductSeedRow } from '@/constants/productCatalogSeed'
import { CONSUMABLE_CATALOG_SEED, type ConsumableSeedRow } from '@/constants/consumableCatalogSeed'

const CAT_KEY = 'imajica_product_categories'
const PROD_KEY = 'imajica_catalog_products'
const PROD_DELETED_KEY = 'imajica_catalog_products_deleted'
const CONS_KEY = 'imajica_consumables'
const CONS_DELETED_KEY = 'imajica_consumables_deleted'
const CHANGE = 'imajica:products-changed'

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items))
  emit()
}

const DEFAULT_CATEGORIES: ProductCategory[] = []

function readDeletedConsumableIds(): Set<string> {
  return new Set(read<string>(CONS_DELETED_KEY))
}

function writeDeletedConsumableIds(ids: Set<string>) {
  localStorage.setItem(CONS_DELETED_KEY, JSON.stringify([...ids]))
  emit()
}

function seedRowToConsumable(row: ConsumableSeedRow, index: number): ConsumableItem {
  return {
    id: `con-seed-${String(index + 1).padStart(4, '0')}`,
    name: row.name,
    stock: row.stock,
    reorderLevel: row.reorderLevel ?? 4,
    price: row.price ?? 0,
    branchName: row.branchName ?? 'Global',
    createdAt: row.createdAt ?? '2026-06-29',
  }
}

function builtInConsumables(): ConsumableItem[] {
  const deleted = readDeletedConsumableIds()
  return CONSUMABLE_CATALOG_SEED.map((row, i) => seedRowToConsumable(row, i)).filter(
    (c) => !deleted.has(c.id),
  )
}

function readDeletedProductIds(): Set<string> {
  return new Set(read<string>(PROD_DELETED_KEY))
}

function writeDeletedProductIds(ids: Set<string>) {
  localStorage.setItem(PROD_DELETED_KEY, JSON.stringify([...ids]))
  emit()
}

function seedRowToProduct(row: ProductSeedRow, index: number): CatalogProduct {
  return {
    id: `prod-seed-${String(index + 1).padStart(4, '0')}`,
    name: row.name,
    sku: row.sku,
    categoryName: row.categoryName ?? 'N/A',
    branchName: row.branchName ?? 'Global',
    retailPrice: row.retailPrice,
    baseCost: row.baseCost,
    status: row.status ?? 'active',
    createdAt: '2026-01-01',
  }
}

function builtInProducts(): CatalogProduct[] {
  const deleted = readDeletedProductIds()
  return PRODUCT_CATALOG_SEED.map((row, i) => seedRowToProduct(row, i)).filter(
    (p) => !deleted.has(p.id),
  )
}

export function getProductCategories(): ProductCategory[] {
  const extra = read<ProductCategory>(CAT_KEY)
  const ids = new Set(DEFAULT_CATEGORIES.map((c) => c.id))
  const customs = extra.filter((c) => !ids.has(c.id))
  const overrides = new Map(extra.filter((c) => ids.has(c.id)).map((c) => [c.id, c]))
  return [...customs, ...DEFAULT_CATEGORIES.map((c) => overrides.get(c.id) ?? c)]
}

export function saveProductCategory(cat: ProductCategory) {
  const extra = read<ProductCategory>(CAT_KEY)
  const idx = extra.findIndex((c) => c.id === cat.id)
  const next = idx >= 0 ? extra.map((c, i) => (i === idx ? cat : c)) : [cat, ...extra]
  // also persist overrides of defaults
  if (!extra.some((c) => c.id === cat.id) && DEFAULT_CATEGORIES.some((c) => c.id === cat.id)) {
    write(CAT_KEY, [cat, ...extra])
  } else {
    write(CAT_KEY, next)
  }
  return cat
}

export function createProductCategory(input: { name: string; subtitle?: string }) {
  return saveProductCategory({
    id: `pc-${Date.now()}`,
    name: input.name.trim().toUpperCase(),
    subtitle: input.subtitle?.trim() || 'N/A',
    createdAt: new Date().toISOString().slice(0, 10),
  })
}

export function deleteProductCategory(id: string) {
  write(
    CAT_KEY,
    read<ProductCategory>(CAT_KEY).filter((c) => c.id !== id),
  )
  const deleted = read<string>('imajica_product_categories_deleted')
  if (!deleted.includes(id)) write('imajica_product_categories_deleted', [...deleted, id])
}

export function getVisibleCategories(): ProductCategory[] {
  const deleted = new Set(read<string>('imajica_product_categories_deleted'))
  return getProductCategories().filter((c) => !deleted.has(c.id) && !c.name.startsWith('__deleted__'))
}

export function getCatalogProducts(): CatalogProduct[] {
  const deleted = readDeletedProductIds()
  const byId = new Map<string, CatalogProduct>()
  for (const p of builtInProducts()) byId.set(p.id, p)
  for (const p of read<CatalogProduct>(PROD_KEY)) {
    if (deleted.has(p.id)) continue
    byId.set(p.id, p)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function createCatalogProduct(input: {
  name: string
  sku?: string
  categoryId?: string
  supplier?: string
  retailPrice: number
  baseCost: number
  branchName?: string
  status?: CatalogProduct['status']
  manufacturingDate?: string
  expirationDate?: string
  removalDate?: string
}): CatalogProduct {
  const cats = getVisibleCategories()
  const cat = cats.find((c) => c.id === input.categoryId)
  const sku =
    input.sku?.trim() ||
    `SKU-${Date.now().toString().slice(-8)}`
  const product: CatalogProduct = {
    id: `prod-${Date.now()}`,
    name: input.name.trim().toUpperCase(),
    sku,
    categoryId: cat?.id,
    categoryName: cat?.name ?? 'N/A',
    supplier: input.supplier?.trim() || undefined,
    branchName: input.branchName?.trim() || 'Global',
    retailPrice: input.retailPrice,
    baseCost: input.baseCost,
    status: input.status ?? 'active',
    manufacturingDate: input.manufacturingDate || undefined,
    expirationDate: input.expirationDate || undefined,
    removalDate: input.removalDate || undefined,
    createdAt: new Date().toISOString().slice(0, 10),
  }
  write(PROD_KEY, [product, ...read<CatalogProduct>(PROD_KEY)])
  return product
}

export function getCatalogProductById(id: string): CatalogProduct | undefined {
  return getCatalogProducts().find((p) => p.id === id)
}

export function updateCatalogProduct(product: CatalogProduct) {
  const extra = read<CatalogProduct>(PROD_KEY)
  const idx = extra.findIndex((p) => p.id === product.id)
  const next = idx >= 0 ? extra.map((p, i) => (i === idx ? product : p)) : [product, ...extra]
  write(PROD_KEY, next)
  const deleted = readDeletedProductIds()
  if (deleted.has(product.id)) {
    deleted.delete(product.id)
    writeDeletedProductIds(deleted)
  }
  return product
}

export function deleteCatalogProduct(id: string) {
  write(
    PROD_KEY,
    read<CatalogProduct>(PROD_KEY).filter((p) => p.id !== id),
  )
  const deleted = readDeletedProductIds()
  deleted.add(id)
  writeDeletedProductIds(deleted)
}

export function getConsumables(): ConsumableItem[] {
  const deleted = readDeletedConsumableIds()
  const byId = new Map<string, ConsumableItem>()
  for (const c of builtInConsumables()) byId.set(c.id, c)
  for (const c of read<ConsumableItem>(CONS_KEY)) {
    if (deleted.has(c.id)) continue
    byId.set(c.id, c)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function getConsumableById(id: string): ConsumableItem | undefined {
  return getConsumables().find((c) => c.id === id)
}

export function createConsumable(input: {
  name: string
  stock: number
  price: number
  branchName?: string
  reorderLevel?: number
}): ConsumableItem {
  const item: ConsumableItem = {
    id: `con-${Date.now()}`,
    name: input.name.trim().toUpperCase(),
    stock: input.stock,
    reorderLevel: input.reorderLevel ?? 4,
    price: input.price,
    branchName: input.branchName?.trim() || 'Global',
    createdAt: new Date().toISOString().slice(0, 10),
  }
  write(CONS_KEY, [item, ...read<ConsumableItem>(CONS_KEY)])
  return item
}

export function updateConsumable(item: ConsumableItem) {
  const extra = read<ConsumableItem>(CONS_KEY)
  const idx = extra.findIndex((c) => c.id === item.id)
  const next = idx >= 0 ? extra.map((c, i) => (i === idx ? item : c)) : [item, ...extra]
  write(CONS_KEY, next)
  const deleted = readDeletedConsumableIds()
  if (deleted.has(item.id)) {
    deleted.delete(item.id)
    writeDeletedConsumableIds(deleted)
  }
  return item
}

export function deleteConsumable(id: string) {
  write(
    CONS_KEY,
    read<ConsumableItem>(CONS_KEY).filter((c) => c.id !== id),
  )
  const deleted = readDeletedConsumableIds()
  deleted.add(id)
  writeDeletedConsumableIds(deleted)
}

export function categoryStats() {
  const products = getCatalogProducts()
  return getVisibleCategories().map((c) => {
    const inCat = products.filter((p) => p.categoryId === c.id || p.categoryName === c.name)
    return {
      ...c,
      totalProducts: inCat.length,
      totalEarnings: inCat.reduce((s, p) => s + p.retailPrice, 0),
    }
  })
}

export function subscribeProducts(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === CAT_KEY ||
      e.key === PROD_KEY ||
      e.key === CONS_KEY ||
      e.key === PROD_DELETED_KEY ||
      e.key === CONS_DELETED_KEY ||
      e.key === 'imajica_product_categories_deleted'
    ) {
      listener()
    }
  }
  window.addEventListener(CHANGE, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE, listener)
    window.removeEventListener('storage', onStorage)
  }
}
