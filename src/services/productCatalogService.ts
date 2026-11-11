import type { CatalogProduct, ConsumableItem, ProductCategory } from '@/types'
import { PRODUCT_CATALOG_SEED, type ProductSeedRow } from '@/constants/productCatalogSeed'
import { CONSUMABLE_CATALOG_SEED, type ConsumableSeedRow } from '@/constants/consumableCatalogSeed'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { subscribeCatalogPriceOverrides } from '@/services/catalogPriceOverrideService'

const CAT_KEY = 'imajica_product_categories'
const PROD_KEY = 'imajica_catalog_products'
const PROD_DELETED_KEY = 'imajica_catalog_products_deleted'
const CONS_KEY = 'imajica_consumables'
const CONS_DELETED_KEY = 'imajica_consumables_deleted'
const CHANGE = 'imajica:products-changed'
/** Full org replace from IMAJICA PRODUCT & SERVICES LIST 2026. */
const CATALOG_2026_PRODUCTS_VERSION = 'catalog-2026-products-v1'
const CATALOG_2026_PRODUCTS_FLAG = 'imajica_catalog_2026_products_version'

function purgeStaleProducts2026Replace() {
  try {
    if (typeof localStorage === 'undefined') return
    if (localStorage.getItem(CATALOG_2026_PRODUCTS_FLAG) === CATALOG_2026_PRODUCTS_VERSION) return
    localStorage.removeItem(PROD_KEY)
    localStorage.removeItem(PROD_DELETED_KEY)
    localStorage.removeItem(CONS_KEY)
    localStorage.removeItem(CONS_DELETED_KEY)
    localStorage.setItem(CATALOG_2026_PRODUCTS_FLAG, CATALOG_2026_PRODUCTS_VERSION)
  } catch {
    /* ignore */
  }
}

purgeStaleProducts2026Replace()

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

function roundMoney(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100
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

/** Live retail catalog from Supabase inventory_items (source of truth for prices). */
let remoteProducts: CatalogProduct[] | null = null
let remoteLoadPromise: Promise<void> | null = null
let remoteLoaded = false

type InventoryItemRow = {
  id: string
  name: string
  sku: string
  category: string | null
  unit_cost: number | null
  selling_price: number | null
  status: string | null
  brand: string | null
  created_at: string | null
}

function mapInventoryRow(row: InventoryItemRow): CatalogProduct {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    categoryName: row.category || 'N/A',
    supplier: row.brand || undefined,
    branchName: 'Global',
    retailPrice: roundMoney(row.selling_price ?? 0),
    baseCost: roundMoney(row.unit_cost ?? 0),
    status: (row.status === 'inactive' ? 'inactive' : 'active') as CatalogProduct['status'],
    createdAt: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
  }
}

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
    categoryName: row.categoryName,
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
    retailPrice: roundMoney(row.retailPrice),
    baseCost: roundMoney(row.baseCost),
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

/** Offline / first-paint only — never used as price authority when Supabase products are loaded. */
function localFallbackProducts(): CatalogProduct[] {
  const deleted = readDeletedProductIds()
  const byId = new Map<string, CatalogProduct>()
  for (const p of builtInProducts()) byId.set(p.id, p)
  for (const p of read<CatalogProduct>(PROD_KEY)) {
    if (deleted.has(p.id)) continue
    byId.set(p.id, {
      ...p,
      retailPrice: roundMoney(p.retailPrice),
      baseCost: roundMoney(p.baseCost),
    })
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Load retail products from inventory_items.selling_price (source of truth).
 * Replaces any localStorage / override-based product prices for booking + catalog UI.
 */
export async function preloadCatalogProductsFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    remoteLoaded = true
    return
  }
  if (remoteLoadPromise) return remoteLoadPromise

  remoteLoadPromise = (async () => {
    try {
      const pageSize = 500
      const all: InventoryItemRow[] = []
      for (let from = 0; from < 20_000; from += pageSize) {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('id, name, sku, category, unit_cost, selling_price, status, brand, created_at')
          .eq('is_retail_product', true)
          .order('name', { ascending: true })
          .range(from, from + pageSize - 1)

        if (error) {
          console.error('[products] inventory_items preload failed', error.message)
          break
        }
        const rows = (data ?? []) as InventoryItemRow[]
        if (!rows.length) break
        all.push(...rows)
        if (rows.length < pageSize) break
      }

      if (all.length) {
        remoteProducts = all.map(mapInventoryRow).sort((a, b) => a.name.localeCompare(b.name))
        // Drop stale browser product prices so they cannot win later.
        try {
          localStorage.removeItem(PROD_KEY)
          localStorage.removeItem(PROD_DELETED_KEY)
        } catch {
          /* ignore */
        }
        emit()
      } else if (!remoteProducts) {
        // Empty remote — keep seed fallback until catalog migration is applied.
        console.warn('[products] no retail inventory_items rows; using seed fallback')
      }
    } finally {
      remoteLoaded = true
      remoteLoadPromise = null
    }
  })()

  return remoteLoadPromise
}

