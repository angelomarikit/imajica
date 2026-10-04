import { BRANCH_IDS } from '@/constants/teamAccountsSeed'

/** Shift used across the payroll spreadsheet (Manila). */
export const PAYROLL_DEFAULT_SHIFT = {
  /** Tue=2 … Sun=0 */
  workWeekdays: [0, 2, 3, 4, 5, 6] as number[],
  startHour: 9,
  startMinute: 45,
  endHour: 19,
  endMinute: 0,
  /** Working days used for Monthly Basic Salary in the sheet: SALARY/DAY × 26 */
  mbsDaysPerMonth: 26,
} as const

export type PayrollRosterEmployee = {
  id: string
  firstName: string
  middleName: string
  lastName: string
  fullName: string
  email: string
  /** Alternate emails / kiosk emails for attendance matching */
  matchEmails: string[]
  gender: string
  birthDate: string
  civilStatus: string
  phone: string
  address: string
  emergencyContact: string
  emergencyRelationship: string
  emergencyPhone: string
  dateHired: string
  employmentStatus: string
  jobTitle: string
  /** Display branch from sheet */
  branchLabel: string
  branchId: string | null
  shiftLabel: string
  salaryPerDay: number
  tin: string
  pagibigNo: string
  philhealthNo: string
  sssNo: string
  /** Employee statutory shares (monthly, from spreadsheet) */
  sssEmployee: number
  mpfEmployee: number
  pagibigEmployee: number
  philhealthEmployee: number
  /** Employer shares (monthly, informational) */
  sssEmployer: number
  mpfEmployer: number
  ecEmployer: number
  pagibigEmployer: number
  philhealthEmployer: number
}

function emp(
  partial: Omit<PayrollRosterEmployee, 'fullName' | 'id'> & { id?: string },
): PayrollRosterEmployee {
  const fullName = [partial.firstName, partial.middleName, partial.lastName]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(' ')
  return {
    ...partial,
    id: partial.id ?? `pay-${partial.email.toLowerCase()}`,
    fullName,
  }
}

/**
 * Seeded from Downloads/Untitled spreadsheet.xlsx (Imajica payroll master).
 * MBS = salaryPerDay × 26; PHIC employee/employer = MBS × 2.5%.
 */
