import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { resolveClinicBranchId } from '@/services/branchService'
import { HQ_SENTINEL_BRANCH_ID, isBranchScopedStaff } from '@/utils/franchiseAccess'

/**
 * Effective branch filter for list pages.
 * Franchise owners are always locked to user.branchId (never "all").
 */
export function useEffectiveBranchId(): string | 'all' {
  const { user } = useAuth()
  const { selectedBranchId } = useBranch()
  const locked = resolveClinicBranchId(user?.branchId) || user?.branchId
  if (isBranchScopedStaff(user) && locked && locked !== HQ_SENTINEL_BRANCH_ID) {
    return locked
  }
  return selectedBranchId
}

/** Clinic UUID for branch-locked staff (STAFF / Clinic Manager / Branch Marketing). */
export function useForcedBranchId(): string | undefined {
  const { user } = useAuth()
  if (!isBranchScopedStaff(user)) return undefined
  const id = resolveClinicBranchId(user?.branchId) || user?.branchId
  if (!id || id === HQ_SENTINEL_BRANCH_ID || id === 'all') return undefined
  return id
}
