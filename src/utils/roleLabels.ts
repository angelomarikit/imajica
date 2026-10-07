/**
 * Display names for system roles.
 * Internal / DB role ids stay unchanged (e.g. BRANCH_ADMIN).
 * Product term: BRANCH_ADMIN = Clinic Manager.
 */
const ROLE_DISPLAY_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  HQ_ADMIN: 'HQ Admin',
  HR: 'HR',
  MARKETING: 'Marketing',
  BRANCH_MARKETING: 'Branch Marketing',
  BRANCH_ADMIN: 'Clinic Manager',
  DOCTOR: 'Doctor',
  NURSE: 'Nurse',
  AESTHETICIAN: 'Aesthetician',
  RECEPTIONIST: 'Receptionist',
  STAFF: 'Staff',
  CLIENT: 'Client',
}

/** User-facing label for a role id (e.g. BRANCH_ADMIN → Clinic Manager). */
export function formatRoleLabel(role: string | null | undefined): string {
  if (!role) return '—'
  return ROLE_DISPLAY_LABELS[role] ?? role.replaceAll('_', ' ')
}
