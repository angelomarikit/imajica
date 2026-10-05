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
import { isUuid } from '@/utils/uuid'

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
    notes: row.notes || undefined,
    status: row.status === 'inactive' ? 'inactive' : 'active',
  }
}

function stubFromDirectory(input: {
  id: string
  fullName: string
  email: string
  branchId: string
  branchName: string
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
  }))
}

export function getMergedPayrollProfiles(): PayrollProfileRecord[] {
  return mergeProfiles(seedAsProfiles())
}

export async function listPayrollProfilesForHr(): Promise<PayrollProfileRecord[]> {
  let remote: PayrollProfileRecord[] = []
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('payroll_employee_profiles')
      .select('*')
      .order('last_name')
    if (!error && data) {
      remote = (data as Parameters<typeof mapDbRow>[0][]).map(mapDbRow)
      // Silent cache of remote rows
      const local = readLocal()
      const byEmail = new Map(local.map((r) => [r.email.trim().toLowerCase(), r]))
      for (const r of remote) byEmail.set(r.email.trim().toLowerCase(), { ...byEmail.get(r.email.trim().toLowerCase()), ...r })
      writeLocal([...byEmail.values()], true)
    }
  }

  const directory = await listDirectoryStaff()
  const merged = mergeProfiles([...seedAsProfiles(), ...remote])
  const byEmail = new Map(merged.map((p) => [p.email.trim().toLowerCase(), p]))
  const byName = new Map(merged.map((p) => [p.fullName.trim().toLowerCase(), p]))

  for (const emp of directory.filter((d) => d.status === 'active')) {
    const email = (emp.email || '').trim().toLowerCase()
    const name = emp.fullName.trim().toLowerCase()
    const existing =
      (email && byEmail.get(email)) ||
      byName.get(name) ||
      merged.find((p) => p.userId === emp.id || p.matchEmails.some((m) => m.toLowerCase() === email))

    if (existing) {
      const next = {
        ...existing,
        userId: existing.userId || emp.id,
        id: emp.id,
        branchId: existing.branchId || emp.branchId || null,
        branchLabel: existing.branchLabel || emp.branchName || '',
        jobTitle: existing.jobTitle || emp.title || 'Staff',
        matchEmails: [
          ...new Set([
            ...existing.matchEmails,
            emp.email,
            ...(email && existing.email.toLowerCase() !== email ? [emp.email] : []),
          ].filter(Boolean)),
        ],
      }
      byEmail.set((next.email || email).toLowerCase(), next)
      continue
    }

    const stub = stubFromDirectory({
      id: emp.id,
      fullName: emp.fullName,
      email: emp.email,
      branchId: emp.branchId,
      branchName: emp.branchName,
      title: emp.title,
    })
    byEmail.set((stub.email || emp.id).toLowerCase(), stub)
  }

  return [...byEmail.values()].sort((a, b) => a.fullName.localeCompare(b.fullName))
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

    if (error) throw new Error(error.message)
    if (data) {
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

export { monthlyBasicSalary, PAYROLL_DEFAULT_SHIFT }
