/**
 * HR-editable payroll master profiles (recurring deductions & benefits).
 * Salary / payslips read the same merged roster via getPayrollRoster().
 */
import {
  PAYROLL_DEFAULT_SHIFT,
  PAYROLL_ROSTER_SEED,
  monthlyBasicSalary,
  philhealthShareFromMbs,
  type PayrollRosterEmployee,
} from '@/constants/payrollRosterSeed'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { listDirectoryStaff } from '@/services/staffDirectoryService'
import { listBranchAccounts } from '@/services/userAccessService'
import type { AccessUser, EmployeeBenefitLine, Staff } from '@/types'
import { isAttendanceRosterRole } from '@/utils/franchiseAccess'
import { formatRoleLabel } from '@/utils/roleLabels'
import { isUuid } from '@/utils/uuid'

function normalizeBenefitLines(raw: unknown): EmployeeBenefitLine[] {
  if (!Array.isArray(raw)) return []
  const out: EmployeeBenefitLine[] = []
  for (const b of raw) {
    if (!b || typeof b !== 'object') continue
    const row = b as Record<string, unknown>
    const name = String(row.name ?? '').trim()
    if (!name) continue
    out.push({
      id: String(row.id ?? `ben-${Math.random().toString(36).slice(2, 10)}`),
      name,
      monthlyCost: Math.max(0, Number(row.monthlyCost) || 0),
      notes: row.notes ? String(row.notes) : undefined,
    })
  }
  return out
}

const KEY = 'imajica_payroll_profiles'
const CHANGE = 'imajica:payroll-profiles-changed'

export type PayrollProfileRecord = PayrollRosterEmployee & {
  /** DB row id when synced */
  dbId?: string
  userId?: string | null
  otherDeduction: number
  allowance: number
  notes?: string
  status: 'active' | 'inactive'
}

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

export function subscribePayrollProfiles(listener: () => void) {
  window.addEventListener(CHANGE, listener)
  return () => window.removeEventListener(CHANGE, listener)
}

function readLocal(): PayrollProfileRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PayrollProfileRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(rows: PayrollProfileRecord[], silent = false) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 2000)))
  if (!silent) emit()
}

function seedAsProfiles(): PayrollProfileRecord[] {
  return PAYROLL_ROSTER_SEED.map((e) => ({
    ...e,
    otherDeduction: 0,
    allowance: 0,
    benefits: e.benefits ?? [],
    status: 'active' as const,
  }))
}

function mapDbRow(row: {
  id: string
  user_id: string | null
  first_name: string
  middle_name: string | null
  last_name: string
  email: string
  branch_id: string | null
  branch_label: string | null
  job_title: string | null
  employment_status: string | null
  shift_label: string
  salary_per_day: number
  tin: string | null
  pagibig_no: string | null
  philhealth_no: string | null
  sss_no: string | null
  sss_employee: number
  mpf_employee: number
  pagibig_employee: number
  philhealth_employee: number
  sss_employer: number
  mpf_employer: number
  ec_employer: number
  pagibig_employer: number
  philhealth_employer: number
  other_deduction?: number
  allowance?: number
  benefits?: unknown
  notes?: string | null
  status: string
}): PayrollProfileRecord {
  const firstName = row.first_name
  const middleName = row.middle_name || ''
  const lastName = row.last_name
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ')
  return {
    id: row.user_id || row.id,
    dbId: row.id,
    userId: row.user_id,
    firstName,
    middleName,
    lastName,
    fullName,
    email: row.email,
    matchEmails: [],
    gender: '',
    birthDate: '',
    civilStatus: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    dateHired: '',
    employmentStatus: row.employment_status || 'Regular',
    jobTitle: row.job_title || 'Staff',
    branchLabel: row.branch_label || '',
    branchId: row.branch_id,
    shiftLabel: row.shift_label || 'TUE - SUN 9:45 AM - 7:00 PM',
    salaryPerDay: Number(row.salary_per_day) || 0,
    tin: row.tin || '',
    pagibigNo: row.pagibig_no || '',
    philhealthNo: row.philhealth_no || '',
    sssNo: row.sss_no || '',
    sssEmployee: Number(row.sss_employee) || 0,
    mpfEmployee: Number(row.mpf_employee) || 0,
    pagibigEmployee: Number(row.pagibig_employee) || 0,
    philhealthEmployee: Number(row.philhealth_employee) || 0,
    sssEmployer: Number(row.sss_employer) || 0,
    mpfEmployer: Number(row.mpf_employer) || 0,
    ecEmployer: Number(row.ec_employer) || 0,
    pagibigEmployer: Number(row.pagibig_employer) || 0,
    philhealthEmployer: Number(row.philhealth_employer) || 0,
    otherDeduction: Number(row.other_deduction) || 0,
    allowance: Number(row.allowance) || 0,
    benefits: normalizeBenefitLines(row.benefits),
    notes: row.notes || undefined,
    status: row.status === 'inactive' ? 'inactive' : 'active',
  }
}

