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

/** Active clinics only — company-owned + franchise (excludes warehouse / HQ sentinel). */
export function getClinicBranches(): Branch[] {
  return getBranches().filter(
    (b) =>
      b.status === 'active' &&
      b.branchType !== 'warehouse' &&
      b.code !== 'HQ' &&
      b.id !== '00000000-0000-0000-0000-000000000001',
  )
}

/** Short labels used in UI tags / imports → clinic UUID (franchise included). */
const CLINIC_ALIASES: Record<string, string> = {
  'san mateo': '22222222-2222-2222-2222-222222222201',
  'san mateo rizal': '22222222-2222-2222-2222-222222222201',
  br01: '22222222-2222-2222-2222-222222222201',
  cainta: '22222222-2222-2222-2222-222222222202',
  'cainta rizal': '22222222-2222-2222-2222-222222222202',
  br02: '22222222-2222-2222-2222-222222222202',
  pasig: '22222222-2222-2222-2222-222222222203',
  'pasig city': '22222222-2222-2222-2222-222222222203',
  br03: '22222222-2222-2222-2222-222222222203',
  lipa: '22222222-2222-2222-2222-222222222204',
  'lipa batangas': '22222222-2222-2222-2222-222222222204',
  br04: '22222222-2222-2222-2222-222222222204',
  dasma: '22222222-2222-2222-2222-222222222205',
  dasmarinas: '22222222-2222-2222-2222-222222222205',
  'dasmariñas': '22222222-2222-2222-2222-222222222205',
  'dasmariñas cavite': '22222222-2222-2222-2222-222222222205',
  'dasmarinas cavite': '22222222-2222-2222-2222-222222222205',
  fr01: '22222222-2222-2222-2222-222222222205',
  bacoor: '22222222-2222-2222-2222-222222222206',
  'bacoor cavite': '22222222-2222-2222-2222-222222222206',
  fr02: '22222222-2222-2222-2222-222222222206',
}

/** Resolve a clinic branch UUID for Supabase writes (id, code, alias, or name). */
export function resolveClinicBranchId(
  branchIdOrName: string | null | undefined,
): string | null {
  if (!branchIdOrName) return null
  const raw = branchIdOrName.trim()
  if (!raw) return null
  const branches = getClinicBranches()
  const byId = branches.find((b) => b.id === raw)
  if (byId) return byId.id
  const byCode = branches.find((b) => b.code.toLowerCase() === raw.toLowerCase())
  if (byCode) return byCode.id
  const needle = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const alias = CLINIC_ALIASES[needle]
  if (alias) return alias
  const byName = branches.find((b) => {
    const name = b.name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/,/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const first = name.split(' ')[0]!
    return (
      name === needle ||
      name.includes(needle) ||
      needle.includes(name) ||
      (first.length >= 4 && (needle.includes(first) || first.includes(needle)))
    )
  })
  return byName?.id ?? null
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
