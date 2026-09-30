import { createContext, useContext, useMemo, useState, type ReactNode, useEffect } from 'react'
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
    }
  }, [locked, user?.branchId])

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
