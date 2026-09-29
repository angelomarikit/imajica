import type { AccessUser } from '@/types'

const KEY = 'imajica_access_users'
const CHANGE = 'imajica:access-users-changed'

const SEED: AccessUser[] = []

type Stored = AccessUser & { deleted?: boolean }

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

function readStored(): Stored[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Stored[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStored(rows: Stored[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
  emit()
}

export function getAccessUsers(): AccessUser[] {
  const byId = new Map<string, AccessUser>()
  for (const u of SEED) byId.set(u.id, u)
  for (const u of readStored()) {
    if (u.deleted) byId.delete(u.id)
    else byId.set(u.id, u)
  }
  return [...byId.values()].sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export function subscribeAccessUsers(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener()
  }
  window.addEventListener(CHANGE, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE, listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function createAccessUser(
  input: Omit<AccessUser, 'id'> & { id?: string },
): AccessUser {
  const row: AccessUser = {
    id: input.id ?? `usr-${crypto.randomUUID().slice(0, 8)}`,
    fullName: input.fullName,
    email: input.email,
    role: input.role,
    branchId: input.branchId,
    branchName: input.branchName,
    status: input.status,
  }
  writeStored([...readStored().filter((u) => u.id !== row.id), row])
  return row
}

export function saveAccessUser(row: AccessUser) {
  writeStored([...readStored().filter((u) => u.id !== row.id), row])
}

export function setAccessUserActive(id: string, active: boolean) {
  const all = getAccessUsers()
  const found = all.find((u) => u.id === id)
  if (!found) return
  saveAccessUser({ ...found, status: active ? 'active' : 'inactive' })
}
