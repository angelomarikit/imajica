import { demoStaff } from '@/constants/demoData'
import { BRANCH_IDS } from '@/constants/teamAccountsSeed'
import { getBranches } from '@/services/branchService'
import { getAccessUsers } from '@/services/userAccessService'
import type { AccessUser, Staff, UserRole } from '@/types'
import { TIMECLOCK_ROLES } from '@/utils/franchiseAccess'
import { formatRoleLabel } from '@/utils/roleLabels'

/** Map old demo branch ids → current clinic UUIDs */
const LEGACY_BRANCH_IDS: Record<string, string> = {
  'br-pasig': BRANCH_IDS.pasig,
  'br-san-mateo': BRANCH_IDS.sanMateo,
  'br-cainta': BRANCH_IDS.cainta,
  'br-dasma': BRANCH_IDS.dasma,
  'br-bacoor': BRANCH_IDS.bacoor,
  'br-makati': BRANCH_IDS.pasig,
}

function normalizeBranchLabel(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\bcity\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** True when a staff/account belongs to the given clinic branch. */
export function matchesStaffBranch(
  row: { branchId?: string | null; branchName?: string | null },
  branchId: string,
): boolean {
  if (!branchId) return false
  if (row.branchId === branchId) return true
  if (row.branchId && LEGACY_BRANCH_IDS[row.branchId] === branchId) return true

  const branch = getBranches().find((b) => b.id === branchId)
  if (!branch) return false
  const a = normalizeBranchLabel(row.branchName)
  const b = normalizeBranchLabel(branch.name)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

function accessUserToStaff(u: AccessUser): Staff {
  return {
    id: u.id,
    code: u.employeeCode ? `EMP-${u.employeeCode}` : u.id.slice(0, 8).toUpperCase(),
    fullName: u.fullName,
    email: u.email,
    phone: '',
    role: (u.role as Staff['role']) || 'STAFF',
    title: formatRoleLabel(u.role),
    department: 'Operation Departments',
    branchId: u.branchId ?? '',
    branchName: u.branchName ?? '',
    status: u.status,
    specializations: [],
    hireDate: new Date().toISOString().slice(0, 10),
    employmentType: 'Full-time',
    rating: 0,
    reviewCount: 0,
    baseSalary: 0,
  }
}

function mergeStaffById(rows: Staff[]): Staff[] {
  const byEmail = new Map<string, Staff>()
  for (const row of rows) {
    const key = row.email.trim().toLowerCase() || row.id
    if (!byEmail.has(key)) byEmail.set(key, row)
  }
  return [...byEmail.values()].sort((a, b) => a.fullName.localeCompare(b.fullName))
}

/** Shared staff directory rows (Staff page + booking checkout pickers). */
const DIRECTORY_EXTRA: Staff[] = [
  {
    id: 'st-franchise-ae-01',
    code: 'MJ-AE-FR01',
    fullName: 'Angela Reyes',
    email: 'angela.reyes@imajica.ph',
    phone: '09171234001',
    role: 'AESTHETICIAN',
    title: 'Aesthetician',
    department: 'Operation Departments',
    branchId: BRANCH_IDS.dasma,
    branchName: 'Dasmariñas, Cavite',
    status: 'active',
    specializations: ['Facials'],
    hireDate: '2024-03-01',
    employmentType: 'Full-time',
    rating: 4.9,
    reviewCount: 22,
    baseSalary: 35000,
    birthDate: '1995-10-02',
  },
  {
    id: 'st-franchise-rec-01',
    code: 'MJ-RC-FR01',
    fullName: 'Carla Mendoza',
    email: 'carla.mendoza@imajica.ph',
    phone: '09181234002',
    role: 'RECEPTIONIST',
    title: 'Receptionist',
    department: 'Operation Departments',
    branchId: BRANCH_IDS.dasma,
    branchName: 'Dasmariñas, Cavite',
    status: 'active',
    specializations: ['Front Desk'],
    hireDate: '2024-05-15',
    employmentType: 'Full-time',
    rating: 4.7,
    reviewCount: 12,
    baseSalary: 28000,
    birthDate: '1998-10-05',
  },
  {
    id: 'st-rosalie',
    code: 'MJ-AE-010',
    fullName: 'Rosalie Manalo',
    email: 'jangmi2575@gmail.com',
    phone: '09064770983',
    role: 'AESTHETICIAN',
    title: 'Aesthetician',
    department: 'Operation Departments',
    branchId: BRANCH_IDS.pasig,
    branchName: 'Pasig City',
    status: 'active',
    specializations: ['Facials'],
    hireDate: '2024-02-01',
    employmentType: 'Full-time',
    rating: 4.9,
    reviewCount: 50,
    baseSalary: 35000,
    birthDate: '1992-09-30',
  },
  {
    id: 'st-veronica',
    code: 'MJ-AE-011',
    fullName: 'Veronica Mayo',
    email: 'veronica.mayo@imajica.com',
    phone: '09171234567',
    role: 'AESTHETICIAN',
    title: 'Aesthetician',
    department: 'Operation Departments',
    branchId: BRANCH_IDS.cainta,
    branchName: 'Cainta, Rizal',
    status: 'active',
    specializations: ['Facials'],
    hireDate: '2024-04-12',
    employmentType: 'Full-time',
    rating: 4.8,
    reviewCount: 40,
    baseSalary: 34000,
  },
  {
    id: 'st-sonayah',
    code: 'MJ-BM-012',
    fullName: 'Sonayah Arsila',
    email: 'sonayah.arsila@imajica.com',
    phone: '09181234567',
    role: 'STAFF',
    title: 'Staff',
    department: 'Operation Departments',
    branchId: BRANCH_IDS.sanMateo,
    branchName: 'San Mateo, Rizal',
    status: 'active',
    specializations: ['Operations'],
    hireDate: '2023-08-01',
    employmentType: 'Full-time',
    rating: 5,
    reviewCount: 20,
    baseSalary: 55000,
  },
  {
    id: 'st-rasmiya',
    code: 'MJ-AE-013',
    fullName: 'Rasmiya Monteclaro',
    email: 'rasmiya.m@imajica.ph',
    phone: '09191234567',
    role: 'AESTHETICIAN',
    title: 'Aesthetician',
    department: 'Operation Departments',
    branchId: BRANCH_IDS.bacoor,
    branchName: 'Bacoor, Cavite',
    status: 'inactive',
    specializations: ['Facials'],
    hireDate: '2023-01-10',
    employmentType: 'Full-time',
    rating: 4.5,
    reviewCount: 18,
    baseSalary: 32000,
  },
  {
    id: 'st-dr-lim',
    code: 'MJ-DR-001',
    fullName: 'Dr. Patricia Lim',
    email: 'patricia.lim@imajica.ph',
    phone: '09171112233',
    role: 'DOCTOR',
    title: 'Aesthetic Physician',
    department: 'Medical Departments',
    branchId: BRANCH_IDS.pasig,
    branchName: 'Pasig City',
    status: 'active',
    specializations: ['Injectables', 'Dermatology'],
    hireDate: '2022-06-01',
    employmentType: 'Full-time',
    rating: 5,
    reviewCount: 80,
    baseSalary: 90000,
  },
  {
    id: 'st-dr-santos',
    code: 'MJ-DR-002',
    fullName: 'Dr. Miguel Santos',
    email: 'miguel.santos@imajica.ph',
    phone: '09182223344',
    role: 'DOCTOR',
    title: 'Aesthetic Physician',
    department: 'Medical Departments',
    branchId: BRANCH_IDS.cainta,
    branchName: 'Cainta, Rizal',
    status: 'active',
    specializations: ['Laser', 'Skin'],
    hireDate: '2023-02-15',
    employmentType: 'Full-time',
    rating: 4.9,
    reviewCount: 55,
    baseSalary: 88000,
  },
]

export function getDirectoryStaff(): Staff[] {
  const extras = DIRECTORY_EXTRA
  const demo = demoStaff.map((s) => ({
    ...s,
    department: s.department ?? 'Operation Departments',
    title: s.title || s.role,
    branchName: s.branchName.includes('City')
      ? s.branchName
      : `${s.branchName} City`.replace(' City City', ' City'),
  }))
  const ids = new Set(extras.map((e) => e.id))
  return [...extras, ...demo.filter((d) => !ids.has(d.id))]
}

/**
 * Active non-doctor staff for booking checkout.
 * When branchId is set, only accounts tagged to that clinic (Branches Accounts / kiosk).
 */
export function getActiveStaffForBooking(branchId?: string): Staff[] {
  if (!branchId) {
    return mergeStaffById(
      getDirectoryStaff().filter((s) => s.status === 'active' && s.role !== 'DOCTOR'),
    )
  }

  const bookingRoles = new Set<string>([
    ...TIMECLOCK_ROLES.filter((r) => r !== 'DOCTOR'),
    'BRANCH_ADMIN',
  ])

  return mergeStaffById(
    getAccessUsers()
      .filter(
        (u) =>
          u.status === 'active' &&
          Boolean(u.branchId) &&
          matchesStaffBranch(u, branchId) &&
          bookingRoles.has(u.role as UserRole),
      )
      .map(accessUserToStaff),
  )
}

/** Active doctors for booking checkout, scoped to a branch when provided. */
export function getActiveDoctorsForBooking(branchId?: string): Staff[] {
  if (!branchId) {
    return mergeStaffById(
      getDirectoryStaff().filter((s) => s.status === 'active' && s.role === 'DOCTOR'),
    )
  }

  return mergeStaffById(
    getAccessUsers()
      .filter(
        (u) =>
          u.status === 'active' &&
          u.role === 'DOCTOR' &&
          Boolean(u.branchId) &&
          matchesStaffBranch(u, branchId),
      )
      .map(accessUserToStaff),
  )
}
