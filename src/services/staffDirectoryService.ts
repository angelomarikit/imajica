import { BRANCH_IDS } from '@/constants/teamAccountsSeed'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { getBranches } from '@/services/branchService'
import { getAccessUsers, listAccessUsers, preloadAccessUsers } from '@/services/userAccessService'
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

const HR_DETAILS_KEY = 'imajica_employee_hr_details'
const HR_CHANGE = 'imajica:employee-hr-changed'

export type EmployeeHrDetails = {
  profileId: string
  staffRowId?: string
  firstName?: string
  middleName?: string
  lastName?: string
  phone?: string
  birthDate?: string
  address?: string
  emergencyContactName?: string
  emergencyContactRelation?: string
  emergencyContactPhone?: string
  department?: string
  title?: string
  hireDate?: string
  employmentType?: string
  baseSalary?: number
  avatarUrl?: string
  code?: string
}

type StaffDbRow = {
  id: string
  profile_id: string | null
  code: string
  full_name: string
  first_name: string | null
  middle_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role_id: string
  title: string | null
  department: string | null
  status: string
  hire_date: string | null
  employment_type: string | null
  base_salary: number | null
  birth_date: string | null
  address: string | null
  avatar_url: string | null
  emergency_contact_name: string | null
  emergency_contact_relation: string | null
  emergency_contact_phone: string | null
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

function splitFullName(fullName: string): { firstName: string; middleName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', middleName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' }
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  }
}

function isDirectoryEmployee(u: AccessUser): boolean {
  const name = u.fullName.trim().toUpperCase()
  if (!name || name === 'INACTIVE') return false
  return true
}