export const PAYROLL_ROSTER_SEED: PayrollRosterEmployee[] = [
  emp({
    firstName: 'Samerah',
    middleName: 'Mislay',
    lastName: 'Sandigan',
    email: 'imajicasamerah@gmail.com',
    matchEmails: ['samerah.sandigan@imajica.com', 'samerahsandigan01@gmail.com'],
    gender: 'Female',
    birthDate: '2004-01-13',
    civilStatus: 'Single',
    phone: '09776669737',
    address: '3rd St., Parkhomes Subdivision, Guitnang Bayan II, San Mateo, Rizal',
    emergencyContact: 'Nasheba Sandigan',
    emergencyRelationship: 'Mother',
    emergencyPhone: '09651340871',
    dateHired: '2024-07-16',
    employmentStatus: 'Regular',
    jobTitle: 'General Manager',
    branchLabel: 'All Branch',
    branchId: null,
    shiftLabel: 'TUE - SUN 9:45 AM - 7:00 PM',
    salaryPerDay: 900,
    tin: '623-632-244-00000',
    pagibigNo: '121316879754',
    philhealthNo: '03-026876571-5',
    sssNo: '35-2475186-1',
    sssEmployee: 1000,
    mpfEmployee: 50,
    pagibigEmployee: 200,
    philhealthEmployee: 585,
    sssEmployer: 2000,
    mpfEmployer: 100,
    ecEmployer: 30,
    pagibigEmployer: 200,
    philhealthEmployer: 585,
  }),
  emp({
    firstName: 'Ynyr Collene',
    middleName: 'Sioting',
    lastName: 'Bandoquillo',
    email: 'ynyrnicollebandoquillo@gmail.com',
    matchEmails: ['ynyr.collene.bandoquillo@imajica.com'],
    gender: 'Female',
    birthDate: '2001-03-10',
    civilStatus: 'Single',
    phone: '09691586071',
    address: '10 Legislative Rd Batasan Hills, Quezon City',
    emergencyContact: 'Franklin Bandoquillo',
    emergencyRelationship: 'Father',
    emergencyPhone: '09457068642',
    dateHired: '2026-08-25',
    employmentStatus: 'Probationary',
    jobTitle: 'Clinic Manager',
    branchLabel: 'San Mateo',
    branchId: BRANCH_IDS.sanMateo,
    shiftLabel: 'TUE - SUN 9:45 AM - 7:00 PM',
    salaryPerDay: 800,
    tin: '668087122',
    pagibigNo: '121360118270',
    philhealthNo: '03-027200204-1',
    sssNo: '35-2310463-9',
    sssEmployee: 900,
    mpfEmployee: 0,
    pagibigEmployee: 200,
    philhealthEmployee: 520,
    sssEmployer: 1800,
    mpfEmployer: 0,
    ecEmployer: 30,
    pagibigEmployer: 200,
    philhealthEmployer: 520,
  }),
  emp({
    firstName: 'Noraisa',
    middleName: 'Unayan',
    lastName: 'Esmael',
    email: 'esmaeldaisy12@gmail.com',
    matchEmails: ['noraisa.unayan@imajica.com'],
    gender: 'Female',
    birthDate: '1997-10-12',
    civilStatus: 'Single',
    phone: '09813286510',
    address: '3rd St., Parkhomes Subdivision, Guitnang Bayan II, San Mateo, Rizal',
    emergencyContact: 'Noraima Esmael',
    emergencyRelationship: 'Sister',
    emergencyPhone: '09555029035',
    dateHired: '2025-04-08',
    employmentStatus: 'Regular',
    jobTitle: 'Aesthetician',
    branchLabel: 'San Mateo',
    branchId: BRANCH_IDS.sanMateo,
    shiftLabel: 'TUE - SUN 9:45 AM - 7:00 PM',
    salaryPerDay: 750,
    tin: '675-805-623-00000',
    pagibigNo: '121365328541',
    philhealthNo: '03-027174868-6',
    sssNo: '09-5365930-4',
    sssEmployee: 775,
    mpfEmployee: 0,
    pagibigEmployee: 200,
    philhealthEmployee: 487.5,
    sssEmployer: 1550,
    mpfEmployer: 0,
    ecEmployer: 30,
    pagibigEmployer: 200,
    philhealthEmployer: 487.5,
  }),
  emp({
    firstName: 'Janice',
    middleName: 'Bagadiong',
    lastName: 'Aguirre',
    email: 'janiceaguirre014@gmail.com',
    matchEmails: ['janice.aguirre@imajica.com', 'jadeaguirre47@gmail.com'],
    gender: 'Female',
    birthDate: '1993-10-23',
    civilStatus: 'Married',
    phone: '09301218103',
    address: '154 Gueverra Compound Champaca 2 Fortune Marikina City',
    emergencyContact: 'Nelson Aguirre',
    emergencyRelationship: 'Husband',
    emergencyPhone: '09302691324',
    dateHired: '2025-11-15',
    employmentStatus: 'Regular',
    jobTitle: 'IVT / Aesthetician',
    branchLabel: 'San Mateo',
    branchId: BRANCH_IDS.sanMateo,
    shiftLabel: 'TUE - SUN 9:45 AM - 7:00 PM',
    salaryPerDay: 790,
    tin: '722-061-017-000',
    pagibigNo: '121191728495',
    philhealthNo: '102011419892',
    sssNo: '33-9316099-7',
    sssEmployee: 900,
    mpfEmployee: 0,
    pagibigEmployee: 200,
    philhealthEmployee: 513.5,
    sssEmployer: 1800,
    mpfEmployer: 0,
    ecEmployer: 30,
    pagibigEmployer: 200,
    philhealthEmployer: 513.5,
  }),
  emp({
    firstName: 'Sitti Nur Aisa',
    middleName: 'Hajijol',
    lastName: 'Tan',
    email: 'sittinuraisat@gmail.com',
    matchEmails: ['sitti.nur.aisa.tan@imajica.com'],
    gender: 'Female',
    birthDate: '2003-11-03',
    civilStatus: 'Single',
    phone: '09653949213',
    address: 'Blk9 Lot8 Purok1 Buntong Palay, Brgy. Silangan, San Mateo, Rizal',
    emergencyContact: 'Moh Nur Tulawie Tan',
    emergencyRelationship: 'Father',
    emergencyPhone: '09161339549',
    dateHired: '2025-05-03',
    employmentStatus: 'Regular',
    jobTitle: 'Aesthetician',
    branchLabel: 'San Mateo',
    branchId: BRANCH_IDS.sanMateo,
    shiftLabel: 'TUE - SUN 9:45 AM - 7:00 PM',
    salaryPerDay: 750,
    tin: '675-836-254-00000',
    pagibigNo: '121365331263',
    philhealthNo: '20-250354187-6',
    sssNo: '35-3861175-1',
    sssEmployee: 775,
    mpfEmployee: 0,
    pagibigEmployee: 200,
    philhealthEmployee: 487.5,
    sssEmployer: 1550,
    mpfEmployer: 0,
    ecEmployer: 30,
    pagibigEmployer: 200,
    philhealthEmployer: 487.5,
  }),
]

export function monthlyBasicSalary(salaryPerDay: number): number {
  return salaryPerDay * PAYROLL_DEFAULT_SHIFT.mbsDaysPerMonth
}

export function philhealthShareFromMbs(mbs: number): number {
  return Math.round(mbs * 0.025 * 100) / 100
}
