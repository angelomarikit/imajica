import { createContext, useContext, useMemo, useState, type ReactNode, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getBranches, subscribeBranches } from '@/services/branchService'
import type { Branch } from '@/types'
import { isBranchScopedStaff } from '@/utils/franchiseAccess'

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
  const lockedBranchId = locked ? user?.branchId ?? 'all' : 'all'
  const prevUserKey = useRef<string | null>(null)

  const [selectedBranchId, setSelectedBranchIdState] = useState(lockedBranchId)
  const [branches, setBranches] = useState<Branch[]>(() => getBranches())

  useEffect(() => {
    const refresh = () => setBranches(getBranches())
    refresh()
    return subscribeBranches(refresh)
  }, [])

  useEffect(() => {
    if (locked && user?.branchId) {
      setSelectedBranchIdState(user.branchId)
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
  }, [locked, user, user?.branchId, user?.id, user?.role])

  const setSelectedBranchId = (id: string) => {
    if (locked) return
    setSelectedBranchIdState(id)
  }

  const value = useMemo(() => {
    const effectiveId = locked && user?.branchId ? user.branchId : selectedBranchId
    const selectedBranch = branches.find((b) => b.id === effectiveId) ?? null
    return {
      branches: locked && user?.branchId ? branches.filter((b) => b.id === user.branchId) : branches,
      selectedBranchId: effectiveId,
      setSelectedBranchId,
      selectedBranch,
      isAllBranches: !locked && effectiveId === 'all',
      branchLocked: locked,
    }
  }, [branches, selectedBranchId, locked, user?.branchId])

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranch must be used within BranchProvider')
  return ctx
}
