import type { Client } from '@/types'
import {
  CLIENT_PROFILE_SEED,
  findClientProfileSeed,
  normalizeClientName,
} from '@/constants/clientProfileSeed'
import { getBranches, resolveClinicBranchId } from '@/services/branchService'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { safeLocalGetItem, safeLocalSetItem } from '@/utils/safeLocalStorage'
import { isUuid } from '@/utils/uuid'

const STORAGE_KEY = 'imajica_clients'
const CHANGE_EVENT = 'imajica:clients-changed'
const PROFILE_ENRICH_FLAG = 'imajica_client_profiles_enriched_v1'
/** Keep local cache lean — franchise tablets hit 5MB when avatars are data URLs. */
const MAX_LOCAL_CLIENTS = 400

function readExtra(): Client[] {
  try {
    const raw = safeLocalGetItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Client[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Never put camera data-URLs into localStorage (quota killers on Dasma/Bacoor tablets). */
function slimClientForLocal(client: Client): Client {
  const avatar = client.avatarUrl
  if (avatar && avatar.startsWith('data:')) {
    const { avatarUrl: _drop, ...rest } = client
    return rest
  }
  return client
}

function writeClientsLocal(clients: Client[]): void {
  const slim = clients.map(slimClientForLocal)
  const capped =
    slim.length > MAX_LOCAL_CLIENTS
      ? [...slim]
          .sort((a, b) => (b.registeredAt || '').localeCompare(a.registeredAt || ''))
          .slice(0, MAX_LOCAL_CLIENTS)
      : slim

  const tryWrite = (rows: Client[]) =>
    safeLocalSetItem(STORAGE_KEY, JSON.stringify(rows))

  if (tryWrite(capped)) return

  // Progressive shrink until it fits (or give up — remote DB is source of truth)
  for (const limit of [200, 100, 50, 20, 5]) {
    const smaller = capped.slice(0, limit).map((c) => {
      const { avatarUrl: _a, adminNotes: _n, medicalConcerns: _m, currentMedications: _med, ...rest } =
        c
      return rest
    })
    if (tryWrite(smaller)) return
  }
  console.warn('[clients] local cache skipped — browser storage full; remote save still used')
}

function emitChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function pickText(...values: Array<string | null | undefined>) {
  for (const v of values) {
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

/** Prefer real contact; treat placeholders / generated locals as empty. */
function pickContact(...values: Array<string | null | undefined>) {
  const fallback: string[] = []
  for (const v of values) {
    if (v == null) continue
    const s = String(v).trim()
    if (!s || s === '-' || s.toLowerCase() === 'n/a') continue
    if (s.toLowerCase().endsWith('@imajica.local')) {
      fallback.push(s)
      continue
    }
    return s
  }
  return fallback[0] || ''
}

function mergeClientRecords(base: Client, incoming: Partial<Client>): Client {
  const gender =
    incoming.gender === 'female' || incoming.gender === 'male'
      ? incoming.gender
      : base.gender === 'female' || base.gender === 'male'
        ? base.gender
        : incoming.gender || base.gender || 'prefer_not_to_say'

  // Prefer a stable UUID id when either side has one (never demote DB → client-import-*)
  const id =
    (isUuid(base.id) && base.id) ||
    (isUuid(incoming.id) && incoming.id) ||
    incoming.id ||
    base.id

  return {
    ...base,
    ...incoming,
    id,
    code: pickText(base.code, incoming.code) || base.code,
    fullName: pickText(incoming.fullName, base.fullName) || base.fullName,
    email: pickContact(base.email, incoming.email),
    phone: pickContact(base.phone, incoming.phone),
    dateOfBirth: pickContact(base.dateOfBirth, incoming.dateOfBirth),
    gender,
    address: pickContact(base.address, incoming.address) || undefined,
    occupation: pickText(base.occupation, incoming.occupation) || undefined,
    middleName: pickText(base.middleName, incoming.middleName) || undefined,
    preferredBranchId: pickText(incoming.preferredBranchId, base.preferredBranchId),
    preferredBranchName: pickText(incoming.preferredBranchName, base.preferredBranchName),
    status: incoming.status || base.status,
    isVip: incoming.isVip ?? base.isVip,
    avatarUrl: pickText(base.avatarUrl, incoming.avatarUrl) || undefined,
    registeredAt: pickText(base.registeredAt, incoming.registeredAt) || base.registeredAt,
    lastPurchaseAt:
      (incoming.lastPurchaseAt || '') > (base.lastPurchaseAt || '')
        ? incoming.lastPurchaseAt
        : base.lastPurchaseAt || incoming.lastPurchaseAt,
    lastSaleId:
      (incoming.lastPurchaseAt || '') > (base.lastPurchaseAt || '')
        ? incoming.lastSaleId || base.lastSaleId
        : base.lastSaleId || incoming.lastSaleId,
    sessionsCount: Math.max(base.sessionsCount ?? 0, incoming.sessionsCount ?? 0) || undefined,
    totalVisits: Math.max(base.totalVisits ?? 0, incoming.totalVisits ?? 0),
    totalSpent: Math.max(base.totalSpent ?? 0, incoming.totalSpent ?? 0),
    rewardPoints: Math.max(base.rewardPoints ?? 0, incoming.rewardPoints ?? 0) || undefined,
    emergencyContactName:
      pickText(base.emergencyContactName, incoming.emergencyContactName) || undefined,
    emergencyContactPhone:
      pickText(base.emergencyContactPhone, incoming.emergencyContactPhone) || undefined,
    medicalConcerns: pickText(base.medicalConcerns, incoming.medicalConcerns) || undefined,
    currentMedications:
      pickText(base.currentMedications, incoming.currentMedications) || undefined,
    adminNotes: pickText(base.adminNotes, incoming.adminNotes) || undefined,
  }
}

function mergeProfileOntoClient(client: Client): Client {
  const profile = findClientProfileSeed(client)
  if (!profile) return client
  return mergeClientRecords(client, {
    email: profile.email,
    phone: profile.phone,
    dateOfBirth: profile.dateOfBirth,
    gender: profile.gender,
    sessionsCount: profile.sessionsCount,
  })
}

/**
 * Merge known contact / gender / DOB / sessions onto customers that already
 * exist with the same name (or email). Never inserts duplicates.
 */
export function applyKnownClientProfiles(): number {
  const existing = readExtra()
  let changed = 0
  const nextById = new Map(existing.map((c) => [c.id, c]))

  for (const profile of CLIENT_PROFILE_SEED) {
    const nameKey = normalizeClientName(profile.fullName)
    const emailKey = profile.email.toLowerCase()

    const matches = existing.filter((c) => {
      if (normalizeClientName(c.fullName) === nameKey) return true
      if (c.email?.trim() && c.email.trim().toLowerCase() === emailKey) return true
      return false
    })

    for (const prev of matches) {
      const merged = mergeClientRecords(prev, {
        email: profile.email,
        phone: profile.phone,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        sessionsCount: profile.sessionsCount,
      })
      const dirty =
        merged.email !== prev.email ||
        merged.phone !== prev.phone ||
        merged.dateOfBirth !== prev.dateOfBirth ||
        merged.gender !== prev.gender ||
        merged.sessionsCount !== prev.sessionsCount
      if (dirty) {
        nextById.set(prev.id, merged)
        changed += 1
      }
    }
  }

  if (changed > 0) {
    writeClientsLocal([...nextById.values()])
    safeLocalSetItem(PROFILE_ENRICH_FLAG, 'done')
    emitChange()
  } else if (!safeLocalGetItem(PROFILE_ENRICH_FLAG)) {
    safeLocalSetItem(PROFILE_ENRICH_FLAG, 'done')
  }

  return changed
}

/** Newest customer first: latest booking/purchase, else registration (never A–Z). */
export function clientRecencyMs(c: Client): number {
  let best = 0
  for (const raw of [c.lastPurchaseAt, c.registeredAt]) {
    if (!raw?.trim()) continue
    const value = raw.trim()
    const ms = Date.parse(value.length === 10 ? `${value}T23:59:59+08:00` : value)
    if (Number.isFinite(ms) && ms > best) best = ms
  }
  // Local registrations use cl-{timestamp}
  if (c.id.startsWith('cl-')) {
    const n = Number(c.id.slice(3))
    if (Number.isFinite(n) && n > 1e11 && n > best) best = n
  }
  return best
}

export function compareClientsByRecentAvail(a: Client, b: Client): number {
  const diff = clientRecencyMs(b) - clientRecencyMs(a)
  if (diff !== 0) return diff
  const sa = a.lastSaleId || ''
  const sb = b.lastSaleId || ''
  if (sa !== sb) return sb.localeCompare(sa)
  // Stable tie-break only — not primary alphabetical listing
  return (b.id || '').localeCompare(a.id || '')
}

/** Last 10 digits — treats +639… and 09… as the same PH mobile. */
export function normalizePhoneDigits(phone: string | null | undefined): string {
  const d = String(phone || '').replace(/\D/g, '')
  if (d.length >= 10) return d.slice(-10)
  return d
}

/** Prefer UUID rows over local cl-* / client-import-* when showing one person once. */
export function dedupeClientsForDisplay(clients: Client[]): Client[] {
  const score = (c: Client) => {
    if (isUuid(c.id)) return 3
    if (c.id.startsWith('cl-')) return 2
    if (c.id.startsWith('client-import-')) return 1
    return 0
  }
  const byKey = new Map<string, Client>()
  for (const c of clients) {
    const phone = normalizePhoneDigits(c.phone)
    const key =
      phone.length >= 10 ? `p:${phone}` : `n:${normalizeClientName(c.fullName || '')}`
    if (!key || key === 'n:' || key === 'p:') continue
    const prev = byKey.get(key)
    if (!prev || score(c) > score(prev)) byKey.set(key, c)
  }
  return [...byKey.values()]
}

/** Locally registered customers only (no demo merge) */
export function getClients(): Client[] {
  return [...readExtra()].map(mergeProfileOntoClient).sort(compareClientsByRecentAvail)
}

/** Lookup without sorting the full registry (profile pages call this often). */
export function getClientById(id: string): Client | undefined {
  if (!id) return undefined
  const row = readExtra().find((c) => c.id === id)
  return row ? mergeProfileOntoClient(row) : undefined
}

export function saveClient(client: Client): Client {
  const extra = readExtra()
  const idx = extra.findIndex((c) => c.id === client.id)
  const next =
    idx >= 0 ? extra.map((c, i) => (i === idx ? client : c)) : [client, ...extra]
  writeClientsLocal(next)
  emitChange()
  return client
}

export function deleteClient(id: string): void {
  const next = readExtra().filter((c) => c.id !== id)
  writeClientsLocal(next)
  emitChange()
}

export function createClientCode(): string {
  const n = getClients().length + 1
  return `MJ-${String(n).padStart(6, '0')}`
}

export type NewClientInput = {
  firstName: string
  middleName?: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: Client['gender']
  branchId: string
  branchName: string
  occupation?: string
  address: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  medicalConcerns?: string
  currentMedications?: string
  adminNotes?: string
  avatarUrl?: string
}

/** After local register — try match Marketing handoff by full name + phone */
export function registerClient(input: NewClientInput & { marketingLeadId?: string }): Client {
  const resolvedBranchId =
    resolveClinicBranchId(input.branchId) ||
    resolveClinicBranchId(input.branchName) ||
    input.branchId
  const branch = getBranches().find((b) => b.id === resolvedBranchId)
  const fullName = [input.firstName, input.middleName, input.lastName]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(' ')
  const client: Client = {
    id: `cl-${Date.now()}`,
    code: createClientCode(),
    fullName,
    email: input.email.trim(),
    phone: input.phone.trim(),
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
    address: input.address.trim(),
    occupation: input.occupation?.trim() || undefined,
    middleName: input.middleName?.trim() || undefined,
    preferredBranchId: resolvedBranchId,
    preferredBranchName: branch?.name || input.branchName,
    status: 'active',
    isVip: false,
    avatarUrl: input.avatarUrl,
    registeredAt: new Date().toISOString(),
    totalVisits: 0,
    totalSpent: 0,
    emergencyContactName: input.emergencyContactName?.trim() || undefined,
    emergencyContactPhone: input.emergencyContactPhone?.trim() || undefined,
    medicalConcerns: input.medicalConcerns?.trim() || undefined,
    currentMedications: input.currentMedications?.trim() || undefined,
    adminNotes: input.adminNotes?.trim() || undefined,
  }
  const saved = saveClient(client)
  void import('@/services/marketingLeadService')
    .then(({ syncHandoffOnPatientBooked }) =>
      syncHandoffOnPatientBooked({
        fullName: saved.fullName,
        phone: saved.phone,
        clientId: saved.id,
        branchId: saved.preferredBranchId,
        leadId: input.marketingLeadId,
      }),
    )
    .catch(() => undefined)
  return saved
}

/**
 * Register patient locally + sync to Supabase (UUID + preferred_branch_id)
 * for all clinics including franchise (Dasma / Bacoor).
 */
export async function registerClientAndSync(
  input: NewClientInput & { marketingLeadId?: string },
): Promise<Client> {
  let local: Client
  try {
    local = registerClient(input)
  } catch (err) {
    // Quota used to abort the whole Save — still register remotely for every clinic.
    console.warn('[clients] local register cache failed', err)
    const resolvedBranchId =
      resolveClinicBranchId(input.branchId) ||
      resolveClinicBranchId(input.branchName) ||
      input.branchId
    const branch = getBranches().find((b) => b.id === resolvedBranchId)
    local = {
      id: `cl-${Date.now()}`,
      code: createClientCode(),
      fullName: [input.firstName, input.middleName, input.lastName]
        .map((p) => p?.trim())
        .filter(Boolean)
        .join(' '),
      email: input.email.trim(),
      phone: input.phone.trim(),
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      address: input.address.trim(),
      occupation: input.occupation?.trim() || undefined,
      middleName: input.middleName?.trim() || undefined,
      preferredBranchId: resolvedBranchId,
      preferredBranchName: branch?.name || input.branchName,
      status: 'active',
      isVip: false,
      registeredAt: new Date().toISOString(),
      totalVisits: 0,
      totalSpent: 0,
      emergencyContactName: input.emergencyContactName?.trim() || undefined,
      emergencyContactPhone: input.emergencyContactPhone?.trim() || undefined,
      medicalConcerns: input.medicalConcerns?.trim() || undefined,
      currentMedications: input.currentMedications?.trim() || undefined,
      adminNotes: input.adminNotes?.trim() || undefined,
    }
  }

  if (!isSupabaseConfigured || !supabase) return local

  try {
    const { ensureBookingClient } = await import('@/services/appointmentService')
    const remote = await ensureBookingClient({
      clientId: local.id,
      fullName: local.fullName,
      email: local.email,
      phone: local.phone,
      branchId: local.preferredBranchId,
    })

    if (remote.id && remote.id !== local.id) {
      try {
        deleteClient(local.id)
      } catch {
        /* ignore */
      }
    }

    const clinicId =
      resolveClinicBranchId(local.preferredBranchId) ||
      resolveClinicBranchId(local.preferredBranchName) ||
      local.preferredBranchId
    const clinic = getBranches().find((b) => b.id === clinicId)
    const synced: Client = {
      ...local,
      id: remote.id || local.id,
      fullName: remote.fullName || local.fullName,
      email: remote.email || local.email,
      phone: remote.phone || local.phone,
      preferredBranchId: clinicId,
      preferredBranchName: clinic?.name || local.preferredBranchName,
      // Keep photo in memory for this session; local/DB skip data URLs
      avatarUrl: input.avatarUrl,
    }
    const saved = saveClient(synced)
    try {
      await persistClientToSupabase(saved)
    } catch (err) {
      console.warn('[clients] profile sync after register', err)
      throw err instanceof Error ? err : new Error('Could not save customer to the database')
    }
    return saved
  } catch (err) {
    console.warn('[clients] remote register failed', err)
    throw err instanceof Error
      ? err
      : new Error('Could not save customer. Check connection and try again.')
  }
}

/** Merge sales-import clients; never wipe contact details with empty sales rows. */
export function upsertClientsFromSalesImport(imported: Client[]): void {
  const existing = readExtra()
  const byId = new Map(existing.map((c) => [c.id, c]))

  const findByName = (name: string, skipId?: string) => {
    const key = normalizeClientName(name)
    if (!key) return undefined
    return [...byId.values()].find(
      (c) => c.id !== skipId && normalizeClientName(c.fullName) === key,
    )
  }

  for (const row of imported) {
    let prev = byId.get(row.id)
    if (!prev) {
      const nameMatch = findByName(row.fullName, row.id)
      if (nameMatch) {
        byId.delete(nameMatch.id)
        prev = nameMatch
      }
    }
    if (!prev) {
      byId.set(row.id, row)
      continue
    }
    // Keep Supabase UUID when present — do not replace with client-import-* ids
    const keepId = isUuid(prev.id) ? prev.id : isUuid(row.id) ? row.id : prev.id
    if (prev.id !== keepId) byId.delete(prev.id)
    if (row.id !== keepId) byId.delete(row.id)
    byId.set(keepId, mergeClientRecords(prev, { ...row, id: keepId }))
  }
  writeClientsLocal([...byId.values()])
  applyKnownClientProfiles()
  emitChange()
}

type RemoteClientRow = {
  id: string
  code: string | null
  full_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  gender: string | null
  address: string | null
  occupation: string | null
  middle_name: string | null
  preferred_branch_id: string | null
  status: string | null
  is_vip: boolean | null
  avatar_url: string | null
  registered_at: string | null
  total_visits: number | null
  total_spent: number | null
  reward_points: number | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  medical_concerns: string | null
  current_medications: string | null
  admin_notes: string | null
  membership_label: string | null
}

function mapRemoteClient(row: RemoteClientRow): Client {
  const clinicId = resolveClinicBranchId(row.preferred_branch_id) || row.preferred_branch_id || ''
  const branch = clinicId ? getBranches().find((b) => b.id === clinicId) : undefined
  const gender =
    row.gender === 'female' || row.gender === 'male' || row.gender === 'prefer_not_to_say'
      ? row.gender
      : 'prefer_not_to_say'
  return {
    id: row.id,
    code: row.code || `MJ-${row.id.slice(0, 8).toUpperCase()}`,
    fullName: (row.full_name || '').trim() || 'Unknown client',
    email: row.email || '',
    phone: row.phone || '',
    dateOfBirth: row.date_of_birth || '',
    gender,
    address: row.address || undefined,
    occupation: row.occupation || undefined,
    middleName: row.middle_name || undefined,
    preferredBranchId: clinicId,
    preferredBranchName: branch?.name || '',
    status: row.status === 'inactive' ? 'inactive' : 'active',
    isVip: Boolean(row.is_vip),
    avatarUrl: row.avatar_url || undefined,
    registeredAt: row.registered_at || new Date().toISOString(),
    totalVisits: Number(row.total_visits) || 0,
    totalSpent: Number(row.total_spent) || 0,
    rewardPoints: row.reward_points != null ? Number(row.reward_points) : undefined,
    membershipLabel: row.membership_label || undefined,
    emergencyContactName: row.emergency_contact_name || undefined,
    emergencyContactPhone: row.emergency_contact_phone || undefined,
    medicalConcerns: row.medical_concerns || undefined,
    currentMedications: row.current_medications || undefined,
    adminNotes: row.admin_notes || undefined,
  }
}

/**
 * Pull client contact profiles from Supabase into the local registry.
 * Fills empty phone/email/gender/DOB/address that sales-only rows lack.
 * Remote rows are additive — never deletes local-only customers.
 */
export async function preloadClientsFromSupabase(options?: {
  /** Clinic managers: only pull customers for this branch (faster). */
  branchId?: string
}): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0

  const branchId = options?.branchId?.trim() || undefined
  // Paginate so HQ always gets the full migrated set (not just first page)
  const pageSize = 1000
  const all: RemoteClientRow[] = []
  for (let from = 0; from < 20000; from += pageSize) {
    const to = from + pageSize - 1
    let query = supabase
      .from('clients')
      .select(
        `
      id, code, full_name, email, phone, date_of_birth, gender, address,
      occupation, middle_name, preferred_branch_id, status, is_vip, avatar_url,
      registered_at, total_visits, total_spent, reward_points,
      emergency_contact_name, emergency_contact_phone, medical_concerns,
      current_medications, admin_notes, membership_label
    `,
      )
      .order('updated_at', { ascending: false })
      .range(from, to)
    if (branchId) {
      query = query.eq('preferred_branch_id', branchId)
    }

    const { data, error } = await query

    if (error) {
      if (!/does not exist|schema cache|column/i.test(error.message)) {
        console.error('[clients] preload failed', error.message)
      }
      break
    }
    if (!data?.length) break
    all.push(...(data as RemoteClientRow[]))
    if (data.length < pageSize) break
  }

  if (!all.length) return 0

  const existing = readExtra()
  const byId = new Map(existing.map((c) => [c.id, c]))
  let changed = 0

  for (const raw of all) {
    const remote = mapRemoteClient(raw)
    const prev = byId.get(remote.id)
    const byName = !prev
      ? [...byId.values()].find(
          (c) => normalizeClientName(c.fullName) === normalizeClientName(remote.fullName),
        )
      : undefined

    if (byName && byName.id !== remote.id) {
      byId.delete(byName.id)
      // Remote profile wins for blank local sales stubs
      const merged = mergeClientRecords(remote, byName)
      byId.set(remote.id, { ...merged, id: remote.id })
      changed += 1
      continue
    }

    if (!prev) {
      byId.set(remote.id, remote)
      changed += 1
      continue
    }

    // Prefer remote contact onto existing local row (fill blanks / placeholders)
    const merged = mergeClientRecords(remote, prev)
    const next = { ...merged, id: remote.id }
    const dirty =
      next.email !== prev.email ||
      next.phone !== prev.phone ||
      next.dateOfBirth !== prev.dateOfBirth ||
      next.gender !== prev.gender ||
      next.address !== prev.address ||
      next.preferredBranchId !== prev.preferredBranchId ||
      next.id !== prev.id
    byId.set(remote.id, next)
    if (prev.id !== remote.id) byId.delete(prev.id)
    if (dirty) changed += 1
  }

  if (changed > 0 || all.length > existing.length) {
    writeClientsLocal([...byId.values()])
    applyKnownClientProfiles()
    emitChange()
  }
  return changed || all.length
}

/**
 * Live patient lookup for booking Select Patient.
 * Local cache is capped (~400) while clinics like San Mateo have 1000+ clients —
 * booking list comes from sales (always has the name), but Select Patient used to
 * search localStorage only and miss customers such as Cynthia Fegalan.
 */
export async function searchClientsFromSupabase(input: {
  query: string
  /** Prefer preferred_branch_id match; still includes null-branch matches when useful */
  branchId?: string | null
  limit?: number
}): Promise<Client[]> {
  const q = input.query.trim()
  if (!q) return []
  if (!isSupabaseConfigured || !supabase) {
    const lower = q.toLowerCase()
    const phoneQ = q.replace(/\s/g, '')
    return getClients()
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(lower) ||
          c.email.toLowerCase().includes(lower) ||
          c.phone.replace(/\s/g, '').includes(phoneQ),
      )
      .slice(0, input.limit ?? 40)
  }

  const limit = Math.min(80, Math.max(10, input.limit ?? 40))
  const branchId =
    resolveClinicBranchId(input.branchId) || (input.branchId && isUuid(input.branchId) ? input.branchId : null)
  const selectCols = `
      id, code, full_name, email, phone, date_of_birth, gender, address,
      occupation, middle_name, preferred_branch_id, status, is_vip, avatar_url,
      registered_at, total_visits, total_spent, reward_points,
      emergency_contact_name, emergency_contact_phone, medical_concerns,
      current_medications, admin_notes, membership_label
    `

  const digits = q.replace(/\D/g, '')
  const orParts = [
    `full_name.ilike.%${q.replace(/[%_]/g, '')}%`,
    `email.ilike.%${q.replace(/[%_]/g, '')}%`,
  ]
  if (digits.length >= 4) {
    orParts.push(`phone.ilike.%${digits.slice(-10)}%`)
  }

  // Fetch by name/phone/email only — branch filter applied in JS so PostgREST
  // multi-`.or()` quirks cannot hide clinic customers (e.g. Cynthia Fegalan).
  const fetchLimit = branchId ? Math.min(200, limit * 4) : limit
  const { data, error } = await supabase
    .from('clients')
    .select(selectCols)
    .or(orParts.join(','))
    .neq('status', 'inactive')
    .order('updated_at', { ascending: false })
    .limit(fetchLimit)

  if (error) {
    console.warn('[clients] remote search failed', error.message)
    // Fall back to whatever is cached locally
    const lower = q.toLowerCase()
    const phoneQ = q.replace(/\s/g, '')
    return getClients()
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(lower) ||
          c.email.toLowerCase().includes(lower) ||
          c.phone.replace(/\s/g, '').includes(phoneQ),
      )
      .slice(0, limit)
  }

  const rows = (data as RemoteClientRow[] | null) ?? []
  let mapped = rows.map(mapRemoteClient)

  if (branchId) {
    const clinicHits = mapped.filter((c) => c.preferredBranchId === branchId)
    const unassigned = mapped.filter((c) => !c.preferredBranchId)
    // Prefer this clinic; keep a few unassigned as fallback; drop other clinics
    mapped = [...clinicHits, ...unassigned].slice(0, limit)
  }

  // Keep hits in local cache so Place Order / profile can resolve them
  for (const client of mapped) {
    try {
      saveClient(client)
    } catch {
      /* ignore quota */
    }
  }

  return mapped
}

/** Refresh one client profile from Supabase (used on profile details page). */
export async function hydrateClientFromSupabase(clientId: string): Promise<Client | undefined> {
  if (!isSupabaseConfigured || !supabase || !clientId) {
    return getClientById(clientId)
  }

  const { data, error } = await supabase
    .from('clients')
    .select(
      `
      id, code, full_name, email, phone, date_of_birth, gender, address,
      occupation, middle_name, preferred_branch_id, status, is_vip, avatar_url,
      registered_at, total_visits, total_spent, reward_points,
      emergency_contact_name, emergency_contact_phone, medical_concerns,
      current_medications, admin_notes, membership_label
    `,
    )
    .eq('id', clientId)
    .maybeSingle()

  if (error || !data) {
    // Fallback: try name match from local then remote search
    const local = getClientById(clientId)
    if (!local?.fullName) return local
    const { data: byName } = await supabase
      .from('clients')
      .select(
        `
        id, code, full_name, email, phone, date_of_birth, gender, address,
        occupation, middle_name, preferred_branch_id, status, is_vip, avatar_url,
        registered_at, total_visits, total_spent, reward_points,
        emergency_contact_name, emergency_contact_phone, medical_concerns,
        current_medications, admin_notes, membership_label
      `,
      )
      .ilike('full_name', local.fullName)
      .limit(5)
    const match = (byName as RemoteClientRow[] | null)?.find(
      (r) => normalizeClientName(r.full_name) === normalizeClientName(local.fullName),
    )
    if (!match) return local
    const remote = mapRemoteClient(match)
    const merged = mergeClientRecords(local, remote)
    saveClient(merged)
    return mergeProfileOntoClient(merged)
  }

  const remote = mapRemoteClient(data as RemoteClientRow)
  const local = getClientById(clientId) || getClients().find(
    (c) => normalizeClientName(c.fullName) === normalizeClientName(remote.fullName),
  )
  const merged = mergeClientRecords(local || remote, remote)
  saveClient(merged)
  return mergeProfileOntoClient(merged)
}

export async function persistClientToSupabase(client: Client): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  // Only sync UUID clients (local cl-* ids are not in public.clients)
  if (!/^[0-9a-f-]{36}$/i.test(client.id)) return

  // data: URLs are camera photos — never write them into Postgres text (quota + payload)
  const avatarUrl =
    client.avatarUrl && !client.avatarUrl.startsWith('data:') ? client.avatarUrl : null

  const { error } = await supabase.from('clients').upsert({
    id: client.id,
    code: client.code,
    full_name: client.fullName,
    email: client.email || null,
    phone: client.phone || null,
    date_of_birth: client.dateOfBirth || null,
    gender: client.gender || null,
    address: client.address || null,
    occupation: client.occupation || null,
    middle_name: client.middleName || null,
    preferred_branch_id: client.preferredBranchId || null,
    status: client.status,
    is_vip: client.isVip,
    avatar_url: avatarUrl,
    total_visits: client.totalVisits ?? 0,
    total_spent: client.totalSpent ?? 0,
    reward_points: client.rewardPoints ?? 0,
    emergency_contact_name: client.emergencyContactName || null,
    emergency_contact_phone: client.emergencyContactPhone || null,
    medical_concerns: client.medicalConcerns || null,
    current_medications: client.currentMedications || null,
    admin_notes: client.adminNotes || null,
    updated_at: new Date().toISOString(),
  })
  if (error && !/does not exist|schema cache|column/i.test(error.message)) {
    throw new Error(error.message || 'Could not save client profile')
  }
}

export function subscribeClients(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}
