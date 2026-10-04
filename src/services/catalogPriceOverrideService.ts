import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export type CatalogPriceKind = 'service' | 'product' | 'package'

type OverrideMap = Record<string, number>

const STORAGE_KEY = 'imajica_catalog_price_overrides'
const CHANGE = 'imajica:catalog-price-overrides-changed'

type Stored = {
  service?: OverrideMap
  product?: OverrideMap
  package?: OverrideMap
}

let memory: Stored | null = null
let remoteLoaded = false
let loadPromise: Promise<void> | null = null

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

function readStored(): Stored {
  if (memory) return memory
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      memory = {}
      return memory
    }
    const parsed = JSON.parse(raw) as Stored
    memory = parsed && typeof parsed === 'object' ? parsed : {}
    return memory
  } catch {
    memory = {}
    return memory
  }
}

function writeStored(next: Stored) {
  memory = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emit()
}

function kindMap(kind: CatalogPriceKind): OverrideMap {
  const stored = readStored()
  return { ...(stored[kind] ?? {}) }
}

export function getPriceOverride(kind: CatalogPriceKind, id: string): number | undefined {
  const n = kindMap(kind)[id]
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

export function getPriceOverrides(kind: CatalogPriceKind): OverrideMap {
  return kindMap(kind)
}

/** Persist a price edit locally (always) and to Supabase when configured. */
export async function setPriceOverride(
  kind: CatalogPriceKind,
  id: string,
  price: number,
): Promise<void> {
  const safe = Math.max(0, Number(price) || 0)
  const stored = readStored()
  const nextKind = { ...(stored[kind] ?? {}), [id]: safe }
  writeStored({ ...stored, [kind]: nextKind })

  if (!isSupabaseConfigured || !supabase) return
  const { error } = await supabase.from('catalog_price_overrides').upsert(
    {
      item_kind: kind,
      item_key: id,
      price: safe,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'item_kind,item_key' },
  )
  if (error) {
    console.error('[catalog-prices] remote upsert failed', error.message)
  }
}

export function applyPriceOverride<T extends { id: string; price?: number; retailPrice?: number; regularPrice?: number }>(
  kind: CatalogPriceKind,
  item: T,
): T {
  const override = getPriceOverride(kind, item.id)
  if (override == null) return item
  if (kind === 'product') return { ...item, retailPrice: override }
  if (kind === 'package') return { ...item, regularPrice: override, promoPrice: undefined }
  return { ...item, price: override }
}

/** Pull any previously saved catalog rows into the override map (one-time local backfill). */
function backfillFromCatalogStorage() {
  const stored = readStored()
  const next: Stored = {
    service: { ...(stored.service ?? {}) },
    product: { ...(stored.product ?? {}) },
    package: { ...(stored.package ?? {}) },
  }
  let changed = false

  try {
    const services = JSON.parse(localStorage.getItem('imajica_catalog_services') || '[]') as Array<{
      id?: string
      price?: number
    }>
    if (Array.isArray(services)) {
      for (const s of services) {
        if (!s?.id || typeof s.price !== 'number') continue
        if (next.service?.[s.id] == null) {
          next.service = { ...(next.service ?? {}), [s.id]: s.price }
          changed = true
        }
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const products = JSON.parse(localStorage.getItem('imajica_catalog_products') || '[]') as Array<{
      id?: string
      retailPrice?: number
    }>
    if (Array.isArray(products)) {
      for (const p of products) {
        if (!p?.id || typeof p.retailPrice !== 'number') continue
        if (next.product?.[p.id] == null) {
          next.product = { ...(next.product ?? {}), [p.id]: p.retailPrice }
          changed = true
        }
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const packages = JSON.parse(localStorage.getItem('imajica_catalog_packages') || '[]') as Array<{
      id?: string
      regularPrice?: number
      promoPrice?: number
    }>
    if (Array.isArray(packages)) {
      for (const p of packages) {
        if (!p?.id) continue
        const price = typeof p.promoPrice === 'number' ? p.promoPrice : p.regularPrice
        if (typeof price !== 'number') continue
        if (next.package?.[p.id] == null) {
          next.package = { ...(next.package ?? {}), [p.id]: price }
          changed = true
        }
      }
    }
  } catch {
    /* ignore */
  }

  if (changed) writeStored(next)
}

/** Load remote overrides once and merge into local storage (remote wins on conflict by updated_at). */
export async function preloadCatalogPriceOverrides(): Promise<void> {
  if (remoteLoaded) return
  if (loadPromise) return loadPromise

  backfillFromCatalogStorage()

  if (!isSupabaseConfigured || !supabase) {
    remoteLoaded = true
    return
  }

  loadPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('catalog_price_overrides')
        .select('item_kind, item_key, price, updated_at')
        .order('updated_at', { ascending: true })

      if (error) {
        console.error('[catalog-prices] remote preload failed', error.message)
        return
      }

      const stored = readStored()
      const next: Stored = {
        service: { ...(stored.service ?? {}) },
        product: { ...(stored.product ?? {}) },
        package: { ...(stored.package ?? {}) },
      }

      for (const row of data ?? []) {
        const kind = row.item_kind as CatalogPriceKind
        if (kind !== 'service' && kind !== 'product' && kind !== 'package') continue
        const price = Number(row.price)
        if (!Number.isFinite(price)) continue
        next[kind] = { ...(next[kind] ?? {}), [String(row.item_key)]: price }
      }

      writeStored(next)
    } finally {
      remoteLoaded = true
      loadPromise = null
    }
  })()

  return loadPromise
}

export function subscribeCatalogPriceOverrides(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      memory = null
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
