import type { Client } from '@/types'

const STORAGE_KEY = 'imajica_clients'
const CHANGE_EVENT = 'imajica:clients-changed'

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

/** Newest service avail / purchase first (never alphabetical). */
export function compareClientsByRecentAvail(a: Client, b: Client): number {
  const ta = a.lastPurchaseAt || a.registeredAt || ''
  const tb = b.lastPurchaseAt || b.registeredAt || ''
  if (ta !== tb) return tb.localeCompare(ta)
  const sa = a.lastSaleId || ''
  const sb = b.lastSaleId || ''
  if (sa !== sb) return sb.localeCompare(sa)
  return (b.code || '').localeCompare(a.code || '')
}

/** Locally registered customers only (no demo merge) */
export function getClients(): Client[] {
  return [...readExtra()].sort(compareClientsByRecentAvail)
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

export function registerClient(input: NewClientInput): Client {
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
    registeredAt: new Date().toISOString().slice(0, 10),
    totalVisits: 0,
    totalSpent: 0,
    emergencyContactName: input.emergencyContactName?.trim() || undefined,
    emergencyContactPhone: input.emergencyContactPhone?.trim() || undefined,
    medicalConcerns: input.medicalConcerns?.trim() || undefined,
    currentMedications: input.currentMedications?.trim() || undefined,
    adminNotes: input.adminNotes?.trim() || undefined,
  }
  return saveClient(client)
}

/** Merge sales-import clients; preserve manually filled contact fields on existing rows */
export function upsertClientsFromSalesImport(imported: Client[]): void {
  const existing = readExtra()
  const byId = new Map(existing.map((c) => [c.id, c]))
  for (const row of imported) {
    const prev = byId.get(row.id)
    if (!prev) {
      byId.set(row.id, row)
      continue
    }
    byId.set(row.id, {
      ...row,
      fullName: prev.fullName?.trim() || row.fullName,
      email: prev.email?.trim() || row.email,
      phone: prev.phone?.trim() || row.phone,
      dateOfBirth: prev.dateOfBirth?.trim() || row.dateOfBirth,
      gender:
        prev.gender === 'female' || prev.gender === 'male' ? prev.gender : row.gender,
      address: prev.address?.trim() || row.address,
      preferredBranchId: prev.preferredBranchId || row.preferredBranchId,
      preferredBranchName: prev.preferredBranchName || row.preferredBranchName,
      adminNotes: prev.adminNotes ?? row.adminNotes,
      avatarUrl: prev.avatarUrl ?? row.avatarUrl,
      emergencyContactName: prev.emergencyContactName ?? row.emergencyContactName,
      emergencyContactPhone: prev.emergencyContactPhone ?? row.emergencyContactPhone,
      medicalConcerns: prev.medicalConcerns ?? row.medicalConcerns,
      currentMedications: prev.currentMedications ?? row.currentMedications,
    })
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...byId.values()]))
  emitChange()
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
