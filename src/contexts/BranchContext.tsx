import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { getBranches, subscribeBranches } from '@/services/branchService'
import type { Branch } from '@/types'
import { useEffect } from 'react'

interface BranchContextValue {
  branches: Branch[]
  selectedBranchId: string
  setSelectedBranchId: (id: string) => void
  selectedBranch: Branch | null
  isAllBranches: boolean
}

const BranchContext = createContext<BranchContextValue | null>(null)

export function BranchProvider({ children }: { children: ReactNode }) {
  const [selectedBranchId, setSelectedBranchId] = useState('all')
  const [branches, setBranches] = useState<Branch[]>(() => getBranches())

  useEffect(() => {
    const refresh = () => setBranches(getBranches())
    refresh()
    return subscribeBranches(refresh)
  }, [])

  const value = useMemo(() => {
    const selectedBranch = branches.find((b) => b.id === selectedBranchId) ?? null
    return {
      branches,
      selectedBranchId,
      setSelectedBranchId,
      selectedBranch,
      isAllBranches: selectedBranchId === 'all',
    }
  }, [branches, selectedBranchId])

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranch must be used within BranchProvider')
  return ctx
}
