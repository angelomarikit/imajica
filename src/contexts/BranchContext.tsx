import { createContext, useContext, useMemo, useState, type ReactNode, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getBranches, subscribeBranches } from '@/services/branchService'
import type { Branch } from '@/types'
import { resolveClinicBranchId } from '@/services/branchService'
import {
  HQ_SENTINEL_BRANCH_ID,
  isBranchScopedStaff,
  isCsrMarketingRole,
} from '@/utils/franchiseAccess'

interface BranchContextValue {
  branches: Branch[]
  selectedBranchId: string
  setSelectedBranchId: (id: string) => void
  selectedBranch: Branch | null
  isAllBranches: boolean
  /** Franchise owners / single-clinic staff cannot switch away from their branch */
  branchLocked: boolean
  /** CSR may switch only among assigned clinics (no All Branches) */
  csrBranchScoped: boolean
}

const BranchContext = createContext<BranchContextValue | null>(null)

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const csrScoped = isCsrMarketingRole(user?.role)
  const locked = isBranchScopedStaff(user) && !csrScoped
  const resolvedUserBranch =
    resolveClinicBranchId(user?.branchId) ||
    (user?.branchId && user.branchId !== HQ_SENTINEL_BRANCH_ID ? user.branchId : undefined)
  const csrBranchIds = useMemo(() => {
    if (!csrScoped) return [] as string[]
    const ids = (user?.branchIds?.length ? user.branchIds : user?.branchId ? [user.branchId] : [])
      .map((id) => resolveClinicBranchId(id) || id)
      .filter((id): id is string => Boolean(id) && id !== HQ_SENTINEL_BRANCH_ID)
    return [...new Set(ids)]
  }, [csrScoped, user?.branchIds, user?.branchId])

  const lockedBranchId = locked ? resolvedUserBranch ?? 'all' : 'all'
  const prevUserKey = useRef<string | null>(null)

  const [selectedBranchId, setSelectedBranchIdState] = useState(() => {
    if (csrScoped && csrBranchIds[0]) return csrBranchIds[0]
    return lockedBranchId
  })
  const [branches, setBranches] = useState<Branch[]>(() => getBranches())

  useEffect(() => {
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
    const userKey = user ? `${user.id}:${user.role}` : null
    const userChanged = userKey !== prevUserKey.current
    prevUserKey.current = userKey

    if (csrScoped) {
      setSelectedBranchIdState((prev) =>
        prev !== 'all' && csrBranchIds.includes(prev) ? prev : csrBranchIds[0] || prev,
      )
      return
    }
    if (locked && resolvedUserBranch) {
      setSelectedBranchIdState(resolvedUserBranch)
      return
    }
    if (userChanged && !locked) {
      setSelectedBranchIdState('all')
    }
  }, [locked, csrScoped, resolvedUserBranch, user?.id, user?.role, csrBranchIds])

  const setSelectedBranchId = (id: string) => {
    if (locked) return
    if (csrScoped) {
      if (csrBranchIds.includes(id)) setSelectedBranchIdState(id)
      return
    }
    setSelectedBranchIdState(id)
  }

  const value = useMemo(() => {
    if (csrScoped) {
      const csrBranches = branches.filter((b) => csrBranchIds.includes(b.id))
      const effectiveId =
        selectedBranchId !== 'all' && csrBranchIds.includes(selectedBranchId)
          ? selectedBranchId
          : csrBranchIds[0] || selectedBranchId
      const selectedBranch = csrBranches.find((b) => b.id === effectiveId) ?? null
      return {
        branches: csrBranches,
        selectedBranchId: effectiveId,
        setSelectedBranchId,
        selectedBranch,
        isAllBranches: false,
        branchLocked: false,
        csrBranchScoped: true,
      }
    }

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
      csrBranchScoped: false,
    }
  }, [branches, selectedBranchId, locked, resolvedUserBranch, csrScoped, csrBranchIds.join('|')])

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranch must be used within BranchProvider')
  return ctx
}
