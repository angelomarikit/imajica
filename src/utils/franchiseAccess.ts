import type { AuthSessionUser, UserRole } from '@/types'
import { getBranches } from '@/services/branchService'

const HQ_ROLES: UserRole[] = ['SUPER_ADMIN', 'HQ_ADMIN']
/** Org-wide roles land on the HQ sentinel branch (not a clinic). */
export const ORG_WIDE_ROLES: UserRole[] = ['SUPER_ADMIN', 'HQ_ADMIN', 'HR', 'MARKETING', 'CLIENT']
export const HQ_SENTINEL_BRANCH_ID = '00000000-0000-0000-0000-000000000001'

/** HQ / org-wide admins (full system) */
export function isHqRole(role: UserRole | undefined | null): boolean {
  return Boolean(role && HQ_ROLES.includes(role))
}

/** Human Resources — all clinics people ops (not full HQ). */
export function isHrRole(role: UserRole | undefined | null): boolean {
  return role === 'HR'
}

/** Marketing — org-wide campaigns / leads / promotions (not full HQ). */
export function isMarketingRole(role: UserRole | undefined | null): boolean {
  return role === 'MARKETING'
}

/** HQ or Marketing — marketing tools. */
export function canAccessMarketing(user: AuthSessionUser | null | undefined): boolean {
  return isHqRole(user?.role) || isMarketingRole(user?.role)
}

/** HQ or HR — can switch All Branches and view people-ops org-wide. */
export function canAccessPeopleOps(user: AuthSessionUser | null | undefined): boolean {
  return isHqRole(user?.role) || isHrRole(user?.role)
}

/**
 * Who may approve / designate leave:
 * HR + HQ now; clinic managers for their own branch (ready for that rollout).
 */
export function canApproveLeave(
  user: AuthSessionUser | null | undefined,
  leaveBranchId?: string | null,
): boolean {
  if (!user) return false
  if (canAccessPeopleOps(user)) return true
  if (!isBranchOwner(user)) return false
  if (!leaveBranchId) return true
  return user.branchId === leaveBranchId
}

export function isOrgWideRole(role: string | undefined | null): boolean {
  return Boolean(role && ORG_WIDE_ROLES.includes(role as UserRole))
}

function resolveBranchType(
  user: AuthSessionUser,
): AuthSessionUser['branchType'] | undefined {
  if (user.branchType) return user.branchType
  if (!user.branchId) return undefined
  return getBranches().find((b) => b.id === user.branchId)?.branchType
}

/**
 * Clinic manager (product name): BRANCH_ADMIN assigned to a clinic branch
 * (franchise or company-owned). Same trimmed UI + branch-scoped data.
 */
export function isFranchiseBranchOwner(user: AuthSessionUser | null | undefined): boolean {
  return isBranchOwner(user)
}

/** Prefer this name in new code — same rules as isFranchiseBranchOwner. */
export function isBranchOwner(user: AuthSessionUser | null | undefined): boolean {
  if (!user) return false
  if (user.role !== 'BRANCH_ADMIN' || !user.branchId) return false
  if (user.branchId === HQ_SENTINEL_BRANCH_ID) return false
  const type = resolveBranchType(user)
  if (type === 'warehouse') return false
  // Missing type still allowed if they have a real branch_id (DB may not hydrate yet)
  return true
}

/** Clinical / ops staff who use Time In–Out instead of the branch dashboard */
export const TIMECLOCK_ROLES: UserRole[] = [
  'DOCTOR',
  'NURSE',
  'AESTHETICIAN',
  'RECEPTIONIST',
  'STAFF',
]

export function isTimeclockStaff(user: AuthSessionUser | null | undefined): boolean {
  if (!user) return false
  if (!TIMECLOCK_ROLES.includes(user.role)) return false
  if (!user.branchId || user.branchId === HQ_SENTINEL_BRANCH_ID) return false
  const type = resolveBranchType(user)
  if (type === 'warehouse') return false
  return true
}

/** Staff who must stay locked to a single branch in UI/data. */
export function isBranchScopedStaff(user: AuthSessionUser | null | undefined): boolean {
  return isBranchOwner(user) || isTimeclockStaff(user)
}

export function canAccessHqAdmin(user: AuthSessionUser | null | undefined): boolean {
  return isHqRole(user?.role)
}

/** Post-login / default admin home. HQ + clinic managers → Dashboard; HR → attendance; clinical staff → attendance. */
export function getStaffHomePath(user: AuthSessionUser | null | undefined): string {
  if (!user) return '/login'
  if (isHrRole(user.role)) return '/admin/hr/salary'
  if (isMarketingRole(user.role)) return '/admin/marketing/dashboard'
  if (isTimeclockStaff(user)) return '/admin/attendance'
  if (isBranchOwner(user)) return '/admin/dashboard'
  if (isStaffRoleLike(user.role)) return '/admin/dashboard'
  return '/client/dashboard'
}

function isStaffRoleLike(role: UserRole): boolean {
  return role !== 'CLIENT'
}
