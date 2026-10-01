import type { AccessUser, AuthSessionUser, UserRole } from '@/types'
import { BRANCH_IDS, TEAM_ACCOUNT_PASSWORD } from '@/constants/teamAccountsSeed'

export { TEAM_ACCOUNT_PASSWORD }

/** Stable UUIDs for kiosk / employee-number staff (do not collide with teamAccountsSeed 3333…). */
function kioskUid(n: number) {
  return `44444444-4444-4444-4444-${String(n).padStart(12, '0')}`
}

export type KioskStaffSeed = {
  id: string
  fullName: string
  email: string
  /** 3-digit employee number shown on the shared timeclock kiosk */
  employeeCode: string
  branchId: string
  branchName: string
  role: UserRole
  password: string
  status: 'active' | 'inactive'
}

function staff(
  fullName: string,
  emailLocal: string,
  employeeCode: string,
  branchId: string,
  branchName: string,
  n: number,
): KioskStaffSeed {
  return {
    id: kioskUid(n),
    fullName,
    email: `${emailLocal}@imajica.com`.toLowerCase(),
    employeeCode: employeeCode.padStart(3, '0'),
    branchId,
    branchName,
    role: 'STAFF',
    password: TEAM_ACCOUNT_PASSWORD,
    status: 'active',
  }
}

/**
 * Shared kiosk timeclock accounts — punch with employee number (no login required on /timeclock).
 * Emails use @imajica.com for portal login / records.
 */
export const KIOSK_STAFF_SEED: KioskStaffSeed[] = [
  staff('Veronica Mayo', 'veronica.mayo', '002', BRANCH_IDS.cainta, 'Cainta, Rizal', 1),
  staff('Samerah Sandigan', 'samerah.sandigan', '007', BRANCH_IDS.sanMateo, 'San Mateo, Rizal', 2),
  staff('Sonayah Arsila', 'sonayah.arsila', '008', BRANCH_IDS.sanMateo, 'San Mateo, Rizal', 3),
  staff('Noraisa Unayan', 'noraisa.unayan', '010', BRANCH_IDS.sanMateo, 'San Mateo, Rizal', 4),
  staff('Sitti Nur Aisa Tan', 'sitti.nur.aisa.tan', '012', BRANCH_IDS.sanMateo, 'San Mateo, Rizal', 5),
  staff('Melissa Gervacio', 'melissa.gervacio', '014', BRANCH_IDS.cainta, 'Cainta, Rizal', 6),
  staff('Hendra Sandigan', 'hendra.sandigan', '017', BRANCH_IDS.pasig, 'Pasig City', 7),
  staff('Heidi Reyes', 'heidi.reyes', '022', BRANCH_IDS.cainta, 'Cainta, Rizal', 8),
  staff('Janice Aguirre', 'janice.aguirre', '023', BRANCH_IDS.sanMateo, 'San Mateo, Rizal', 9),
  staff('Annie Barba', 'annie.barba', '024', BRANCH_IDS.pasig, 'Pasig City', 10),
  staff('Chloe Renee Francisco', 'chloe.renee.francisco', '025', BRANCH_IDS.cainta, 'Cainta, Rizal', 11),
  staff('Sapiya Lomodah', 'sapiya.lomodah', '026', BRANCH_IDS.sanMateo, 'San Mateo, Rizal', 12),
  staff('Ynyr Collene Bandoquillo', 'ynyr.collene.bandoquillo', '027', BRANCH_IDS.sanMateo, 'San Mateo, Rizal', 13),
]

export function kioskStaffAsAccessUsers(): AccessUser[] {
  return KIOSK_STAFF_SEED.map((a) => ({
    id: a.id,
    fullName: a.fullName,
    email: a.email,
    role: a.role,
    branchId: a.branchId,
    branchName: a.branchName,
    status: a.status,
    employeeCode: a.employeeCode,
  }))
}

export function kioskStaffAsDemoUsers(): Record<string, AuthSessionUser & { password: string }> {
  const out: Record<string, AuthSessionUser & { password: string }> = {}
  for (const a of KIOSK_STAFF_SEED) {
    out[a.email] = {
      id: a.id,
      email: a.email,
      fullName: a.fullName,
      role: a.role,
      password: a.password,
      branchId: a.branchId,
      branchName: a.branchName,
      branchType:
        a.branchId === BRANCH_IDS.dasma || a.branchId === BRANCH_IDS.bacoor
          ? 'franchise'
          : 'company_owned',
    }
  }
  return out
}

export function findKioskStaffByCode(code: string): KioskStaffSeed | undefined {
  const normalized = normalizeEmployeeCode(code)
  return KIOSK_STAFF_SEED.find((s) => s.employeeCode === normalized)
}

export function normalizeEmployeeCode(code: string): string {
  const digits = code.trim().replace(/\D/g, '')
  if (!digits) return ''
  return digits.padStart(3, '0').slice(-3)
}

/** Match a directory name to a seeded kiosk employee number (best-effort). */
export function employeeCodeForFullName(fullName: string): string | null {
  const norm = fullName
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!norm) return null

  for (const s of KIOSK_STAFF_SEED) {
    const seed = s.fullName
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (norm === seed) return s.employeeCode
    // e.g. "Janice B. Aguirre" ↔ "Janice Aguirre", "Chloe Francisco" ↔ "Chloe Renee Francisco"
    const normParts = norm.split(' ')
    const seedParts = seed.split(' ')
    const first = seedParts[0]
    const last = seedParts[seedParts.length - 1]
    if (
      first &&
      last &&
      normParts[0] === first &&
      normParts[normParts.length - 1] === last
    ) {
      return s.employeeCode
    }
  }
  return null
}
