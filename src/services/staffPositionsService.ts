import type { StaffPosition } from '@/types'

const KEY = 'imajica_staff_positions'
const CHANGE = 'imajica:staff-positions-changed'

const SEED: StaffPosition[] = []

type Stored = StaffPosition & { deleted?: boolean }

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

export function getPositions(): StaffPosition[] {
  const byId = new Map<string, StaffPosition>()
  for (const p of SEED) byId.set(p.id, p)
  for (const p of readStored()) {
    if (p.deleted) byId.delete(p.id)
    else byId.set(p.id, { ...p, department: p.department || 'Operation Departments' })
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function subscribePositions(listener: () => void) {
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

export function createPosition(input: Omit<StaffPosition, 'id'>): StaffPosition {
  const row: StaffPosition = {
    id: `pos-${crypto.randomUUID().slice(0, 8)}`,
    ...input,
  }
  writeStored([...readStored().filter((p) => p.id !== row.id), row])
  return row
}

export function savePosition(row: StaffPosition) {
  writeStored([...readStored().filter((p) => p.id !== row.id), row])
}

export function deletePosition(id: string) {
  const isSeed = SEED.some((p) => p.id === id)
  const rest = readStored().filter((p) => p.id !== id)
  if (isSeed) {
    writeStored([
      ...rest,
      {
        id,
        name: '',
        code: '',
        department: '',
        defaultCommissionRate: 0,
        status: 'inactive',
        deleted: true,
      },
    ])
  } else writeStored(rest)
}

export const DEPARTMENTS = [
  'Operation Departments',
  'Clinical Departments',
  'Admin Departments',
  'Marketing Departments',
] as const
