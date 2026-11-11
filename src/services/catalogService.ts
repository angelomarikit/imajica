import type { EntityStatus, Package, Treatment, TreatmentCategorySlug } from '@/types'
import { getBranches } from '@/services/branchService'
import {
  applyPriceOverride,
  setPriceOverride,
  subscribeCatalogPriceOverrides,
} from '@/services/catalogPriceOverrideService'
import { SERVICE_CATALOG_SEED, type ServiceSeedRow } from '@/constants/serviceCatalogSeed'
import { BACOOR_SERVICE_CATALOG_SEED } from '@/constants/bacoorServiceCatalogSeed'
import { PACKAGE_CATALOG_SEED, type PackageSeedRow } from '@/constants/packageCatalogSeed'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const SERVICES_KEY = 'imajica_catalog_services'
const SERVICES_DELETED_KEY = 'imajica_catalog_services_deleted'
const PACKAGES_KEY = 'imajica_catalog_packages'
const PACKAGES_DELETED_KEY = 'imajica_catalog_packages_deleted'
const CHANGE_EVENT = 'imajica:catalog-changed'
/** Bump when Bacoor sealed menu is rebuilt so tablets drop stale franchise extras. */
const BACOOR_MENU_SEED_VERSION = 'bacoor-org-2026-v1'
const BACOOR_MENU_SEED_FLAG = 'imajica_bacoor_menu_seed_version'
/** Full org replace from IMAJICA PRODUCT & SERVICES LIST 2026 — clears stale extras. */
const CATALOG_2026_REPLACE_VERSION = 'catalog-2026-replace-v1'
const CATALOG_2026_REPLACE_FLAG = 'imajica_catalog_2026_replace_version'

const BRANCH_NAME_TO_ID: Record<string, string> = {
  'San Mateo, Rizal': '22222222-2222-2222-2222-222222222201',
  'Cainta, Rizal': '22222222-2222-2222-2222-222222222202',
  'Pasig City': '22222222-2222-2222-2222-222222222203',
  'Lipa, Batangas': '22222222-2222-2222-2222-222222222204',
  'Dasmariñas, Cavite': '22222222-2222-2222-2222-222222222205',
  'Bacoor, Cavite': '22222222-2222-2222-2222-222222222206',
  Warehouse: '22222222-2222-2222-2222-222222222207',
}

function emit() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function readJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SERVICES_DELETED_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function writeDeletedIds(ids: Set<string>) {
  localStorage.setItem(SERVICES_DELETED_KEY, JSON.stringify([...ids]))
}

function purgeStaleBacoorCatalogCache() {
  try {
    if (typeof localStorage === 'undefined') return
    if (localStorage.getItem(BACOOR_MENU_SEED_FLAG) === BACOOR_MENU_SEED_VERSION) return

    const services = readJson<Treatment>(SERVICES_KEY).filter(
      (s) => !String(s.id || '').startsWith('svc-bacoor-'),
    )
    localStorage.setItem(SERVICES_KEY, JSON.stringify(services))

    const deleted = [...readDeletedIds()].filter((id) => !id.startsWith('svc-bacoor-'))
    writeDeletedIds(new Set(deleted))

    try {
      const raw = localStorage.getItem('imajica_catalog_price_overrides')
      if (raw) {
        const parsed = JSON.parse(raw) as {
          service?: Record<string, number>
          package?: Record<string, number>
          product?: Record<string, number>
        }
        if (parsed?.service) {
          const nextService: Record<string, number> = {}
          for (const [id, price] of Object.entries(parsed.service)) {
            if (id.startsWith('svc-bacoor-')) continue
            nextService[id] = price
          }
          parsed.service = nextService
          localStorage.setItem('imajica_catalog_price_overrides', JSON.stringify(parsed))
        }
      }
    } catch {
      /* ignore */
    }

    localStorage.setItem(BACOOR_MENU_SEED_FLAG, BACOOR_MENU_SEED_VERSION)
  } catch {
    /* ignore quota / private mode */
  }
}