function stubFromDirectory(input: {
  id: string
  fullName: string
  email: string
  branchId?: string | null
  branchName?: string | null
  title: string
}): PayrollProfileRecord {
  const parts = input.fullName.trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] || input.fullName
  const lastName = parts.length > 1 ? parts[parts.length - 1]! : ''
  const middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : ''
  return {
    id: input.id,
    userId: input.id,
    firstName,
    middleName,
    lastName,
    fullName: input.fullName,
    email: input.email || `${input.id}@imajica.local`,
    matchEmails: input.email ? [input.email] : [],
    gender: '',
    birthDate: '',
    civilStatus: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    dateHired: '',
    employmentStatus: 'Regular',
    jobTitle: input.title || 'Staff',
    branchLabel: input.branchName || '',
    branchId: input.branchId || null,
    shiftLabel: 'TUE - SUN 9:45 AM - 7:00 PM',
    salaryPerDay: 0,
    tin: '',
    pagibigNo: '',
    philhealthNo: '',
    sssNo: '',
    sssEmployee: 0,
    mpfEmployee: 0,
    pagibigEmployee: 0,
    philhealthEmployee: 0,
    sssEmployer: 0,
    mpfEmployer: 0,
    ecEmployer: 0,
    pagibigEmployer: 0,
    philhealthEmployer: 0,
    otherDeduction: 0,
    allowance: 0,
    benefits: [],
    status: 'active',
  }
}

function mergeProfiles(base: PayrollProfileRecord[]): PayrollProfileRecord[] {
  const byKey = new Map<string, PayrollProfileRecord>()
  const keyOf = (p: PayrollProfileRecord) =>
    (p.email || '').trim().toLowerCase() || p.userId || p.id

  for (const p of base) byKey.set(keyOf(p), p)

  for (const local of readLocal()) {
    const key = keyOf(local)
    const prev = byKey.get(key)
    byKey.set(key, prev ? { ...prev, ...local, matchEmails: prev.matchEmails } : local)
  }

  return [...byKey.values()].sort((a, b) => a.fullName.localeCompare(b.fullName))
}

/** Sync roster used by salary / attendance payroll. */
export function getMergedPayrollRoster(): PayrollRosterEmployee[] {
  return mergeProfiles(seedAsProfiles()).map((p) => ({
    id: p.id,
    firstName: p.firstName,
    middleName: p.middleName,
    lastName: p.lastName,
    fullName: p.fullName,
    email: p.email,
    matchEmails: p.matchEmails,
    gender: p.gender,
    birthDate: p.birthDate,
    civilStatus: p.civilStatus,
    phone: p.phone,
    address: p.address,
    emergencyContact: p.emergencyContact,
    emergencyRelationship: p.emergencyRelationship,
    emergencyPhone: p.emergencyPhone,
    dateHired: p.dateHired,
    employmentStatus: p.employmentStatus,
    jobTitle: p.jobTitle,
    branchLabel: p.branchLabel,
    branchId: p.branchId,
    shiftLabel: p.shiftLabel,
    salaryPerDay: p.salaryPerDay,
    tin: p.tin,
    pagibigNo: p.pagibigNo,
    philhealthNo: p.philhealthNo,
    sssNo: p.sssNo,
    sssEmployee: p.sssEmployee,
    mpfEmployee: p.mpfEmployee,
    pagibigEmployee: p.pagibigEmployee,
    philhealthEmployee: p.philhealthEmployee,
    sssEmployer: p.sssEmployer,
    mpfEmployer: p.mpfEmployer,
    ecEmployer: p.ecEmployer,
    pagibigEmployer: p.pagibigEmployer,
    philhealthEmployer: p.philhealthEmployer,
    otherDeduction: p.otherDeduction,
    allowance: p.allowance,
    benefits: p.benefits ?? [],
  }))
}

export function getMergedPayrollProfiles(): PayrollProfileRecord[] {
  return mergeProfiles(seedAsProfiles())
}

type SalarySourcePerson = {
  id: string
  fullName: string
  email: string
  role: string
  branchId: string | null
  branchName: string
  title: string
  dailyRate?: number
  benefits?: EmployeeBenefitLine[]
}

function sourceKey(p: { id: string; email?: string | null }) {
  return (p.email || '').trim().toLowerCase() || p.id
}

