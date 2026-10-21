import { createContext, useContext, useMemo, useState, type ReactNode, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getBranches, subscribeBranches } from '@/services/branchService'
import type { Branch } from '@/types'
import { resolveClinicBranchId } from '@/services/branchService'
import { HQ_SENTINEL_BRANCH_ID, isBranchScopedStaff } from '@/utils/franchiseAccess'

interface BranchContextValue {
  branches: Branch[]
  selectedBranchId: string
  setSelectedBranchId: (id: string) => void
  selectedBranch: Branch | null
  isAllBranches: boolean
  /** Franchise owners cannot switch away from their branch */
  branchLocked: boolean
}

const BranchContext = createContext<BranchContextValue | null>(null)

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const locked = isBranchScopedStaff(user)
  const resolvedUserBranch =
    resolveClinicBranchId(user?.branchId) ||
    (user?.branchId && user.branchId !== HQ_SENTINEL_BRANCH_ID ? user.branchId : undefined)
  const lockedBranchId = locked ? resolvedUserBranch ?? 'all' : 'all'
  const prevUserKey = useRef<string | null>(null)

  const [selectedBranchId, setSelectedBranchIdState] = useState(lockedBranchId)
  const [branches, setBranches] = useState<Branch[]>(() => getBranches())

  useEffect(() => {
    // Header switcher: clinic locations only (company-owned + franchise). No warehouse.
    const refresh = () =>
      setBranches(
        getBranches().filter(
          (b) =>
            b.status === 'active' &&
            b.branchType !== 'warehouse' &&
            b.code !== 'HQ' &&
            b.id !== '00000000-0000-0000-0000-000000000001',
        ),
      )
    refresh()
    return subscribeBranches(refresh)
  }, [])

  useEffect(() => {
    if (locked && resolvedUserBranch) {
      setSelectedBranchIdState(resolvedUserBranch)
      prevUserKey.current = user ? `${user.id}:${user.role}` : null
      return
    }
    // HQ (and other org-wide staff) must land on All Branches after login / unlock —
    // otherwise a prior San Mateo (or any clinic) selection sticks and the HQ dashboard
    // looks single-branch.
    const userKey = user ? `${user.id}:${user.role}` : null
    const userChanged = userKey !== prevUserKey.current
    prevUserKey.current = userKey
    if (userChanged && !locked) {
      setSelectedBranchIdState('all')
    }
  }, [locked, user, resolvedUserBranch, user?.id, user?.role])

  const setSelectedBranchId = (id: string) => {
    if (locked) return
    setSelectedBranchIdState(id)
  }

  const value = useMemo(() => {
    const effectiveId = locked && resolvedUserBranch ? resolvedUserBranch : selectedBranchId
    const selectedBranch = branches.find((b) => b.id === effectiveId) ?? null
    return {
      branches:
        locked && resolvedUserBranch
          ? branches.filter((b) => b.id === resolvedUserBranch)
          : branches,
      selectedBranchId: effectiveId,
      setSelectedBranchId,
      selectedBranch,
      isAllBranches: !locked && effectiveId === 'all',
      branchLocked: locked,
    }
  }, [branches, selectedBranchId, locked, resolvedUserBranch])

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranch must be used within BranchProvider')
  return ctx
}