function readLocalHr(): Record<string, EmployeeHrDetails> {
  try {
    const raw = localStorage.getItem(HR_DETAILS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, EmployeeHrDetails>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeLocalHr(map: Record<string, EmployeeHrDetails>) {
  localStorage.setItem(HR_DETAILS_KEY, JSON.stringify(map))
  window.dispatchEvent(new Event(HR_CHANGE))
}

export function subscribeEmployeeHr(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === HR_DETAILS_KEY) listener()
  }
  window.addEventListener(HR_CHANGE, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(HR_CHANGE, listener)
    window.removeEventListener('storage', onStorage)
  }
}

function hrFromDbRow(row: StaffDbRow): EmployeeHrDetails {
  return {
    profileId: row.profile_id ?? row.id,
    staffRowId: row.id,
    firstName: row.first_name ?? undefined,
    middleName: row.middle_name ?? undefined,
    lastName: row.last_name ?? undefined,
    phone: row.phone ?? undefined,
    birthDate: row.birth_date ?? undefined,
    address: row.address ?? undefined,
    emergencyContactName: row.emergency_contact_name ?? undefined,
    emergencyContactRelation: row.emergency_contact_relation ?? undefined,
    emergencyContactPhone: row.emergency_contact_phone ?? undefined,
    department: row.department ?? undefined,
    title: row.title ?? undefined,
    hireDate: row.hire_date ?? undefined,
    employmentType: row.employment_type ?? undefined,
    baseSalary: row.base_salary ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    code: row.code,
  }
}

async function loadRemoteHrByProfile(): Promise<Map<string, EmployeeHrDetails>> {
  const map = new Map<string, EmployeeHrDetails>()
  if (!isSupabaseConfigured || !supabase) return map
  const { data, error } = await supabase
    .from('staff')
    .select(
      'id, profile_id, code, full_name, first_name, middle_name, last_name, email, phone, role_id, title, department, status, hire_date, employment_type, base_salary, birth_date, address, avatar_url, emergency_contact_name, emergency_contact_relation, emergency_contact_phone',
    )
  if (error || !data) return map
  for (const row of data as StaffDbRow[]) {
    const key = row.profile_id || row.id
    map.set(key, hrFromDbRow(row))
    if (row.email) map.set(`email:${row.email.trim().toLowerCase()}`, hrFromDbRow(row))
  }
  return map
}

function applyHr(staff: Staff, hr?: EmployeeHrDetails | null): Staff {
  if (!hr) return staff
  const firstName = hr.firstName ?? staff.firstName
  const middleName = hr.middleName ?? staff.middleName
  const lastName = hr.lastName ?? staff.lastName
  const composed = [firstName, middleName, lastName].filter(Boolean).join(' ')
  return {
    ...staff,
    firstName,
    middleName,
    lastName,
    fullName: composed || staff.fullName,
    phone: hr.phone ?? staff.phone,
    birthDate: hr.birthDate ?? staff.birthDate,
    address: hr.address ?? staff.address,
    emergencyContactName: hr.emergencyContactName ?? staff.emergencyContactName,
    emergencyContactRelation: hr.emergencyContactRelation ?? staff.emergencyContactRelation,
    emergencyContactPhone: hr.emergencyContactPhone ?? staff.emergencyContactPhone,
    department: hr.department ?? staff.department,
    title: hr.title ?? staff.title,
    hireDate: hr.hireDate ?? staff.hireDate,
    employmentType: hr.employmentType ?? staff.employmentType,
    baseSalary: hr.baseSalary ?? staff.baseSalary,
    avatarUrl: hr.avatarUrl ?? staff.avatarUrl,
    code: hr.code ?? staff.code,
  }
}

export function accessUserToStaff(u: AccessUser): Staff {
  const names = splitFullName(u.fullName)
  return {
    id: u.id,
    profileId: u.id,
    code: u.employeeCode ? `EMP-${u.employeeCode}` : `EMP-${u.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    employeeCode: u.employeeCode ?? null,
    fullName: u.fullName,
    firstName: names.firstName,
    middleName: names.middleName,
    lastName: names.lastName,
    email: u.email,
    phone: '',
    role: (u.role as Staff['role']) || 'STAFF',
    title: formatRoleLabel(u.role),
    department: 'Operation Departments',
    branchId: u.branchId ?? '',
    branchName: u.branchName ?? 'All Branches (organization)',
    status: u.status === 'inactive' ? 'inactive' : 'active',
    specializations: [],
    hireDate: '',
    employmentType: 'Full-time',
    rating: 0,
    reviewCount: 0,
    baseSalary: 0,
  }
}

function mergeStaffById(rows: Staff[]): Staff[] {
  const byKey = new Map<string, Staff>()
  for (const row of rows) {
    const key = row.email.trim().toLowerCase() || row.id
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, row)
      continue
    }
    // Prefer the row that has richer HR / employee code data
    const prefer =
      (row.employeeCode ? 2 : 0) +
      (row.phone ? 1 : 0) +
      (row.address ? 1 : 0) +
      (row.emergencyContactName ? 1 : 0)
    const current =
      (existing.employeeCode ? 2 : 0) +
      (existing.phone ? 1 : 0) +
      (existing.address ? 1 : 0) +
      (existing.emergencyContactName ? 1 : 0)
    byKey.set(key, prefer >= current ? { ...existing, ...row, id: prefer >= current ? row.id : existing.id } : existing)
  }
  return [...byKey.values()].sort((a, b) => a.fullName.localeCompare(b.fullName))
}

function resolveHr(
  u: AccessUser,
  remote: Map<string, EmployeeHrDetails>,
  local: Record<string, EmployeeHrDetails>,
): EmployeeHrDetails | undefined {
  return (
    local[u.id] ??
    remote.get(u.id) ??
    (u.email ? remote.get(`email:${u.email.trim().toLowerCase()}`) : undefined) ??
    undefined
  )
}

/** Sync directory (booking / payroll helpers). Uses local access users + local HR overlays. */
export function getDirectoryStaff(): Staff[] {
  const local = readLocalHr()
  return mergeStaffById(
    getAccessUsers()
      .filter(isDirectoryEmployee)
      .map((u) => applyHr(accessUserToStaff(u), local[u.id])),
  )
}

/** Async Employee Database — live User Access + HR staff profiles. */
export async function listDirectoryStaff(): Promise<Staff[]> {
  const [users, remote] = await Promise.all([listAccessUsers(), loadRemoteHrByProfile()])
  const local = readLocalHr()
  return mergeStaffById(
    users.filter(isDirectoryEmployee).map((u) => applyHr(accessUserToStaff(u), resolveHr(u, remote, local))),
  )
}

export async function getEmployeeById(id: string): Promise<Staff | null> {
  const rows = await listDirectoryStaff()
  return rows.find((s) => s.id === id || s.profileId === id) ?? null
}

export async function saveEmployeeHrDetails(
  staff: Staff,
  patch: Omit<EmployeeHrDetails, 'profileId'>,
): Promise<Staff> {
  const profileId = staff.profileId || staff.id
  const names = splitFullName(staff.fullName)
  const next: EmployeeHrDetails = {
    profileId,
    staffRowId: patch.staffRowId,
    firstName: patch.firstName ?? staff.firstName ?? names.firstName,
    middleName: patch.middleName ?? staff.middleName ?? names.middleName,
    lastName: patch.lastName ?? staff.lastName ?? names.lastName,
    phone: patch.phone ?? staff.phone,
    birthDate: patch.birthDate ?? staff.birthDate,
    address: patch.address ?? staff.address,
    emergencyContactName: patch.emergencyContactName ?? staff.emergencyContactName,
    emergencyContactRelation: patch.emergencyContactRelation ?? staff.emergencyContactRelation,
    emergencyContactPhone: patch.emergencyContactPhone ?? staff.emergencyContactPhone,
    department: patch.department ?? staff.department,
    title: patch.title ?? staff.title,
    hireDate: patch.hireDate ?? staff.hireDate,
    employmentType: patch.employmentType ?? staff.employmentType,
    baseSalary: patch.baseSalary ?? staff.baseSalary,
    avatarUrl: patch.avatarUrl ?? staff.avatarUrl,
    code: patch.code ?? staff.code,
  }

  const fullName = [next.firstName, next.middleName, next.lastName].filter(Boolean).join(' ') || staff.fullName

  if (isSupabaseConfigured && supabase) {
    const payload = {
      profile_id: profileId,
      code: next.code || staff.code,
      full_name: fullName,
      first_name: next.firstName || null,
      middle_name: next.middleName || null,
      last_name: next.lastName || null,
      email: staff.email || null,
      phone: next.phone || null,
      role_id: staff.role,
      title: next.title || null,
      department: next.department || null,
      status: staff.status === 'inactive' ? 'inactive' : 'active',
      hire_date: next.hireDate || null,
      employment_type: next.employmentType || null,
      base_salary: next.baseSalary ?? 0,
      birth_date: next.birthDate || null,
      address: next.address || null,
      avatar_url: next.avatarUrl || null,
      emergency_contact_name: next.emergencyContactName || null,
      emergency_contact_relation: next.emergencyContactRelation || null,
      emergency_contact_phone: next.emergencyContactPhone || null,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('staff')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle()

    let staffRowId = (existing as { id?: string } | null)?.id
    if (staffRowId) {
      const { error } = await supabase.from('staff').update(payload).eq('id', staffRowId)
      if (error) throw new Error(error.message)
    } else {
      const { data, error } = await supabase.from('staff').insert(payload).select('id').single()
      if (error) throw new Error(error.message)
      staffRowId = (data as { id: string }).id
    }
    next.staffRowId = staffRowId

    if (staff.branchId) {
      await supabase.from('staff_branches').upsert(
        { staff_id: staffRowId, branch_id: staff.branchId, is_primary: true },
        { onConflict: 'staff_id,branch_id' },
      )
    }

    await supabase.from('profiles').update({ phone: next.phone || null, full_name: fullName }).eq('id', profileId)
  }

  const local = readLocalHr()
  local[profileId] = next
  writeLocalHr(local)

  return applyHr({ ...staff, fullName }, next)
}

const BOOKING_STAFF_ROLES = new Set<string>([
  ...TIMECLOCK_ROLES.filter((r) => r !== 'DOCTOR'),
  'BRANCH_ADMIN',
])

function staffForBookingFromUsers(users: AccessUser[], branchId?: string): Staff[] {
  const local = readLocalHr()
  if (!branchId) {
    return mergeStaffById(
      users
        .filter(
          (u) =>
            u.status === 'active' &&
            isDirectoryEmployee(u) &&
            BOOKING_STAFF_ROLES.has(u.role as UserRole),
        )
        .map((u) => applyHr(accessUserToStaff(u), local[u.id])),
    )
  }
  return mergeStaffById(
    users
      .filter(
        (u) =>
          u.status === 'active' &&
          Boolean(u.branchId) &&
          matchesStaffBranch(u, branchId) &&
          BOOKING_STAFF_ROLES.has(u.role as UserRole),
      )
      .map((u) => applyHr(accessUserToStaff(u), local[u.id])),
  )
}

function doctorsForBookingFromUsers(users: AccessUser[], branchId?: string): Staff[] {
  const local = readLocalHr()
  if (!branchId) {
    return mergeStaffById(
      users
        .filter((u) => u.status === 'active' && u.role === 'DOCTOR' && isDirectoryEmployee(u))
        .map((u) => applyHr(accessUserToStaff(u), local[u.id])),
    )
  }
  return mergeStaffById(
    users
      .filter(
        (u) =>
          u.status === 'active' &&
          u.role === 'DOCTOR' &&
          Boolean(u.branchId) &&
          matchesStaffBranch(u, branchId),
      )
      .map((u) => applyHr(accessUserToStaff(u), local[u.id])),
  )
}

/**
 * Active non-doctor staff for booking checkout (sync — local cache only).
 * Prefer listActiveStaffForBooking so newly registered accounts appear.
 */
export function getActiveStaffForBooking(branchId?: string): Staff[] {
  return staffForBookingFromUsers(getAccessUsers(), branchId)
}

/** Live directory — includes staff registered in Supabase (e.g. Pasig). */
export async function listActiveStaffForBooking(branchId?: string): Promise<Staff[]> {
  const users = await preloadAccessUsers()
  return staffForBookingFromUsers(users, branchId)
}

/** Active doctors for booking checkout (sync — local cache only). */
export function getActiveDoctorsForBooking(branchId?: string): Staff[] {
  return doctorsForBookingFromUsers(getAccessUsers(), branchId)
}

/** Live doctors for booking checkout. */
export async function listActiveDoctorsForBooking(branchId?: string): Promise<Staff[]> {
  const users = await preloadAccessUsers()
  return doctorsForBookingFromUsers(users, branchId)
}
