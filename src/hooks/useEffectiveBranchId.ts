import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { isBranchScopedStaff } from '@/utils/franchiseAccess'

/**
 * Effective branch filter for list pages.
 * Franchise owners are always locked to user.branchId (never "all").
 */
export function useEffectiveBranchId(): string | 'all' {
  const { user } = useAuth()
  const { selectedBranchId } = useBranch()
  if (isBranchScopedStaff(user) && user?.branchId) return user.branchId
  return selectedBranchId
}

export function useForcedBranchId(): string | undefined {
  const { user } = useAuth()
  if (isBranchScopedStaff(user)) return user?.branchId
  return undefined
}
