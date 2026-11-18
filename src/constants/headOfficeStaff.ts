import { HQ_SENTINEL_BRANCH_ID } from '@/constants/teamAccountsSeed'

/**
 * Org-wide people who use Head Office Attendance / Head Office Salary
 * (not assigned to a clinic). Match by email / name only — do not mutate Auth profiles.
 */
export const HEAD_OFFICE_STAFF = [
  {
    fullName: 'Samerah Sandigan',
    emails: [
      'samerah.sandigan@imajica.com',
      'imajicasamerah@gmail.com',
      'samerahsandigan01@gmail.com',
    ],
  },
] as const

export const HEAD_OFFICE_BRANCH_ID = HQ_SENTINEL_BRANCH_ID
export const HEAD_OFFICE_BRANCH_LABEL = 'Head Office'

const EMAIL_SET = new Set(
  HEAD_OFFICE_STAFF.flatMap((p) => p.emails.map((e) => e.trim().toLowerCase())),
)

const NAME_SET = new Set(
  HEAD_OFFICE_STAFF.map((p) => p.fullName.trim().toLowerCase()),
)

function normEmail(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

function normName(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

/** True when this person is tagged for Head Office attendance / salary (e.g. Samerah). */
export function isHeadOfficeStaffPerson(input: {
  email?: string | null
  emails?: Array<string | null | undefined>
  fullName?: string | null
}): boolean {
  if (normEmail(input.email) && EMAIL_SET.has(normEmail(input.email))) return true
  for (const e of input.emails ?? []) {
    if (normEmail(e) && EMAIL_SET.has(normEmail(e))) return true
  }
  if (normName(input.fullName) && NAME_SET.has(normName(input.fullName))) return true
  return false
}