/**
 * Shared clinic / marketing logins — not real employees on salary.
 * (Also matches display names like "cainta", "lipa", "marketing cainta".)
 */
const SALARY_EXCLUDED_EMAILS = new Set([
  'cainta@imajica.com',
  'lipa@imajica.com',
  'pasig@imajica.com',
  'pasi@imajica.com',
  'sanmateo@imajica.com',
])

const SALARY_EXCLUDED_NAME_KEYS = new Set([
  'cainta',
  'lipa',
  'pasig',
  'pasi',
  'sanmateo',
  'san mateo',
  'marketing cainta',
  'cainta marketing',
])

function isExcludedFromSalaryRoster(person: {
  email?: string | null
  fullName?: string | null
  role?: string | null
}): boolean {
  const role = (person.role || '').trim().toUpperCase()
  if (role === 'BRANCH_MARKETING' || role === 'MARKETING') return true

  const email = (person.email || '').trim().toLowerCase()
  if (email && SALARY_EXCLUDED_EMAILS.has(email)) return true
  // Any *@imajica.com clinic shortcut that is exactly the branch local-part
  const local = email.split('@')[0] || ''
  if (
    email.endsWith('@imajica.com') &&
    (local === 'cainta' ||
      local === 'lipa' ||
      local === 'pasig' ||
      local === 'pasi' ||
      local === 'sanmateo')
  ) {
    return true
  }

  const name = (person.fullName || '')
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
  if (name && SALARY_EXCLUDED_NAME_KEYS.has(name)) return true
  if (name.includes('marketing') && name.includes('cainta')) return true
  return false
}

/**
 * Live salary roster sources: Branches Accounts ∪ Staff list.
 * Only Time In / Time Out roles (clinic staff, Clinic Manager, OM).
 */
function buildCanonicalSalaryPeople(
  branchAccounts: AccessUser[],
  directory: Staff[],
): Map<string, SalarySourcePerson> {
  const canonical = new Map<string, SalarySourcePerson>()

  const upsert = (person: SalarySourcePerson) => {
    if (!isAttendanceRosterRole(person.role)) return
    if (isExcludedFromSalaryRoster(person)) return
    const key = sourceKey(person)
    const prev = canonical.get(key)
    if (!prev) {
      canonical.set(key, person)
      return
    }
    canonical.set(key, {
      ...prev,
      ...person,
      id: person.id || prev.id,
      email: person.email || prev.email,
      fullName: person.fullName || prev.fullName,
      role: person.role || prev.role,
      branchId: person.branchId ?? prev.branchId,
      branchName: person.branchName || prev.branchName,
      title: formatRoleLabel(person.role) || person.title || prev.title,
      dailyRate:
        person.dailyRate != null && person.dailyRate > 0
          ? person.dailyRate
          : prev.dailyRate,
      benefits:
        person.benefits && person.benefits.length > 0 ? person.benefits : prev.benefits,
    })
  }

  for (const u of branchAccounts) {
    if (u.status === 'inactive') continue
    upsert({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      branchId: u.branchId,
      branchName: u.branchName || (u.branchId ? '' : 'All Branches (organization)'),
      title: formatRoleLabel(u.role),
    })
  }

  for (const emp of directory) {
    if (emp.status === 'inactive') continue
    upsert({
      id: emp.profileId || emp.id,
      fullName: emp.fullName,
      email: emp.email,
      role: emp.role,
      branchId: emp.branchId || null,
      branchName: emp.branchName || '',
      title: emp.title || formatRoleLabel(emp.role),
      dailyRate: emp.dailyRate,
      benefits: emp.benefits,
    })
  }

  return canonical
}

function findOverlay(
  overlays: PayrollProfileRecord[],
  person: SalarySourcePerson,
): PayrollProfileRecord | undefined {
  const email = (person.email || '').trim().toLowerCase()
  const name = person.fullName.trim().toLowerCase()
  return (
    overlays.find((p) => p.userId === person.id || p.id === person.id) ||
    (email
      ? overlays.find(
          (p) =>
            p.email.trim().toLowerCase() === email ||
            p.matchEmails.some((m) => m.trim().toLowerCase() === email),
        )
      : undefined) ||
    overlays.find((p) => p.fullName.trim().toLowerCase() === name)
  )
}

/**
 * HR All Salary roster = Branches Accounts ∪ Staff list only (attendance roles).
 * Drops seed/orphan payroll rows not in those directories; refreshes role/title/branch from live accounts.
 */
