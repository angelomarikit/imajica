import type { PaymentMethod, Sale } from '@/types'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { getBranches } from '@/services/branchService'
import {
  buildClientsFromSales,
  recomputeClientSalesProfile,
  syncClientsFromImportedSales,
} from '@/services/clientSalesProfileService'
import { getClientById, getClients, saveClient } from '@/services/clientService'
import { isUuid } from '@/utils/uuid'

const EXTRA_KEY = 'imajica_analytics_sales'
const CHANGE = 'imajica:analytics-changed'

let importedSales: Sale[] = []
/** Live booking sales loaded from Supabase (persist across devices / re-login) */
let remoteLiveSales: Sale[] = []
let loadPromise: Promise<void> | null = null
let loaded = false

function emitChange() {
  window.dispatchEvent(new Event(CHANGE))
}

function readExtraSales(): Sale[] {
  try {
    const raw = localStorage.getItem(EXTRA_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Sale[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function mergeSales(): Sale[] {
  const importIds = new Set(importedSales.map((s) => s.id))
  const remoteIds = new Set(remoteLiveSales.map((s) => s.id))
  const extra = readExtraSales().filter((s) => !importIds.has(s.id) && !remoteIds.has(s.id))
  return [...extra, ...remoteLiveSales, ...importedSales].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
}

/** Push every sale patient into Customer Registry (latest bookings first). */
export function syncClientsFromSalesRegistry(): void {
  const clients = buildClientsFromSales(mergeSales())
  syncClientsFromImportedSales(clients)
}

function touchClientFromSale(sale: Sale, all: Sale[]) {
  const client = getClientById(sale.clientId)
  if (client) {
    const profile = recomputeClientSalesProfile(client.id, all, client.fullName || sale.clientName)
    saveClient({
      ...client,
      preferredBranchId: sale.branchId || client.preferredBranchId,
      preferredBranchName: sale.branchName || client.preferredBranchName,
      totalSpent: profile.contractValue,
      lastPurchaseAt: sale.createdAt,
      lastSaleId: sale.id,
      totalVisits: Math.max(client.totalVisits ?? 0, 1),
      sessionsCount: profile.sessionsCount,
    })
  } else {
    // Also try match by name in case local id differs from sale client_id
    const byName = getClients().find(
      (c) =>
        c.fullName.trim().toLowerCase() === (sale.clientName || '').trim().toLowerCase(),
    )
    if (byName) {
      const profile = recomputeClientSalesProfile(byName.id, all, byName.fullName || sale.clientName)
      saveClient({
        ...byName,
        preferredBranchId: sale.branchId || byName.preferredBranchId,
        preferredBranchName: sale.branchName || byName.preferredBranchName,
        totalSpent: profile.contractValue,
        lastPurchaseAt: sale.createdAt,
        lastSaleId: sale.id,
        totalVisits: Math.max(byName.totalVisits ?? 0, 1),
        sessionsCount: profile.sessionsCount,
      })
      return
    }
    const built = buildClientsFromSales(all).find(
      (c) =>
        c.id === sale.clientId ||
        c.fullName.trim().toLowerCase() === (sale.clientName || '').trim().toLowerCase(),
    )
    if (built) syncClientsFromImportedSales([built])
  }
}

type RemoteSaleRow = {
  id: string
  client_id: string | null
  branch_id: string
  staff_name: string | null
  doctor_name: string | null
  total_amount: number
  status: string
  created_at: string
  invoice_number: string | null
  payment_type: string | null
  booking_ref: string | null
  lead_source: string | null
  referred_by_name: string | null
  referred_by_client_id: string | null
  contract_amount: number | null
  sale_items:
    | Array<{
        id: string
        name: string
        quantity: number
        unit_price: number
        line_total: number
        item_type: string
        sku: string | null
        sessions_total: number | null
        sessions_completed: number | null
      }>
    | null
  payments: Array<{ payment_method: string; payment_status: string }> | null
  clients: { full_name: string } | { full_name: string }[] | null
  branches: { name: string } | { name: string }[] | null
}

function oneName(
  value: { full_name?: string; name?: string } | { full_name?: string; name?: string }[] | null,
  key: 'full_name' | 'name',
): string {
  if (!value) return ''
  const row = Array.isArray(value) ? value[0] : value
  return (row?.[key] as string | undefined) || ''
}

function branchNameFor(branchId: string, nested?: RemoteSaleRow['branches']): string {
  const fromJoin = oneName(nested ?? null, 'name')
  if (fromJoin) return fromJoin
  return getBranches().find((b) => b.id === branchId)?.name || 'Branch'
}

/** Normalize DB / UI payment_method strings to the app PaymentMethod union. */
function normalizePaymentMethod(raw: string | null | undefined): PaymentMethod | null {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (!key) return null
  const aliases: Record<string, PaymentMethod> = {
    cash: 'cash',
    credit_card: 'credit_card',
    creditcard: 'credit_card',
    card: 'credit_card',
    debit_card: 'debit_card',
    debitcard: 'debit_card',
    qr_ph: 'qr_ph',
    qrph: 'qr_ph',
    qr: 'qr_ph',
    owners_account: 'owners_account',
    ownersaccount: 'owners_account',
    paymongo: 'paymongo',
    bank_transfer: 'bank_transfer',
    banktransfer: 'bank_transfer',
    gcash: 'gcash',
    paymaya: 'paymaya',
    other: 'other',
  }
  return aliases[key] ?? null
}

function paymentMethodsFromPayments(
  payments: Array<{ payment_method: string }> | null | undefined,
): PaymentMethod[] {
  const out: PaymentMethod[] = []
  for (const p of payments ?? []) {
    const method = normalizePaymentMethod(p.payment_method)
    if (method && !out.includes(method)) out.push(method)
  }
  return out
}

function mapRemoteSales(rows: RemoteSaleRow[]): Sale[] {
  const out: Sale[] = []
  for (const row of rows) {
    const fromJoin = oneName(row.clients, 'full_name')
    const fromLocal = row.client_id ? getClientById(row.client_id)?.fullName : undefined
    const clientName = fromJoin || fromLocal || 'Client'
    const branchName = branchNameFor(row.branch_id, row.branches)
    const paymentMethods = paymentMethodsFromPayments(row.payments)
    // Only default to cash when the sale truly has no payment rows (legacy / import gaps)
    const paymentMethod = paymentMethods[0] ?? ('cash' as PaymentMethod)
    const items = row.sale_items?.length
      ? row.sale_items
      : [
          {
            id: row.id,
            name: 'Sale',
            quantity: 1,
            unit_price: Number(row.total_amount),
            line_total: Number(row.total_amount),
            item_type: 'service',
            sku: null,
            sessions_total: null,
            sessions_completed: null,
          },
        ]

    items.forEach((item, index) => {
      const itemType =
        item.item_type === 'package' || item.item_type === 'product' || item.item_type === 'service'
          ? item.item_type
          : 'service'
      out.push({
        id: `${row.id}:${item.id || index}`,
        invoiceNumber: row.invoice_number || row.booking_ref || row.id.slice(0, 8),
        clientId: row.client_id || '',
        clientName,
        branchId: row.branch_id,
        branchName,
        staffName: row.staff_name || undefined,
        doctorName: row.doctor_name || undefined,
        treatmentOrPackage: item.name,
        itemType,
        paymentType: row.payment_type || 'Full Payment',
        bookingRef: row.booking_ref || row.invoice_number || undefined,
        sku: item.sku || undefined,
        quantity: item.quantity,
        unitRetailPrice: Number(item.unit_price),
        leadSource: row.lead_source || undefined,
        referredByClientId: row.referred_by_client_id || undefined,
        referredByName: row.referred_by_name || undefined,
        totalAmount: Number(item.line_total),
        paymentMethod,
        paymentMethods: paymentMethods.length ? paymentMethods : undefined,
        status: (row.status as Sale['status']) || 'pending',
        createdAt: row.created_at,
        episodeKey: 'live-booking',
        contractAmount:
          row.contract_amount != null && Number.isFinite(Number(row.contract_amount))
            ? Number(row.contract_amount)
            : undefined,
        sessionsTotal:
          item.sessions_total != null && Number.isFinite(Number(item.sessions_total))
            ? Number(item.sessions_total)
            : undefined,
        sessionsCompleted:
          item.sessions_completed != null && Number.isFinite(Number(item.sessions_completed))
            ? Number(item.sessions_completed)
            : undefined,
      })
    })
  }
  return out
}

/**
 * Header-only select. Nested sale_items/payments embeds time out under branch RLS
 * (Postgres 57014) for franchise clinics with thousands of migration rows.
 * Items + payments are loaded in separate batched queries below.
 */
const REMOTE_SALES_HEADER_SELECT: string =
  'id, client_id, branch_id, staff_name, doctor_name, total_amount, status, created_at, ' +
  'invoice_number, payment_type, booking_ref, lead_source, referred_by_name, referred_by_client_id, ' +
  'contract_amount'

/** Single-client profile fetch can still use embeds (small result set). */
const REMOTE_SALES_CLIENT_SELECT: string =
  'id, client_id, branch_id, staff_name, doctor_name, total_amount, status, created_at, ' +
  'invoice_number, payment_type, booking_ref, lead_source, referred_by_name, referred_by_client_id, ' +
  'contract_amount, ' +
  'sale_items ( id, name, quantity, unit_price, line_total, item_type, sku, sessions_total, sessions_completed ), ' +
  'payments ( payment_method, payment_status ), ' +
  'clients!client_id ( full_name ), ' +
  'branches!branch_id ( name )'

type RemoteSaleItem = NonNullable<RemoteSaleRow['sale_items']>[number]
type RemotePayment = NonNullable<RemoteSaleRow['payments']>[number]

async function fetchSaleItemsBySaleIds(
  saleIds: string[],
): Promise<Map<string, RemoteSaleItem[]>> {
  const out = new Map<string, RemoteSaleItem[]>()
  if (!supabase || !saleIds.length) return out
  const chunkSize = 200
  for (let i = 0; i < saleIds.length; i += chunkSize) {
    const chunk = saleIds.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from('sale_items')
      .select(
        'id, sale_id, name, quantity, unit_price, line_total, item_type, sku, sessions_total, sessions_completed',
      )
      .in('sale_id', chunk)
    if (error) {
      console.warn('[sales] sale_items batch failed', error.message)
      continue
    }
    for (const row of (data ?? []) as Array<RemoteSaleItem & { sale_id: string }>) {
      const list = out.get(row.sale_id) ?? []
      list.push(row)
      out.set(row.sale_id, list)
    }
  }
  return out
}

async function fetchPaymentsBySaleIds(
  saleIds: string[],
): Promise<Map<string, RemotePayment[]>> {
  const out = new Map<string, RemotePayment[]>()
  if (!supabase || !saleIds.length) return out
  const chunkSize = 200
  for (let i = 0; i < saleIds.length; i += chunkSize) {
    const chunk = saleIds.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from('payments')
      .select('sale_id, payment_method, payment_status')
      .in('sale_id', chunk)
    if (error) {
      console.warn('[sales] payments batch failed', error.message)
      continue
    }
    for (const row of (data ?? []) as Array<RemotePayment & { sale_id: string }>) {
      const list = out.get(row.sale_id) ?? []
      list.push({ payment_method: row.payment_method, payment_status: row.payment_status })
      out.set(row.sale_id, list)
    }
  }
  return out
}

async function fetchClientNamesByIds(clientIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (!supabase || !clientIds.length) return out
  const unique = [...new Set(clientIds.filter(Boolean))]
  const chunkSize = 200
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data, error } = await supabase.from('clients').select('id, full_name').in('id', chunk)
    if (error) {
      console.warn('[sales] clients batch failed', error.message)
      continue
    }
    for (const row of (data ?? []) as Array<{ id: string; full_name: string }>) {
      if (row.full_name) out.set(row.id, row.full_name)
    }
  }
  return out
}

function mergeRemoteSaleLines(mapped: Sale[]) {
  if (!mapped.length) return
  const byId = new Map(remoteLiveSales.map((s) => [s.id, s]))
  for (const row of mapped) byId.set(row.id, row)
  remoteLiveSales = [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  emitChange()
}

type SaleHeaderRow = Omit<RemoteSaleRow, 'sale_items' | 'payments' | 'clients' | 'branches'>

async function hydrateSaleHeaders(headers: SaleHeaderRow[]): Promise<Sale[]> {
  if (!headers.length) return []
  const saleIds = headers.map((h) => h.id)
  const clientIds = headers
    .map((h) => h.client_id)
    .filter((id): id is string => Boolean(id))
  const [itemsBySale, paysBySale, clientNames] = await Promise.all([
    fetchSaleItemsBySaleIds(saleIds),
    fetchPaymentsBySaleIds(saleIds),
    fetchClientNamesByIds(clientIds),
  ])
  const all: RemoteSaleRow[] = headers.map((h) => ({
    ...h,
    sale_items: itemsBySale.get(h.id) ?? null,
    payments: paysBySale.get(h.id) ?? null,
    clients:
      h.client_id && clientNames.has(h.client_id)
        ? { full_name: clientNames.get(h.client_id)! }
        : null,
    branches: null,
  }))
  return mapRemoteSales(all)
}

/**
 * Fast Franchise Sales path: date-scoped ops rows only (skips Migration history).
 * Bacoor has ~3k migration rows — loading those for this page was causing multi-minute waits.
 */
export async function fetchOpsSalesForRange(options: {
  branchId?: string
  from: string
  to: string
}): Promise<Sale[]> {
  if (!isSupabaseConfigured || !supabase) return []
  const fromDay = options.from.slice(0, 10)
  const toDay = options.to.slice(0, 10)
  if (!fromDay || !toDay) return []

  // Inclusive end date → next calendar day (UTC date string compare on timestamptz)
  const toExclusive = (() => {
    const d = new Date(`${toDay}T00:00:00+08:00`)
    d.setDate(d.getDate() + 1)
    return d.toISOString()
  })()
  const fromInclusive = `${fromDay}T00:00:00+08:00`

  const pageSize = 500
  const headers: SaleHeaderRow[] = []
  for (let from = 0; from < 10000; from += pageSize) {
    const to = from + pageSize - 1
    let query = supabase
      .from('sales')
      .select(REMOTE_SALES_HEADER_SELECT)
      .gte('created_at', fromInclusive)
      .lt('created_at', toExclusive)
      .or('lead_source.is.null,lead_source.neq.Migration')
      .order('created_at', { ascending: false })
      .range(from, to)
    if (options.branchId) {
      query = query.eq('branch_id', options.branchId)
    }

    const { data, error } = await query
    if (error) {
      console.error('[sales] ops range fetch failed', error.message)
      return []
    }
    if (!data?.length) break
    headers.push(...(data as unknown as SaleHeaderRow[]))
    if (data.length < pageSize) break
  }

  return hydrateSaleHeaders(headers)
}

/** Manila calendar YYYY-MM-DD */
function manilaDateKey(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Lean clinic ops load (excludes Migration). Use on Franchise Sales / Customer List
 * instead of pulling thousands of migration installment headers.
 */
export async function ensureBranchOpsSales(options?: {
  branchId?: string
  /** Inclusive from date YYYY-MM-DD (default: first day of current Manila month) */
  from?: string
  /** Inclusive to date YYYY-MM-DD (default: today Manila) */
  to?: string
  /** When true, also upsert client stubs from these sales into the registry */
  syncClients?: boolean
}): Promise<Sale[]> {
  const to = options?.to || manilaDateKey()
  const from = options?.from || `${to.slice(0, 8)}01`
  const rows = await fetchOpsSalesForRange({
    branchId: options?.branchId,
    from,
    to,
  })
  if (rows.length) {
    mergeRemoteSaleLines(rows)
    loaded = true
    if (options?.syncClients !== false) {
      syncClientsFromSalesRegistry()
    }
    emitChange()
  }
  return rows
}

/**
 * @deprecated Use {@link ensureBranchOpsSales}. Full-branch fetch included Migration
 * history and froze the UI — this now delegates to ops-only (no Migration, no JSON dump).
 */
export async function ensureBranchRemoteSales(branchId: string): Promise<number> {
  if (!isSupabaseConfigured || !branchId) return 0
  const to = manilaDateKey()
  const rows = await ensureBranchOpsSales({
    branchId,
    from: '2025-09-01',
    to,
    syncClients: false,
  })
  return rows.length
}

async function lookupClientIdByName(clientName?: string): Promise<string | null> {
  if (!supabase || !clientName?.trim()) return null
  const { data } = await supabase
    .from('clients')
    .select('id, full_name')
    .ilike('full_name', clientName.trim())
    .limit(8)
  const needle = clientName.trim().toLowerCase()
  const match = (data as { id: string; full_name: string }[] | null)?.find(
    (r) => r.full_name.trim().toLowerCase() === needle,
  )
  return match?.id ?? null
}

async function fetchSalesRowsForClientId(clientId: string): Promise<Sale[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('sales')
    .select(REMOTE_SALES_CLIENT_SELECT)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (!error) {
    return mapRemoteSales((data as unknown as RemoteSaleRow[] | null) ?? [])
  }

  console.warn('[sales] client embed fetch failed, using header path', error.message)
  const { data: headers, error: hErr } = await supabase
    .from('sales')
    .select(REMOTE_SALES_HEADER_SELECT)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1000)
  if (hErr || !headers?.length) {
    console.error('[sales] client fetch failed', hErr?.message || error.message)
    return []
  }
  const ids = (headers as unknown as Array<{ id: string }>).map((h) => h.id)
  const [itemsBySale, paysBySale] = await Promise.all([
    fetchSaleItemsBySaleIds(ids),
    fetchPaymentsBySaleIds(ids),
  ])
  const rows: RemoteSaleRow[] = (
    headers as unknown as Array<
      Omit<RemoteSaleRow, 'sale_items' | 'payments' | 'clients' | 'branches'>
    >
  ).map((h) => ({
    ...h,
    sale_items: itemsBySale.get(h.id) ?? null,
    payments: paysBySale.get(h.id) ?? null,
    clients: null,
    branches: null,
  }))
  return mapRemoteSales(rows)
}

/** Ensure one client's Supabase sales are in the in-memory registry (profile tabs). */
export async function ensureClientRemoteSales(
  clientId: string,
  clientName?: string,
): Promise<{ count: number; resolvedClientId: string | null }> {
  if (!isSupabaseConfigured || !supabase || !clientId) {
    return { count: 0, resolvedClientId: null }
  }

  let resolvedId = isUuid(clientId) ? clientId : await lookupClientIdByName(clientName)
  if (!resolvedId) return { count: 0, resolvedClientId: null }

  let mapped = await fetchSalesRowsForClientId(resolvedId)
  // UUID on the profile may not match sales.client_id — retry by name
  if (!mapped.length && clientName) {
    const byName = await lookupClientIdByName(clientName)
    if (byName && byName !== resolvedId) {
      resolvedId = byName
      mapped = await fetchSalesRowsForClientId(resolvedId)
    }
  }
  if (!mapped.length) return { count: 0, resolvedClientId: resolvedId }

  // Keep DB client_id so a later full remote refresh still matches this profile
  const named = mapped.map((s) => ({
    ...s,
    clientId: resolvedId,
    clientName:
      clientName && (s.clientName === 'Client' || !s.clientName) ? clientName : s.clientName,
  }))
  mergeRemoteSaleLines(named)

  // Point local registry at the sales client_id when the URL/local id differed
  if (resolvedId !== clientId) {
    const local = getClientById(clientId) || getClients().find(
      (c) =>
        !!clientName &&
        c.fullName.trim().toLowerCase() === clientName.trim().toLowerCase(),
    )
    if (local) {
      saveClient({ ...local, id: resolvedId })
    }
  }

  return { count: named.length, resolvedClientId: resolvedId }
}

/**
 * Apply a remote sales snapshot. Never replace a non-empty cache with [] —
 * an unauthenticated / pre-login fetch returns empty and would wipe profile lines.
 */
/**
 * One-shot warm cache for booking / analytics pages.
 * Never loads the old XLSX JSON dump or Migration history.
 * After first load, later callers return immediately (no re-download on every page).
 */
export async function preloadSalesData(options?: {
  branchId?: string
  /** @deprecated JSON dump removed — ignored */
  skipImported?: boolean
}): Promise<void> {
  const branchId = options?.branchId?.trim() || undefined

  if (loaded) return
  if (loadPromise) {
    await loadPromise
    return
  }

  loadPromise = (async () => {
    // Drop any leftover in-memory dump from older builds
    importedSales = []
    if (!isSupabaseConfigured) {
      loaded = true
      emitChange()
      return
    }
    try {
      const to = manilaDateKey()
      // Recent ops only for app-wide warm cache (Franchise Sales / reports use their own ranges)
      const from = daysAgoManila(90)
      await ensureBranchOpsSales({
        branchId,
        from,
        to,
        syncClients: false,
      })
    } catch (err) {
      console.error('[sales] ops preload failed', err)
    }
    loaded = true
    emitChange()
  })()

  return loadPromise
}

/** YYYY-MM-DD N calendar days before today (Manila). */
function daysAgoManila(days: number): string {
  const parts = manilaDateKey().split('-').map(Number)
  const d = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!))
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/** Re-fetch remote sales after login (bootstrap often runs before a JWT exists). */
export async function refreshRemoteSalesAfterAuth(branchId?: string): Promise<void> {
  if (!isSupabaseConfigured) return
  // Ops only — never Migration dump, never sales-transactions.json.
  // Full Clinic Report history stays in Supabase; Franchise Sales / Customer List
  // fetch their own date ranges. Profiles use ensureClientRemoteSales.
  const to = manilaDateKey()
  const from = daysAgoManila(90)
  await ensureBranchOpsSales({
    branchId,
    from,
    to,
    syncClients: false,
  })
  loaded = true
  emitChange()
}

export function isSalesDataLoaded(): boolean {
  return loaded
}

export function getImportedSales(): Sale[] {
  return importedSales
}

/** All sales: local extras + remote booking sales + imported JSON */
export function getSales(): Sale[] {
  return mergeSales()
}

export function subscribeSalesData(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === EXTRA_KEY) listener()
  }
  window.addEventListener(CHANGE, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE, listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Future: booking checkout appends here and recomputes client profile */
export function appendExtraSale(sale: Sale): void {
  const extra = readExtraSales().filter((s) => s.id !== sale.id)
  extra.unshift(sale)
  localStorage.setItem(EXTRA_KEY, JSON.stringify(extra.slice(0, 500)))
  emitChange()
}

export function deleteExtraSale(id: string): void {
  const next = readExtraSales().filter((s) => s.id !== id)
  localStorage.setItem(EXTRA_KEY, JSON.stringify(next))
  remoteLiveSales = remoteLiveSales.filter((s) => s.id !== id)
  emitChange()
}

function bookingMatchKey(sale: Sale): string {
  return sale.bookingRef || sale.invoiceNumber || sale.id
}

/** Extract sales.id UUIDs from live line ids (`{saleUuid}:{itemId}`). */
function saleHeaderIdsForBooking(bookingKey: string): string[] {
  const ids = new Set<string>()
  for (const s of getSales()) {
    if (bookingMatchKey(s) !== bookingKey) continue
    const head = s.id.includes(':') ? s.id.slice(0, s.id.indexOf(':')) : s.id
    if (isUuid(head)) ids.add(head)
  }
  return [...ids]
}

function clearLocalBooking(bookingKey: string) {
  const next = readExtraSales().filter((s) => bookingMatchKey(s) !== bookingKey)
  localStorage.setItem(EXTRA_KEY, JSON.stringify(next))
  remoteLiveSales = remoteLiveSales.filter((s) => bookingMatchKey(s) !== bookingKey)
  emitChange()
}

/**
 * Remove a whole booking group (same invoice / bookingRef) from live extras + Supabase.
 * Deletes payments first so DBs without ON DELETE CASCADE still succeed.
 */
export async function deleteExtraSalesByBooking(bookingKey: string): Promise<void> {
  const headerIds = saleHeaderIdsForBooking(bookingKey)

  if (isSupabaseConfigured && supabase) {
    if (headerIds.length > 0) {
      const { error: payErr } = await supabase.from('payments').delete().in('sale_id', headerIds)
      if (payErr) {
        console.error('[sales] delete payments failed', payErr.message)
      }

      const { error: commissionErr } = await supabase
        .from('commissions')
        .delete()
        .in('source_sale_id', headerIds)
      if (commissionErr && !/does not exist|schema cache/i.test(commissionErr.message)) {
        console.error('[sales] delete commissions failed', commissionErr.message)
      }

      const { error: saleErr } = await supabase.from('sales').delete().in('id', headerIds)
      if (saleErr) {
        throw new Error(saleErr.message || 'Could not delete booking from database')
      }
    } else {
      // Fallback when line ids are local-only (`sale-live-…`) but rows exist remotely
      const safe = bookingKey.replace(/"/g, '')
      const { data: remoteRows, error: findErr } = await supabase
        .from('sales')
        .select('id')
        .or(`booking_ref.eq."${safe}",invoice_number.eq."${safe}"`)
      if (findErr) {
        throw new Error(findErr.message || 'Could not find booking in database')
      }
      const foundIds = (remoteRows ?? []).map((r) => r.id as string).filter(Boolean)
      if (foundIds.length) {
        await supabase.from('payments').delete().in('sale_id', foundIds)
        const { error: saleErr } = await supabase.from('sales').delete().in('id', foundIds)
        if (saleErr) {
          throw new Error(saleErr.message || 'Could not delete booking from database')
        }
      }
    }
  }

  clearLocalBooking(bookingKey)
}

export type BookingPaymentSplit = {
  paymentMethod: PaymentMethod
  paymentAmount: number
}

/**
 * Persist one checkout cart as a single sale header + line items in Supabase,
 * and keep local/UI Sale rows for Today's Booking.
 * Optional paymentSplits writes one payments row per processor (Split Payment).
 */
export async function recordBookingCheckout(
  lines: Array<Omit<Sale, 'id'>>,
  opts?: { paymentSplits?: BookingPaymentSplit[] },
): Promise<Sale[]> {
  if (!lines.length) return []

  const head = lines[0]!
  const createdAt = head.createdAt || new Date().toISOString()
  const totalAmount = lines.reduce((sum, l) => sum + (l.totalAmount || 0), 0)

  let persisted: Sale[] = lines.map((line, index) => ({
    ...line,
    id: `sale-live-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt,
    episodeKey: 'live-booking',
  }))

  if (isSupabaseConfigured && supabase) {
    const { requireSupabaseSession, mapBookingAuthError } = await import('@/utils/supabaseSession')
    try {
      await requireSupabaseSession()
    } catch (err) {
      throw new Error(mapBookingAuthError(err instanceof Error ? err.message : 'Not signed in'))
    }

    const branchId = head.branchId?.trim() ?? ''
    if (!isUuid(branchId)) {
      throw new Error(
        'Branch is not linked to the database. Pick San Mateo, Cainta, Pasig, or another clinic branch and try again.',
      )
    }
    if (!isUuid(head.clientId)) {
      throw new Error('Customer is not linked to the database. Re-select the patient and try again.')
    }

    const saleId = crypto.randomUUID()
    const contractAmount =
      head.contractAmount != null && Number.isFinite(Number(head.contractAmount))
        ? Number(head.contractAmount)
        : null

    const { error: saleError } = await supabase.from('sales').insert({
      id: saleId,
      client_id: head.clientId,
      branch_id: branchId,
      // Access-user / kiosk ids are not public.staff rows — store name only
      staff_id: null,
      staff_name: head.staffName ?? null,
      doctor_id: null,
      doctor_name: head.doctorName ?? null,
      subtotal: totalAmount,
      discount: 0,
      tax: 0,
      total_amount: totalAmount,
      status: head.status,
      invoice_number: head.invoiceNumber,
      payment_type: head.paymentType ?? 'Full Payment',
      booking_ref: head.bookingRef ?? head.invoiceNumber,
      lead_source: head.leadSource ?? null,
      referred_by_client_id: null,
      referred_by_name: head.referredByName ?? null,
      contract_amount: contractAmount,
      created_at: createdAt,
    })

    if (saleError) {
      throw new Error(saleError.message || 'Could not save sale')
    }

    const itemRows = lines.map((line) => ({
      sale_id: saleId,
      item_type: line.itemType || 'service',
      item_id: null,
      name: line.treatmentOrPackage,
      quantity: line.quantity ?? 1,
      unit_price: line.unitRetailPrice ?? line.totalAmount,
      discount: 0,
      line_total: line.totalAmount,
      sku: line.sku ?? null,
      unit_cost: line.unitBaseCost ?? 0,
      sessions_total:
        line.sessionsTotal != null && Number.isFinite(Number(line.sessionsTotal))
          ? Number(line.sessionsTotal)
          : null,
      sessions_completed:
        line.sessionsCompleted != null && Number.isFinite(Number(line.sessionsCompleted))
          ? Number(line.sessionsCompleted)
          : null,
    }))

    const { data: insertedItems, error: itemError } = await supabase
      .from('sale_items')
      .insert(itemRows)
      .select(
        'id, name, quantity, unit_price, line_total, item_type, sku, sessions_total, sessions_completed',
      )

    if (itemError) {
      throw new Error(itemError.message || 'Could not save sale items')
    }

    const splits = (opts?.paymentSplits ?? [])
      .filter((s) => s.paymentAmount > 0 && s.paymentMethod)
      .map((s) => ({
        sale_id: saleId,
        provider: 'pos' as const,
        payment_method: s.paymentMethod,
        payment_status: head.status === 'paid' ? 'paid' : 'pending',
        payment_amount: s.paymentAmount,
        payment_date: createdAt,
      }))
    const paymentRows =
      splits.length > 0
        ? splits
        : [
            {
              sale_id: saleId,
              provider: 'pos' as const,
              payment_method: head.paymentMethod,
              payment_status: head.status === 'paid' ? 'paid' : 'pending',
              payment_amount: totalAmount,
              payment_date: createdAt,
            },
          ]

    const { error: payError } = await supabase.from('payments').insert(paymentRows)

    if (payError) {
      // Sale + items already saved — warn but don't wipe the order / cause a duplicate retry
      console.error('[sales] payment row failed', payError.message)
    }

    const splitMethods = [
      ...new Set(
        (opts?.paymentSplits ?? [])
          .map((s) => normalizePaymentMethod(s.paymentMethod) || s.paymentMethod)
          .filter(Boolean),
      ),
    ] as PaymentMethod[]
    const methodsForSale =
      splitMethods.length > 0
        ? splitMethods
        : head.paymentMethod
          ? [head.paymentMethod]
          : undefined

    persisted = (insertedItems ?? itemRows).map((item, index) => {
      const line = lines[index]!
      const itemType =
        (item as { item_type?: string }).item_type === 'package' ||
        (item as { item_type?: string }).item_type === 'product' ||
        (item as { item_type?: string }).item_type === 'service'
          ? ((item as { item_type: string }).item_type as Sale['itemType'])
          : line.itemType
      const itemId = (item as { id?: string }).id || String(index)
      return {
        ...line,
        id: `${saleId}:${itemId}`,
        createdAt,
        episodeKey: 'live-booking' as const,
        itemType,
        paymentMethod: methodsForSale?.[0] || line.paymentMethod,
        paymentMethods: methodsForSale,
      }
    })

    remoteLiveSales = [...persisted, ...remoteLiveSales]
    // Also mirror to localStorage so Today's Booking stays visible if remote refresh fails
    for (const sale of persisted) appendExtraSale(sale)
  } else {
    for (const sale of persisted) appendExtraSale(sale)
  }

  const all = mergeSales()
  touchClientFromSale(persisted[0]!, all)
  syncClientsFromSalesRegistry()
  emitChange()

  const saleHead = persisted[0]!
  const serviceSummary = persisted
    .map((s) => s.treatmentOrPackage)
    .filter(Boolean)
    .join(', ')
  const total = persisted.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
  void import('@/services/clientService')
    .then(({ getClientById }) => {
      const client = getClientById(saleHead.clientId)
      return import('@/services/marketingLeadService').then(({ syncHandoffOnSale }) =>
        syncHandoffOnSale({
          clientId: saleHead.clientId,
          fullName: saleHead.clientName || client?.fullName || '',
          phone: client?.phone || '',
          saleAmount: total,
          serviceSummary,
          branchId: saleHead.branchId,
        }),
      )
    })
    .catch(() => undefined)

  return persisted
}

/** @deprecated prefer recordBookingCheckout for multi-line carts */
export async function recordSaleFromBooking(saleInput: Omit<Sale, 'id'>): Promise<Sale> {
  const [sale] = await recordBookingCheckout([saleInput])
  return sale!
}

/**
 * Mark one availed session as used (Session History → USE).
 * `saleLineId` is `{saleUuid}:{saleItemUuid}` from mapped sales.
 */
export async function recordSessionUse(saleLineId: string): Promise<Sale | null> {
  const sep = saleLineId.indexOf(':')
  if (sep <= 0) throw new Error('Invalid sale line for session use')
  const saleId = saleLineId.slice(0, sep)
  const itemId = saleLineId.slice(sep + 1)
  if (!isUuid(saleId) || !isUuid(itemId)) {
    throw new Error('This entitlement is not linked to the database yet')
  }

  const existing = getSales().find((s) => s.id === saleLineId)
  const total = Math.max(1, Number(existing?.sessionsTotal) || 1)
  const completed = Math.max(0, Number(existing?.sessionsCompleted) || 0)
  if (completed >= total) {
    throw new Error('All sessions for this service are already used')
  }
  const nextCompleted = completed + 1

  if (isSupabaseConfigured && supabase) {
    const { requireSupabaseSession, mapBookingAuthError } = await import('@/utils/supabaseSession')
    try {
      await requireSupabaseSession()
    } catch (err) {
      throw new Error(mapBookingAuthError(err instanceof Error ? err.message : 'Not signed in'))
    }
    const { error } = await supabase
      .from('sale_items')
      .update({ sessions_completed: nextCompleted })
      .eq('id', itemId)
      .eq('sale_id', saleId)
    if (error) throw new Error(error.message || 'Could not update session')
  }

  const patch = (s: Sale): Sale =>
    s.id === saleLineId
      ? { ...s, sessionsCompleted: nextCompleted, sessionsTotal: total }
      : s

  remoteLiveSales = remoteLiveSales.map(patch)
  const extras = readExtraSales().map(patch)
  localStorage.setItem(EXTRA_KEY, JSON.stringify(extras.slice(0, 500)))
  if (existing && !remoteLiveSales.some((s) => s.id === saleLineId)) {
    remoteLiveSales = [patch(existing), ...remoteLiveSales]
  }
  emitChange()
  return getSales().find((s) => s.id === saleLineId) ?? null
}

export type TodayBookingRow = {
  bookingKey: string
  bookingId: string
  patientName: string
  clientId: string
  services: string
  products: string
  staffName: string
  dateIso: string
  status: string
  payment: number
  paymentType: string
  paymentMethod: string
  branchId: string
  branchName: string
  saleIds: string[]
  isLive: boolean
}

function shortBookingId(sale: Sale): string {
  const ref = sale.bookingRef || sale.invoiceNumber || sale.id
  const digits = ref.replace(/\D/g, '')
  if (digits.length >= 4) return digits.slice(-4)
  return ref.slice(-6).toUpperCase()
}

function paymentTypeShort(raw?: string): string {
  const p = (raw || 'Full Payment').toLowerCase()
  if (p.includes('split')) return 'Split'
  if (p.includes('installment')) return 'Installment'
  if (p.includes('partial')) return 'Partial'
  return 'Full'
}

function paymentMethodLabel(method: Sale['paymentMethod'] | string): string {
  const normalized = normalizePaymentMethod(method) || method
  const map: Record<string, string> = {
    cash: 'CASH',
    credit_card: 'CREDIT CARD',
    debit_card: 'DEBIT CARD',
    qr_ph: 'QRPH',
    owners_account: 'OWNERS ACCOUNT',
    gcash: 'GCASH',
    paymaya: 'PAYMAYA',
    paymongo: 'QRPH',
    bank_transfer: 'BANK TRANSFER',
    other: 'OTHER',
  }
  return map[normalized] || String(normalized).toUpperCase().replace(/_/g, ' ')
}

function paymentMethodsDisplay(sale: Sale): string {
  const methods =
    sale.paymentMethods && sale.paymentMethods.length > 0
      ? sale.paymentMethods
      : sale.paymentMethod
        ? [sale.paymentMethod]
        : []
  if (!methods.length) return 'CASH'
  return methods.map((m) => paymentMethodLabel(m)).join(' + ')
}

function formatServiceLine(sale: Sale): string {
  const name = sale.treatmentOrPackage || 'Item'
  if (sale.itemType === 'package') return `Package: ${name}`
  if (sale.itemType === 'service') return `Service: ${name}`
  return name
}

function localDateKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isLiveSale(sale: Sale): boolean {
  return (
    sale.episodeKey === 'live-booking' ||
    sale.id.startsWith('sale-live-') ||
    /^[0-9a-f-]{36}:/i.test(sale.id)
  )
}

/** Group sales into booking rows (invoice / bookingRef). Optional day filter YYYY-MM-DD. */
export function getBookingRows(opts?: {
  dateKey?: string
  branchId?: string
}): TodayBookingRow[] {
  const sales = getSales().filter((s) => {
    if (opts?.branchId && s.branchId !== opts.branchId) return false
    if (opts?.dateKey && localDateKey(s.createdAt) !== opts.dateKey) return false
    return true
  })

  const groups = new Map<string, Sale[]>()
  for (const s of sales) {
    const key = s.bookingRef || s.invoiceNumber || s.id
    const list = groups.get(key) ?? []
    list.push(s)
    groups.set(key, list)
  }

  const rows: TodayBookingRow[] = []
  for (const [bookingKey, lines] of groups) {
    const sorted = [...lines].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const head = sorted[0]!
    const services = sorted
      .filter((l) => l.itemType !== 'product')
      .map(formatServiceLine)
    const products = sorted
      .filter((l) => l.itemType === 'product')
      .map((l) => l.treatmentOrPackage)
    const payment = sorted.reduce((sum, l) => sum + (l.totalAmount || 0), 0)
    const paid = sorted.every((l) => l.status === 'paid')
    rows.push({
      bookingKey,
      bookingId: shortBookingId(head),
      patientName: head.clientName,
      clientId: head.clientId,
      services: services.length ? services.join(', ') : 'N/A',
      products: products.length ? products.join(', ') : 'N/A',
      staffName: head.staffName || '—',
      dateIso: head.createdAt,
      status: paid ? 'Paid' : head.status === 'pending' ? 'Pending' : head.status,
      payment,
      paymentType: paymentTypeShort(head.paymentType),
      paymentMethod: paymentMethodsDisplay(head),
      branchId: head.branchId,
      branchName: head.branchName,
      saleIds: sorted.map((l) => l.id),
      isLive: sorted.some(isLiveSale),
    })
  }

  return rows.sort((a, b) => b.dateIso.localeCompare(a.dateIso))
}

/** Line items belonging to one booking (invoice / bookingRef). */
export function getSalesForBooking(bookingKey: string): Sale[] {
  return getSales()
    .filter((s) => (s.bookingRef || s.invoiceNumber || s.id) === bookingKey)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function todayDateKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
