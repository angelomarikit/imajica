import type { AccessUser, AuthSessionUser, UserRole } from '@/types'

/** Shared simple password for seeded team accounts (see docs/TEAM_ACCOUNT_CREDENTIALS.md). */
export const TEAM_ACCOUNT_PASSWORD = 'Imajica123'

export const HQ_SENTINEL_BRANCH_ID = '00000000-0000-0000-0000-000000000001'

export const BRANCH_IDS = {
  sanMateo: '22222222-2222-2222-2222-222222222201',
  cainta: '22222222-2222-2222-2222-222222222202',
  pasig: '22222222-2222-2222-2222-222222222203',
  lipa: '22222222-2222-2222-2222-222222222204',
  dasma: '22222222-2222-2222-2222-222222222205',
  bacoor: '22222222-2222-2222-2222-222222222206',
} as const

export type TeamAccountSeed = {
  id: string
  fullName: string
  email: string
  /** Clinic branch UUID, or null for HQ / No Branch → HQ_ADMIN */
  branchId: string | null
  branchName: string | null
  role: UserRole
  password: string
  status: 'active' | 'inactive'
}

function uid(n: number) {
  return `33333333-3333-3333-3333-${String(n).padStart(12, '0')}`
}

function hq(fullName: string, email: string, n: number): TeamAccountSeed {
  return {
    id: uid(n),
    fullName,
    email: email.toLowerCase(),
    branchId: null,
    branchName: null,
    role: 'HQ_ADMIN',
    password: TEAM_ACCOUNT_PASSWORD,
    status: 'active',
  }
}

function branch(
  fullName: string,
  email: string,
  branchId: string,
  branchName: string,
  n: number,
): TeamAccountSeed {
  return {
    id: uid(n),
    fullName,
    email: email.toLowerCase(),
    branchId,
    branchName,
    role: 'BRANCH_ADMIN',
    password: TEAM_ACCOUNT_PASSWORD,
    status: 'active',
  }
}

/**
 * Legacy User List accounts (43) — No Branch = HQ_ADMIN; named branch = BRANCH_ADMIN for that clinic.
 */
