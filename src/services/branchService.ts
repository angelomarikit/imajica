import type { Branch } from '@/types'

const KEY = 'imajica_branches'
const CHANGE = 'imajica:branches-changed'

/** Real Imajica branch directory (matches Branch Directory list) */
const DIRECTORY_SEED: Branch[] = [
  {
    id: '22222222-2222-2222-2222-222222222201',
    code: 'BR01',
    name: 'San Mateo, Rizal',
    branchType: 'company_owned',
    address: '2F RSJ Building, 67 Gen. Luna St., Ampid 1, San Mateo, Rizal',
    phone: '',
    email: '',
    status: 'active',
    isMain: true,
    treatmentRooms: 0,
    consultationRooms: 0,
    waitingAreas: 0,
    parkingAvailable: false,
    staffCount: 0,
  },
  {
    id: '22222222-2222-2222-2222-222222222202',
    code: 'BR02',
    name: 'Cainta, Rizal',
    branchType: 'company_owned',
    address: 'Unit 2-4 Clean Fuel Felix Station, Felix Ave, San Isidro, Cainta, Rizal',
    phone: '',
    email: '',
    status: 'active',
    isMain: false,
    treatmentRooms: 0,
    consultationRooms: 0,
    waitingAreas: 0,
    parkingAvailable: false,
    staffCount: 0,
  },
  {
    id: '22222222-2222-2222-2222-222222222203',
    code: 'BR03',
    name: 'Pasig City',
    branchType: 'company_owned',
    address: 'F Origin Bldg 9544 C Raymundo Ave., Brgy. Caniogan, Pasig City',
    phone: '',
    email: '',
    status: 'active',
    isMain: false,
    treatmentRooms: 0,
    consultationRooms: 0,
    waitingAreas: 0,
    parkingAvailable: false,
    staffCount: 0,
  },
  {
    id: '22222222-2222-2222-2222-222222222204',
    code: 'BR04',
    name: 'Lipa, Batangas',
    branchType: 'company_owned',
    address: 'Lipa, Batangas',
    phone: '',
    email: '',
    status: 'active',
    isMain: false,
    treatmentRooms: 0,
    consultationRooms: 0,
    waitingAreas: 0,
    parkingAvailable: false,
    staffCount: 0,
  },
  {
    id: '22222222-2222-2222-2222-222222222205',
    code: 'FR01',
    name: 'Dasmariñas, Cavite',
    branchType: 'franchise',
    address: 'Dasmariñas, Cavite',
    phone: '',
    email: '',
    status: 'active',
    isMain: false,
    treatmentRooms: 0,
    consultationRooms: 0,
    waitingAreas: 0,
    parkingAvailable: false,
    staffCount: 0,
  },
  {
    id: '22222222-2222-2222-2222-222222222206',
    code: 'FR02',
    name: 'Bacoor, Cavite',
    branchType: 'franchise',
    address: 'Bacoor, Cavite',
    phone: '',
    email: '',
    status: 'active',
    isMain: false,
    treatmentRooms: 0,
    consultationRooms: 0,
    waitingAreas: 0,
    parkingAvailable: false,
    staffCount: 0,
  },
  {
    id: '22222222-2222-2222-2222-222222222207',
    code: 'WAREHOUSE',
    name: 'Warehouse',
    branchType: 'warehouse',
    address: 'Main Warehouse',
    phone: '',
    email: '',
    status: 'active',
    isMain: false,
    treatmentRooms: 0,
    consultationRooms: 0,
    waitingAreas: 0,
    parkingAvailable: false,
    staffCount: 0,
  },
]

type Stored = Branch & { deleted?: boolean }

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

export function getBranches(): Branch[] {
  const byId = new Map<string, Branch>()
  for (const b of DIRECTORY_SEED) byId.set(b.id, b)
  for (const b of readStored()) {
    if (b.deleted) byId.delete(b.id)
    else byId.set(b.id, b)
  }
  return [...byId.values()].sort((a, b) => a.code.localeCompare(b.code))
}

export function subscribeBranches(listener: () => void) {
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

export function createBranch(input: Omit<Branch, 'id'>): Branch {
  const row: Branch = {
    id: `br-${crypto.randomUUID().slice(0, 8)}`,
    ...input,
  }
  writeStored([...readStored().filter((b) => b.id !== row.id), row])
  return row
}

export function saveBranch(row: Branch) {
  writeStored([...readStored().filter((b) => b.id !== row.id), row])
}

export function setBranchActive(id: string, active: boolean) {
  const found = getBranches().find((b) => b.id === id)
  if (!found) return
  saveBranch({ ...found, status: active ? 'active' : 'inactive' })
}

export const BRANCH_TYPES = [
  { value: 'company_owned', label: 'Company-owned' },
  { value: 'franchise', label: 'Franchise' },
  { value: 'warehouse', label: 'Warehouse' },
] as const