purgeStaleBacoorCatalogCache()

function purgeStaleCatalog2026Replace() {
  try {
    if (typeof localStorage === 'undefined') return
    if (localStorage.getItem(CATALOG_2026_REPLACE_FLAG) === CATALOG_2026_REPLACE_VERSION) return

    // Drop custom extras so booking shows only the 2026 seed list (no duplicates).
    localStorage.removeItem(SERVICES_KEY)
    localStorage.removeItem(PACKAGES_KEY)
    localStorage.removeItem(SERVICES_DELETED_KEY)
    localStorage.removeItem(PACKAGES_DELETED_KEY)
    localStorage.removeItem('imajica_catalog_price_overrides')

    localStorage.setItem(CATALOG_2026_REPLACE_FLAG, CATALOG_2026_REPLACE_VERSION)
    localStorage.setItem(BACOOR_MENU_SEED_FLAG, BACOOR_MENU_SEED_VERSION)
  } catch {
    /* ignore quota / private mode */
  }
}

purgeStaleCatalog2026Replace()

function seedRowToTreatment(
  row: ServiceSeedRow,
  index: number,
  idPrefix = 'svc-seed',
): Treatment {
  const id = `${idPrefix}-${String(index + 1).padStart(4, '0')}`
  const branchId = row.branch ? BRANCH_NAME_TO_ID[row.branch] : undefined
  const noBranch = !row.branch
  return {
    id,
    name: row.name,
    description: '',
    category: 'others',
    durationMinutes: Math.max(30, row.sessions * 30),
    price: row.price,
    status: row.status,
    benefits: [],
    popularity: 0,
    sessions: row.sessions,
    branchId,
    branchName: row.branch || (noBranch ? 'All Branches' : '—'),
    availableGlobally: noBranch,
    availableBranchIds: branchId ? [branchId] : [],
  }
}

function builtInServices(): Treatment[] {
  const deleted = readDeletedIds()
  const hq = SERVICE_CATALOG_SEED.map((row, i) => seedRowToTreatment(row, i))
  // Stable Bacoor franchise menu (separate id prefix so HQ seed indexes stay fixed)
  const bacoor = BACOOR_SERVICE_CATALOG_SEED.map((row, i) =>
    seedRowToTreatment(row, i, 'svc-bacoor'),
  )
  return [...hq, ...bacoor].filter((s) => !deleted.has(s.id))
}

/** Live services from Supabase treatments.price (source of truth when loaded). */
let remoteServices: Treatment[] | null = null
let remotePackages: Package[] | null = null
let remoteCatalogLoadPromise: Promise<void> | null = null

function roundMoney(n: unknown) {
  return Math.round((Number(n) || 0) * 100) / 100
}

/**
 * Load active treatments + packages from Supabase for booking/catalog.
 * When loaded, getServices / getPackagesCatalog use DB prices (not localStorage overrides).
 */