export async function listPayrollProfilesForHr(): Promise<PayrollProfileRecord[]> {
  let remote: PayrollProfileRecord[] = []
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('payroll_employee_profiles')
      .select('*')
      .order('last_name')
    if (!error && data) {
      remote = (data as Parameters<typeof mapDbRow>[0][]).map(mapDbRow)
    }
  }

  const [directory, branchAccounts] = await Promise.all([
    listDirectoryStaff(),
    listBranchAccounts(),
  ])

  const canonical = buildCanonicalSalaryPeople(branchAccounts, directory)
  const overlays = mergeProfiles([...seedAsProfiles(), ...remote, ...readLocal()])

  const out: PayrollProfileRecord[] = []
  for (const person of canonical.values()) {
    const overlay = findOverlay(overlays, person)
    const roleTitle = formatRoleLabel(person.role)
    const stub = stubFromDirectory({
      id: person.id,
      fullName: person.fullName,
      email: person.email,
      branchId: person.branchId,
      branchName: person.branchName,
      title: roleTitle || person.title || 'Staff',
    })

    if (!overlay) {
      if (person.dailyRate != null && person.dailyRate > 0) stub.salaryPerDay = person.dailyRate
      if (person.benefits?.length) stub.benefits = normalizeBenefitLines(person.benefits)
      out.push(stub)
      continue
    }

    const directoryRate =
      person.dailyRate != null && person.dailyRate > 0 ? person.dailyRate : undefined
    const directoryBenefits =
      person.benefits && person.benefits.length > 0
        ? normalizeBenefitLines(person.benefits)
        : undefined

    out.push({
      ...overlay,
      userId: overlay.userId || person.id,
      id: person.id,
      fullName: person.fullName || overlay.fullName,
      firstName: stub.firstName || overlay.firstName,
      middleName: stub.middleName || overlay.middleName,
      lastName: stub.lastName || overlay.lastName,
      email: person.email || overlay.email,
      branchId: person.branchId ?? overlay.branchId ?? null,
      branchLabel: person.branchName || overlay.branchLabel || '',
      // Role from Branches Accounts / Staff list wins
      jobTitle: roleTitle || person.title || overlay.jobTitle || 'Staff',
      salaryPerDay: directoryRate ?? overlay.salaryPerDay,
      benefits: directoryBenefits ?? overlay.benefits ?? [],
      matchEmails: [
        ...new Set(
          [...overlay.matchEmails, person.email, overlay.email].filter(Boolean) as string[],
        ),
      ],
      status: 'active',
    })
  }

  // Drop local cache entries that are no longer on Branches Accounts / Staff list
  const keepKeys = new Set(out.map((p) => sourceKey(p)))
  const prunedLocal = readLocal().filter((p) => keepKeys.has(sourceKey(p)))
  // Keep rate overlays for current people
  const byKeep = new Map(prunedLocal.map((p) => [sourceKey(p), p]))
  for (const p of out) {
    const key = sourceKey(p)
    const prev = byKeep.get(key)
    byKeep.set(key, prev ? { ...prev, ...p, status: 'active' } : p)
  }
  writeLocal([...byKeep.values()], true)

  return out.sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export async function savePayrollProfile(profile: PayrollProfileRecord): Promise<PayrollProfileRecord> {
  const now = new Date().toISOString()
  const next: PayrollProfileRecord = {
    ...profile,
    fullName: [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' '),
    salaryPerDay: Math.max(0, Number(profile.salaryPerDay) || 0),
    sssEmployee: Math.max(0, Number(profile.sssEmployee) || 0),
    mpfEmployee: Math.max(0, Number(profile.mpfEmployee) || 0),
    pagibigEmployee: Math.max(0, Number(profile.pagibigEmployee) || 0),
    philhealthEmployee: Math.max(0, Number(profile.philhealthEmployee) || 0),
    sssEmployer: Math.max(0, Number(profile.sssEmployer) || 0),
    mpfEmployer: Math.max(0, Number(profile.mpfEmployer) || 0),
    ecEmployer: Math.max(0, Number(profile.ecEmployer) || 0),
    pagibigEmployer: Math.max(0, Number(profile.pagibigEmployer) || 0),
    philhealthEmployer: Math.max(0, Number(profile.philhealthEmployer) || 0),
    otherDeduction: Math.max(0, Number(profile.otherDeduction) || 0),
    allowance: Math.max(0, Number(profile.allowance) || 0),
    benefits: normalizeBenefitLines(profile.benefits),
  }

  if (isSupabaseConfigured && supabase) {
    const payload = {
      user_id: next.userId && isUuid(next.userId) ? next.userId : null,
      first_name: next.firstName || next.fullName,
      middle_name: next.middleName || null,
      last_name: next.lastName || '—',
      email: next.email,
      branch_id: next.branchId && isUuid(next.branchId) ? next.branchId : null,
      branch_label: next.branchLabel || null,
      job_title: next.jobTitle || null,
      employment_status: next.employmentStatus || null,
      shift_label: next.shiftLabel || 'TUE - SUN 9:45 AM - 7:00 PM',
      salary_per_day: next.salaryPerDay,
      tin: next.tin || null,
      pagibig_no: next.pagibigNo || null,
      philhealth_no: next.philhealthNo || null,
      sss_no: next.sssNo || null,
      sss_employee: next.sssEmployee,
      mpf_employee: next.mpfEmployee,
      pagibig_employee: next.pagibigEmployee,
      philhealth_employee: next.philhealthEmployee,
      sss_employer: next.sssEmployer,
      mpf_employer: next.mpfEmployer,
      ec_employer: next.ecEmployer,
      pagibig_employer: next.pagibigEmployer,
      philhealth_employer: next.philhealthEmployer,
      other_deduction: next.otherDeduction,
      allowance: next.allowance,
      benefits: next.benefits ?? [],
      notes: next.notes || null,
      status: next.status,
      updated_at: now,
    }

    let data: Parameters<typeof mapDbRow>[0] | null = null
    let error: { message: string } | null = null

    if (next.dbId && isUuid(next.dbId)) {
      const res = await supabase
        .from('payroll_employee_profiles')
        .update(payload)
        .eq('id', next.dbId)
        .select('*')
        .single()
      data = res.data as typeof data
      error = res.error
    } else {
      const res = await supabase
        .from('payroll_employee_profiles')
        .upsert(payload, { onConflict: 'email' })
        .select('*')
        .single()
      data = res.data as typeof data
      error = res.error
    }

    if (error) {
      // Keep local roster so Salary still sees the rate even if remote RLS blocks.
      console.warn('[payroll] remote save failed, keeping local profile', error.message)
    } else if (data) {
      const mapped = mapDbRow(data)
      const all = readLocal().filter(
        (r) => r.email.trim().toLowerCase() !== mapped.email.trim().toLowerCase(),
      )
      writeLocal([mapped, ...all])
      return mapped
    }
  }

  const all = readLocal().filter((r) => r.email.trim().toLowerCase() !== next.email.trim().toLowerCase())
  writeLocal([next, ...all])
  return next
}