export function catalogProductsRemoteReady(): boolean {
  return remoteLoaded && remoteProducts != null
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

/**
 * Product list for booking + Products admin.
 * When Supabase remote is loaded: inventory_items only (selling_price).
 * Otherwise: seed/local fallback (offline).
 * Never applies catalog_price_overrides for products.
 */
export function getCatalogProducts(): CatalogProduct[] {
  if (isSupabaseConfigured && remoteProducts) {
    return remoteProducts.map((p) => ({ ...p }))
  }
  return localFallbackProducts()
}

async function upsertInventoryItem(product: CatalogProduct): Promise<CatalogProduct> {
  if (!isSupabaseConfigured || !supabase) return product

  const payload = {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.categoryName || 'N/A',
    brand: product.supplier ?? null,
    unit_cost: roundMoney(product.baseCost),
    selling_price: roundMoney(product.retailPrice),
    status: product.status === 'inactive' ? 'inactive' : 'active',
    is_retail_product: true,
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .upsert(payload, { onConflict: 'id' })
    .select('id, name, sku, category, unit_cost, selling_price, status, brand, created_at')
    .single()

  if (error) {
    throw new Error(error.message || 'Could not save product to database')
  }

  const mapped = mapInventoryRow(data as InventoryItemRow)
  if (remoteProducts) {
    const idx = remoteProducts.findIndex((p) => p.id === mapped.id)
    remoteProducts =
      idx >= 0
        ? remoteProducts.map((p, i) => (i === idx ? mapped : p))
        : [mapped, ...remoteProducts].sort((a, b) => a.name.localeCompare(b.name))
  } else {
    remoteProducts = [mapped]
  }
  emit()
  return mapped
}

export async function createCatalogProduct(input: {
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
}): Promise<CatalogProduct> {
  const cats = getVisibleCategories()
  const cat = cats.find((c) => c.id === input.categoryId)
  const sku =
    input.sku?.trim() ||
    `SKU-${Date.now().toString().slice(-8)}`
  const id =
    isSupabaseConfigured && typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `prod-${Date.now()}`

  const product: CatalogProduct = {
    id,
    name: input.name.trim().toUpperCase(),
    sku,
    categoryId: cat?.id,
    categoryName: cat?.name ?? 'N/A',
    supplier: input.supplier?.trim() || undefined,
    branchName: input.branchName?.trim() || 'Global',
    retailPrice: roundMoney(input.retailPrice),
    baseCost: roundMoney(input.baseCost),
    status: input.status ?? 'active',
    manufacturingDate: input.manufacturingDate || undefined,
    expirationDate: input.expirationDate || undefined,
    removalDate: input.removalDate || undefined,
    createdAt: new Date().toISOString().slice(0, 10),
  }

  if (isSupabaseConfigured && supabase) {
    return upsertInventoryItem(product)
  }

  write(PROD_KEY, [product, ...read<CatalogProduct>(PROD_KEY)])
  return product
}

export function getCatalogProductById(id: string): CatalogProduct | undefined {
  return getCatalogProducts().find((p) => p.id === id)
}

export async function updateCatalogProduct(product: CatalogProduct): Promise<CatalogProduct> {
  const next: CatalogProduct = {
    ...product,
    retailPrice: roundMoney(product.retailPrice),
    baseCost: roundMoney(product.baseCost),
    name: product.name.trim().toUpperCase(),
  }

  if (isSupabaseConfigured && supabase) {
    return upsertInventoryItem(next)
  }

  const extra = read<CatalogProduct>(PROD_KEY)
  const idx = extra.findIndex((p) => p.id === next.id)
  const localNext = idx >= 0 ? extra.map((p, i) => (i === idx ? next : p)) : [next, ...extra]
  write(PROD_KEY, localNext)
  const deleted = readDeletedProductIds()
  if (deleted.has(next.id)) {
    deleted.delete(next.id)
    writeDeletedProductIds(deleted)
  }
  return next
}

export async function deleteCatalogProduct(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('inventory_items')
      .update({ status: 'inactive', is_retail_product: true })
      .eq('id', id)
    if (error) throw new Error(error.message || 'Could not deactivate product')
    if (remoteProducts) {
      remoteProducts = remoteProducts.map((p) =>
        p.id === id ? { ...p, status: 'inactive' as const } : p,
      )
    }
    emit()
    return
  }

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
  categoryName?: string
}): ConsumableItem {
  const item: ConsumableItem = {
    id: `con-${Date.now()}`,
    name: input.name.trim().toUpperCase(),
    stock: input.stock,
    reorderLevel: input.reorderLevel ?? 4,
    price: input.price,
    branchName: input.branchName?.trim() || 'Global',
    categoryName: input.categoryName?.trim() || undefined,
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
  const unsubPrices = subscribeCatalogPriceOverrides(listener)
  return () => {
    window.removeEventListener(CHANGE, listener)
    window.removeEventListener('storage', onStorage)
    unsubPrices()
  }
}