export async function preloadCatalogFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  if (remoteCatalogLoadPromise) return remoteCatalogLoadPromise

  remoteCatalogLoadPromise = (async () => {
    try {
      const pageSize = 500
      const treatmentRows: Array<Record<string, unknown>> = []
      for (let from = 0; from < 20_000; from += pageSize) {
        const { data, error } = await supabase
          .from('treatments')
          .select(
            'id, name, description, duration_minutes, price, status, sessions, category_id, available_globally, default_branch_id, image_url',
          )
          .eq('status', 'active')
          .order('name', { ascending: true })
          .range(from, from + pageSize - 1)
        if (error) {
          console.error('[catalog] treatments preload failed', error.message)
          break
        }
        const rows = data ?? []
        if (!rows.length) break
        treatmentRows.push(...(rows as Array<Record<string, unknown>>))
        if (rows.length < pageSize) break
      }

      if (treatmentRows.length) {
        remoteServices = treatmentRows.map((row) => {
          const branchId = row.default_branch_id ? String(row.default_branch_id) : undefined
          const global = row.available_globally !== false && !branchId
          return {
            id: String(row.id),
            name: String(row.name || ''),
            category: (String(row.category_id || 'facial') as TreatmentCategorySlug) || 'facial',
            description: String(row.description || ''),
            durationMinutes: Number(row.duration_minutes) || 30,
            price: roundMoney(row.price),
            status: (row.status === 'inactive' ? 'inactive' : 'active') as EntityStatus,
            imageUrl: row.image_url ? String(row.image_url) : undefined,
            benefits: [],
            sessions: Number(row.sessions) || 1,
            branchId,
            availableGlobally: global,
            availableBranchIds: branchId ? [branchId] : [],
            popularity: 0,
          } satisfies Treatment
        })
      }

      const packageRows: Array<Record<string, unknown>> = []
      for (let from = 0; from < 20_000; from += pageSize) {
        const { data, error } = await supabase
          .from('packages')
          .select(
            'id, name, type, description, regular_price, promo_price, sessions, validity_months, status, free_items, default_branch_id, image_url',
          )
          .eq('status', 'active')
          .order('name', { ascending: true })
          .range(from, from + pageSize - 1)
        if (error) {
          console.error('[catalog] packages preload failed', error.message)
          break
        }
        const rows = data ?? []
        if (!rows.length) break
        packageRows.push(...(rows as Array<Record<string, unknown>>))
        if (rows.length < pageSize) break
      }

      if (packageRows.length) {
        remotePackages = packageRows.map((row) => {
          const branchId = row.default_branch_id ? String(row.default_branch_id) : undefined
          const regular = roundMoney(row.regular_price)
          const promo =
            row.promo_price != null && Number.isFinite(Number(row.promo_price))
              ? roundMoney(row.promo_price)
              : undefined
          return {
            id: String(row.id),
            name: String(row.name || ''),
            type: (String(row.type || 'package') as Package['type']) || 'package',
            description: String(row.description || row.free_items || ''),
            regularPrice: regular,
            promoPrice: promo,
            sessions: Number(row.sessions) || 1,
            validityMonths: Number(row.validity_months) || 6,
            status: (row.status === 'inactive' ? 'inactive' : 'active') as EntityStatus,
            imageUrl: row.image_url ? String(row.image_url) : undefined,
            memberCount: 0,
            includedTreatmentIds: [],
            freeItems: row.free_items ? String(row.free_items) : undefined,
            branchId,
            branchName: branchId ? undefined : 'All Branches',
            availableGlobally: !branchId,
            availableBranchIds: branchId ? [branchId] : [],
          } satisfies Package
        })
      }

      if (remoteServices || remotePackages) emit()
    } finally {
      remoteCatalogLoadPromise = null
    }
  })()

  return remoteCatalogLoadPromise
}

export function getServices(): Treatment[] {
  if (isSupabaseConfigured && remoteServices) {
    return remoteServices.map((s) => ({ ...s }))
  }
  const byId = new Map<string, Treatment>()
  for (const s of builtInServices()) byId.set(s.id, s)
  for (const s of readJson<Treatment>(SERVICES_KEY)) {
    if (readDeletedIds().has(s.id)) continue
    byId.set(s.id, s)
  }
  // Offline fallback only — when remote loaded, DB price is authority.
  return [...byId.values()].map((s) => applyPriceOverride('service', s))
}

export function getServiceById(id: string): Treatment | undefined {
  return getServices().find((s) => s.id === id)
}