export const TEAM_ACCOUNTS_SEED: TeamAccountSeed[] = [
  hq('admin', 'imajica-admin@gmail.com', 1),
  hq('admintesting', 'admin@intra-code.com', 2),
  branch('Annie Barba', 'annieba560@gmail.com', BRANCH_IDS.pasig, 'Pasig City', 3),
  branch('BACOOR ADMIN', 'bacoor@gmail.com', BRANCH_IDS.bacoor, 'Bacoor, Cavite', 4),
  branch('Bacoor, Cavite', 'imajicabacoor@gmail.com', BRANCH_IDS.bacoor, 'Bacoor, Cavite', 5),
  hq('Bridgette', 'bridgetteandreasantos@gmail.com', 6),
  hq('Charise', 'charisesampaga@gmail.com', 7),
  branch('Chloe Francisco', 'chloe.francisco11@gmail.com', BRANCH_IDS.cainta, 'Cainta, Rizal', 8),
  branch('Daisy A. Compañero', 'companerodhey@gmail.com', BRANCH_IDS.dasma, 'Dasmariñas, Cavite', 9),
  branch('DASMA ADMIN', 'dasma@gmail.com', BRANCH_IDS.dasma, 'Dasmariñas, Cavite', 10),
  branch('Dasmariñas, Cavite', 'imajicadasmarinas@gmail.com', BRANCH_IDS.dasma, 'Dasmariñas, Cavite', 11),
  hq('Frances', 'francescruzph.pro@gmail.com', 12),
  branch('Heidi Tiamzon Reyes', 'hydsreyes1220@gmail.com', BRANCH_IDS.cainta, 'Cainta, Rizal', 13),
  branch('Hendra Sandigan', 'hendrasukol98@gmail.com', BRANCH_IDS.pasig, 'Pasig City', 14),
  hq('INACTIVE', 'lloydmichaelpatenia@gmail.com', 15),
  hq('INACTIVE', 'afundarvaneza@gmail.com', 16),
  hq('INACTIVE', 'nicoletexon@gmail.com', 17),
  hq('INACTIVE', 'sherlenejorda@gmail.com', 18),
  hq('INACTIVE', 'rozelynperocho@gmail.com', 19),
  hq('INACTIVE', 'melksto.domingo@gmail.com', 20),
  branch('Janice B. Aguirre', 'jadeaguirre47@gmail.com', BRANCH_IDS.sanMateo, 'San Mateo, Rizal', 21),
  branch('Jonila Marie E. Barro', 'jaja29193@gmail.com', BRANCH_IDS.bacoor, 'Bacoor, Cavite', 22),
  hq('Katrina', 'sweetkatrina143@yahoo.com', 23),
  hq('Marketing Frances', 'frances@moobdigital.com', 24),
  hq('Marketing Support', 'support@moobdigital.com', 25),
  branch('Mea Rose Salvador', 'mearose@gmail.com', BRANCH_IDS.bacoor, 'Bacoor, Cavite', 26),
  branch('Mellisa Gervacio', 'melissagervacio041@gmail.com', BRANCH_IDS.cainta, 'Cainta, Rizal', 27),
  branch('Noraisa Unayan', 'esmaeldaisy12@gmail.com', BRANCH_IDS.sanMateo, 'San Mateo, Rizal', 28),
  branch('Rei Rei', 'gomezreamie13@gmail.com', BRANCH_IDS.bacoor, 'Bacoor, Cavite', 29),
  branch('Rhas Monteclaro', 'rhasmonteclaro01@gmail.com', BRANCH_IDS.sanMateo, 'San Mateo, Rizal', 30),
  branch('Rizielle M. De Dios', 'rizielle112388@gmail.com', BRANCH_IDS.dasma, 'Dasmariñas, Cavite', 31),
  branch('Rosalie Manalo', 'jangmi2575@gmail.com', BRANCH_IDS.pasig, 'Pasig City', 32),
  branch('Samerah Sandigan', 'samerahsandigan01@gmail.com', BRANCH_IDS.sanMateo, 'San Mateo, Rizal', 33),
  branch('Shiene S. Lucero', '547vador.shiene@gmail.com', BRANCH_IDS.bacoor, 'Bacoor, Cavite', 34),
  branch('Sittie Hannah kasim', 'imajicagmsittie@gmail.com', BRANCH_IDS.sanMateo, 'San Mateo, Rizal', 35),
  branch('Sunshine Manalo Feliciano', 'shine.feliciano@gmail.com', BRANCH_IDS.bacoor, 'Bacoor, Cavite', 36),
  branch('tablemanager001', 'tableFR01@gmail.com', BRANCH_IDS.dasma, 'Dasmariñas, Cavite', 37),
  branch('tablemanager002', 'tableFR02@gmail.com', BRANCH_IDS.bacoor, 'Bacoor, Cavite', 38),
  branch('tablemanager01', 'tableBR01@gmail.com', BRANCH_IDS.sanMateo, 'San Mateo, Rizal', 39),
  branch('tablemanager02', 'tableBR02@gmail.com', BRANCH_IDS.cainta, 'Cainta, Rizal', 40),
  branch('tablemanager03', 'tableBR03@gmail.com', BRANCH_IDS.pasig, 'Pasig City', 41),
  branch('Veronica Mayo', 'veronnemay@gmail.com', BRANCH_IDS.cainta, 'Cainta, Rizal', 42),
  hq('Zhai', 'zhairethchua81@gmail.com', 43),
]

export function teamAccountsAsAccessUsers(): AccessUser[] {
  return TEAM_ACCOUNTS_SEED.map((a) => ({
    id: a.id,
    fullName: a.fullName,
    email: a.email,
    role: a.role,
    branchId: a.branchId,
    branchName: a.branchName,
    status: a.status,
  }))
}

export function teamAccountsAsDemoUsers(): Record<string, AuthSessionUser & { password: string }> {
  const out: Record<string, AuthSessionUser & { password: string }> = {}
  for (const a of TEAM_ACCOUNTS_SEED) {
    const branchMeta =
      a.branchId && a.branchName
        ? {
            branchId: a.branchId,
            branchName: a.branchName,
            branchType: (a.branchId === BRANCH_IDS.dasma || a.branchId === BRANCH_IDS.bacoor
              ? 'franchise'
              : 'company_owned') as AuthSessionUser['branchType'],
          }
        : {}
    out[a.email] = {
      id: a.id,
      email: a.email,
      fullName: a.fullName,
      role: a.role,
      password: a.password,
      ...branchMeta,
    }
  }
  return out
}