export function employeeStatutoryMonthly(p: PayrollProfileRecord): number {
  return p.sssEmployee + p.mpfEmployee + p.pagibigEmployee + p.philhealthEmployee + p.otherDeduction
}

export function employerBenefitMonthly(p: PayrollProfileRecord): number {
  return p.sssEmployer + p.mpfEmployer + p.ecEmployer + p.pagibigEmployer + p.philhealthEmployer
}

export function suggestPhilhealthFromDaily(salaryPerDay: number): number {
  return philhealthShareFromMbs(monthlyBasicSalary(salaryPerDay))
}

/** Sync daily rate + itemized benefits from Employee Database into the payroll roster. */
export async function upsertEmployeePayFromDirectory(input: {
  userId: string
  email: string
  fullName: string
  branchId?: string
  branchName?: string
  jobTitle?: string
  dailyRate: number
  benefits: EmployeeBenefitLine[]
}): Promise<PayrollProfileRecord> {
  const profiles = await listPayrollProfilesForHr()
  const emailKey = input.email.trim().toLowerCase()
  const existing =
    profiles.find((p) => p.email.trim().toLowerCase() === emailKey) ||
    profiles.find((p) => p.userId === input.userId || p.id === input.userId)

  const base =
    existing ??
    stubFromDirectory({
      id: input.userId,
      fullName: input.fullName,
      email: input.email,
      branchId: input.branchId || '',
      branchName: input.branchName || '',
      title: input.jobTitle || 'Staff',
    })

  return savePayrollProfile({
    ...base,
    userId: base.userId || input.userId,
    id: input.userId,
    salaryPerDay: Math.max(0, Number(input.dailyRate) || 0),
    benefits: normalizeBenefitLines(input.benefits),
    branchId: base.branchId || input.branchId || null,
    branchLabel: base.branchLabel || input.branchName || '',
    jobTitle: base.jobTitle || input.jobTitle || 'Staff',
  })
}

export function totalMonthlyBenefits(benefits: EmployeeBenefitLine[] | undefined): number {
  return (benefits ?? []).reduce((s, b) => s + Math.max(0, Number(b.monthlyCost) || 0), 0)
}

export { monthlyBasicSalary, PAYROLL_DEFAULT_SHIFT }