function readDeletedPackageIds(): Set<string> {
  try {
    const raw = localStorage.getItem(PACKAGES_DELETED_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function writeDeletedPackageIds(ids: Set<string>) {
  localStorage.setItem(PACKAGES_DELETED_KEY, JSON.stringify([...ids]))
}

function seedRowToPackage(row: PackageSeedRow, index: number): Package {
  const id = `pkg-seed-${String(index + 1).padStart(4, '0')}`
  const branchId = row.branch ? BRANCH_NAME_TO_ID[row.branch] : undefined
  const noBranch = !row.branch
  const includedTreatmentIds = (row.includedServiceIndexes ?? []).map(
    (svcIndex) => `svc-seed-${String(svcIndex + 1).padStart(4, '0')}`,
  )
  return {
    id,
    name: row.name,
    type: 'package',
    description: row.freeItems?.trim() || '',
    regularPrice: row.price,
    sessions: row.sessions,
    validityMonths: 6,
    status: row.status,
    memberCount: 0,
    includedTreatmentIds,
    freeItems: row.freeItems?.trim() || undefined,
    branchId,
    branchName: row.branch || (noBranch ? 'All Branches' : '—'),
    availableGlobally: noBranch,
    availableBranchIds: branchId ? [branchId] : [],
  }
}

function builtInPackages(): Package[] {
  const deleted = readDeletedPackageIds()
  return PACKAGE_CATALOG_SEED.map((row, i) => seedRowToPackage(row, i)).filter(
    (p) => !deleted.has(p.id),
  )
}

export function getPackagesCatalog(): Package[] {
  if (isSupabaseConfigured && remotePackages) {
    return remotePackages.map((p) => ({ ...p }))
  }
  const byId = new Map<string, Package>()
  for (const p of builtInPackages()) byId.set(p.id, p)
  for (const p of readJson<Package>(PACKAGES_KEY)) {
    if (readDeletedPackageIds().has(p.id)) continue
    byId.set(p.id, p)
  }
  return [...byId.values()].map((p) => applyPriceOverride('package', p))
}

export function getPackageById(id: string): Package | undefined {
  return getPackagesCatalog().find((p) => p.id === id)
}

function upsertService(service: Treatment) {
  const extra = readJson<Treatment>(SERVICES_KEY)
  const idx = extra.findIndex((s) => s.id === service.id)
  const next = idx >= 0 ? extra.map((s, i) => (i === idx ? service : s)) : [service, ...extra]
  localStorage.setItem(SERVICES_KEY, JSON.stringify(next))
  // If it was soft-deleted, restore
  const deleted = readDeletedIds()
  if (deleted.has(service.id)) {
    deleted.delete(service.id)
    writeDeletedIds(deleted)
  }
  void setPriceOverride('service', service.id, service.price)
  emit()
  return applyPriceOverride('service', service)
}

function upsertPackage(pkg: Package) {
  const extra = readJson<Package>(PACKAGES_KEY)
  const idx = extra.findIndex((s) => s.id === pkg.id)
  const next = idx >= 0 ? extra.map((s, i) => (i === idx ? pkg : s)) : [pkg, ...extra]
  localStorage.setItem(PACKAGES_KEY, JSON.stringify(next))
  const deleted = readDeletedPackageIds()
  if (deleted.has(pkg.id)) {
    deleted.delete(pkg.id)
    writeDeletedPackageIds(deleted)
  }
  void setPriceOverride('package', pkg.id, pkg.promoPrice ?? pkg.regularPrice)
  emit()
  return applyPriceOverride('package', pkg)
}

export type ServiceInput = {
  name: string
  description: string
  price: number
  sessions: number
  status: EntityStatus
  category?: TreatmentCategorySlug
  availableGlobally: boolean
  availableBranchIds: string[]
}

/** Label shown in Service / Package List Branch column */
export function serviceBranchLabel(service: {
  availableGlobally?: boolean
  availableBranchIds?: string[]
  branchName?: string
}): string {
  if (service.availableGlobally) return 'All Branches'
  const ids = service.availableBranchIds ?? []
  if (ids.length === 0) {
    return service.branchName?.trim() || '—'
  }
  const branches = getBranches()
  const names = ids
    .map((id) => branches.find((b) => b.id === id)?.name.replace(/ Branch$/, '') ?? null)
    .filter(Boolean) as string[]
  if (names.length === 0) return service.branchName?.trim() || '—'
  if (names.length === 1) return names[0]
  if (names.length === 2) return names.join(', ')
  return `${names[0]} +${names.length - 1}`
}

export function packageBranchLabel(pkg: Package): string {
  return serviceBranchLabel(pkg)
}

function primaryBranchFields(input: ServiceInput): { branchId?: string; branchName?: string } {
  if (input.availableGlobally) {
    return { branchId: undefined, branchName: 'All Branches' }
  }
  const firstId = input.availableBranchIds[0]
  if (!firstId) return { branchId: undefined, branchName: '—' }
  const b = getBranches().find((x) => x.id === firstId)
  return {
    branchId: firstId,
    branchName: b?.name.replace(/ Branch$/, '') ?? '—',
  }
}

export function createService(input: ServiceInput): Treatment {
  const primary = primaryBranchFields(input)
  return upsertService({
    id: `svc-${Date.now()}`,
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category ?? 'others',
    durationMinutes: Math.max(30, input.sessions * 30),
    price: input.price,
    status: input.status,
    benefits: [],
    popularity: 0,
    sessions: input.sessions,
    branchId: primary.branchId,
    branchName: primary.branchName,
    availableGlobally: input.availableGlobally,
    availableBranchIds: input.availableGlobally ? [] : [...input.availableBranchIds],
  })
}

export function saveServiceFromForm(id: string | undefined, input: ServiceInput): Treatment {
  const primary = primaryBranchFields(input)
  if (!id) return createService(input)

  const existing = getServiceById(id)
  if (!existing) return createService(input)

  return upsertService({
    ...existing,
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category ?? existing.category,
    durationMinutes: Math.max(30, input.sessions * 30),
    price: input.price,
    status: input.status,
    sessions: input.sessions,
    branchId: primary.branchId,
    branchName: primary.branchName,
    availableGlobally: input.availableGlobally,
    availableBranchIds: input.availableGlobally ? [] : [...input.availableBranchIds],
  })
}

export function updateService(service: Treatment): Treatment {
  return upsertService(service)
}

/** Franchise owner: turn service live / off for one branch only */
export function toggleServiceLiveForBranch(serviceId: string, branchId: string, live: boolean): Treatment | null {
  const existing = getServiceById(serviceId)
  if (!existing) return null
  if (existing.availableGlobally && !live) {
    // Leaving global: become branch-list without this branch (all other branches stay implied via explicit list of remaining)
    // Simpler: keep global true only when live; when turning off a global item for one branch,
    // convert to all branches except this one.
    const others = getBranches()
      .filter((b) => b.code !== 'HQ' && b.id !== branchId)
      .map((b) => b.id)
    return upsertService({
      ...existing,
      availableGlobally: false,
      availableBranchIds: others,
    })
  }
  const ids = new Set(existing.availableBranchIds ?? [])
  if (existing.availableGlobally) {
    // already live everywhere
    return existing
  }
  if (live) ids.add(branchId)
  else ids.delete(branchId)
  const nextIds = [...ids]
  return upsertService({
    ...existing,
    availableGlobally: false,
    availableBranchIds: nextIds,
  })
}

export function isServiceLiveAtBranch(service: Treatment, branchId: string): boolean {
  if (service.availableGlobally) return true
  if (service.availableBranchIds?.includes(branchId)) return true
  return service.branchId === branchId
}

/**
 * Explicit branch assignment only — no “All Branches” spillover.
 * Used for franchise own menus (e.g. Bacoor screenshot list).
 */
export function serviceAssignedToBranch(service: Treatment, branchId: string): boolean {
  if (branchId === 'all') return true
  if (service.availableBranchIds?.includes(branchId)) return true
  return service.branchId === branchId
}

export function packageAssignedToBranch(pkg: Package, branchId: string): boolean {
  if (branchId === 'all') return true
  if (pkg.availableBranchIds?.includes(branchId)) return true
  return pkg.branchId === branchId
}

/** Bacoor franchise UUID — dedicated screenshot menu (not full HQ catalog). */
export const BACOOR_BRANCH_ID = BRANCH_NAME_TO_ID['Bacoor, Cavite']

/**
 * Branches with a sealed franchise-only menu.
 * 2026 replace: all clinics (incl. Bacoor/Dasma) share the org catalog — no sealed menu.
 */
export function branchUsesOwnServiceMenu(_branchId: string | undefined | null): boolean {
  void _branchId
  return false
}

/** Services visible in Service List / booking for a branch filter. */
export function getServicesForBranch(branchId: string | 'all' | undefined): Treatment[] {
  const all = getServices()
  if (!branchId || branchId === 'all') return all
  if (branchUsesOwnServiceMenu(branchId)) {
    return all.filter((s) => serviceAssignedToBranch(s, branchId))
  }
  return all.filter((s) => isServiceLiveAtBranch(s, branchId))
}

export function getPackagesForBranch(branchId: string | 'all' | undefined): Package[] {
  const all = getPackagesCatalog()
  if (!branchId || branchId === 'all') return all
  if (branchUsesOwnServiceMenu(branchId)) {
    return all.filter((p) => packageAssignedToBranch(p, branchId))
  }
  return all.filter((p) => isPackageLiveAtBranch(p, branchId))
}

export function togglePackageLiveForBranch(packageId: string, branchId: string, live: boolean): Package | null {
  const existing = getPackageById(packageId)
  if (!existing) return null
  if (existing.availableGlobally && !live) {
    const others = getBranches()
      .filter((b) => b.code !== 'HQ' && b.id !== branchId)
      .map((b) => b.id)
    return upsertPackage({
      ...existing,
      availableGlobally: false,
      availableBranchIds: others,
    })
  }
  if (existing.availableGlobally) return existing
  const ids = new Set(existing.availableBranchIds ?? [])
  if (live) ids.add(branchId)
  else ids.delete(branchId)
  return upsertPackage({
    ...existing,
    availableGlobally: false,
    availableBranchIds: [...ids],
  })
}

export function isPackageLiveAtBranch(pkg: Package, branchId: string): boolean {
  if (pkg.availableGlobally) return true
  if (pkg.availableBranchIds?.includes(branchId)) return true
  return pkg.branchId === branchId
}

export function deleteService(id: string) {
  const extra = readJson<Treatment>(SERVICES_KEY).filter((s) => s.id !== id)
  localStorage.setItem(SERVICES_KEY, JSON.stringify(extra))
  const deleted = readDeletedIds()
  deleted.add(id)
  writeDeletedIds(deleted)
  emit()
}

export type PackageInput = {
  name: string
  description: string
  branchId: string
  branchName: string
  price: number
  sessions: number
  status: EntityStatus
  includedTreatmentIds: string[]
  freeItems?: string
}

export function createPackage(input: PackageInput): Package {
  const globally = !input.branchId || input.branchName === 'All Branches'
  return upsertPackage({
    id: `pkg-${Date.now()}`,
    name: input.name.trim(),
    type: 'package',
    description: input.description.trim(),
    regularPrice: input.price,
    sessions: input.sessions,
    validityMonths: 6,
    status: input.status,
    memberCount: 0,
    includedTreatmentIds: input.includedTreatmentIds,
    branchId: globally ? undefined : input.branchId,
    branchName: globally ? 'All Branches' : input.branchName,
    freeItems: input.freeItems?.trim() || undefined,
    availableGlobally: globally,
    availableBranchIds: globally || !input.branchId ? [] : [input.branchId],
  })
}

export function updatePackage(pkg: Package): Package {
  return upsertPackage(pkg)
}

export function deletePackage(id: string) {
  const extra = readJson<Package>(PACKAGES_KEY).filter((s) => s.id !== id)
  localStorage.setItem(PACKAGES_KEY, JSON.stringify(extra))
  const deleted = readDeletedPackageIds()
  deleted.add(id)
  writeDeletedPackageIds(deleted)
  emit()
}

export function subscribeCatalog(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === SERVICES_KEY ||
      e.key === PACKAGES_KEY ||
      e.key === SERVICES_DELETED_KEY ||
      e.key === PACKAGES_DELETED_KEY
    ) {
      listener()
    }
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  const unsubPrices = subscribeCatalogPriceOverrides(listener)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
    unsubPrices()
  }
}
