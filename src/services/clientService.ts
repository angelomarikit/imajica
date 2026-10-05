import type { Client } from '@/types'
import {
  CLIENT_PROFILE_SEED,
  findClientProfileSeed,
  normalizeClientName,
} from '@/constants/clientProfileSeed'
import { getBranches } from '@/services/branchService'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const STORAGE_KEY = 'imajica_clients'
const CHANGE_EVENT = 'imajica:clients-changed'
const PROFILE_ENRICH_FLAG = 'imajica_client_profiles_enriched_v1'

function readExtra(): Client[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Client[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
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

function mergeClientRecords(base: Client, incoming: Partial<Client>): Client {
  const gender =
    incoming.gender === 'female' || incoming.gender === 'male'
      ? incoming.gender
      : base.gender === 'female' || base.gender === 'male'
        ? base.gender
        : incoming.gender || base.gender || 'prefer_not_to_say'

  return {
    ...base,
    ...incoming,
    id: incoming.id || base.id,
    code: pickText(base.code, incoming.code) || base.code,
    fullName: pickText(incoming.fullName, base.fullName) || base.fullName,
    email: pickText(base.email, incoming.email),
    phone: pickText(base.phone, incoming.phone),
    dateOfBirth: pickText(base.dateOfBirth, incoming.dateOfBirth),
    gender,
    address: pickText(base.address, incoming.address) || undefined,
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...nextById.values()]))
    localStorage.setItem(PROFILE_ENRICH_FLAG, 'done')
    emitChange()
  } else if (!localStorage.getItem(PROFILE_ENRICH_FLAG)) {
    localStorage.setItem(PROFILE_ENRICH_FLAG, 'done')
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

/** Locally registered customers only (no demo merge) */
export function getClients(): Client[] {
  return [...readExtra()].map(mergeProfileOntoClient).sort(compareClientsByRecentAvail)
}

export function getClientById(id: string): Client | undefined {
  return getClients().find((c) => c.id === id)
}

export function saveClient(client: Client): Client {
  const extra = readExtra()
  const idx = extra.findIndex((c) => c.id === client.id)
  const next =
    idx >= 0 ? extra.map((c, i) => (i === idx ? client : c)) : [client, ...extra]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emitChange()
  return client
}

export function deleteClient(id: string): void {
  const next = readExtra().filter((c) => c.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
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
    preferredBranchId: input.branchId,
    preferredBranchName: input.branchName,
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
    byId.set(row.id, mergeClientRecords(prev, { ...row, id: row.id }))
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...byId.values()]))
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
  const branch = row.preferred_branch_id
    ? getBranches().find((b) => b.id === row.preferred_branch_id)
    : undefined
  const gender =
    row.gender === 'female' || row.gender === 'male' || row.gender === 'prefer_not_to_say'
      ? row.gender
      : 'prefer_not_to_say'
  return {
    id: row.id,
    code: row.code || `MJ-${row.id.slice(0, 8).toUpperCase()}`,
    fullName: row.full_name,
    email: row.email || '',
    phone: row.phone || '',
    dateOfBirth: row.date_of_birth || '',
    gender,
    address: row.address || undefined,
    occupation: row.occupation || undefined,
    middleName: row.middle_name || undefined,
    preferredBranchId: row.preferred_branch_id || '',
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
 */
export async function preloadClientsFromSupabase(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0
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
    .order('updated_at', { ascending: false })
    .limit(5000)

  if (error) {
    if (!/does not exist|schema cache|column/i.test(error.message)) {
      console.error('[clients] preload failed', error.message)
    }
    return 0
  }
  if (!data?.length) return 0

  const existing = readExtra()
  const byId = new Map(existing.map((c) => [c.id, c]))
  let changed = 0

  for (const raw of data as RemoteClientRow[]) {
    const remote = mapRemoteClient(raw)
    const prev = byId.get(remote.id)
    const byName = !prev
      ? [...byId.values()].find(
          (c) => normalizeClientName(c.fullName) === normalizeClientName(remote.fullName),
        )
      : undefined

    if (byName && byName.id !== remote.id) {
      byId.delete(byName.id)
      const merged = mergeClientRecords(byName, remote)
      byId.set(remote.id, merged)
      changed += 1
      continue
    }

    if (!prev) {
      byId.set(remote.id, remote)
      changed += 1
      continue
    }

    const merged = mergeClientRecords(prev, remote)
    const dirty =
      merged.email !== prev.email ||
      merged.phone !== prev.phone ||
      merged.dateOfBirth !== prev.dateOfBirth ||
      merged.gender !== prev.gender ||
      merged.address !== prev.address ||
      merged.preferredBranchId !== prev.preferredBranchId
    byId.set(remote.id, merged)
    if (dirty) changed += 1
  }

  if (changed > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...byId.values()]))
    applyKnownClientProfiles()
    emitChange()
  }
  return changed
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
    avatar_url: client.avatarUrl || null,
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
