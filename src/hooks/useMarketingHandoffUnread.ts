import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  countUnreadHandoffs,
  listMarketingHandoffs,
  subscribeMarketingLeads,
} from '@/services/marketingLeadService'
import { isBranchOwner, isTimeclockStaff } from '@/utils/franchiseAccess'

/** Clinic staff / clinic manager who receive Marketing handoffs */
export function canReceiveMarketingHandoffs(role: string | undefined | null): boolean {
  if (!role) return false
  return (
    role === 'SUPER_ADMIN' ||
    role === 'HQ_ADMIN' ||
    role === 'BRANCH_ADMIN' ||
    role === 'RECEPTIONIST' ||
    role === 'STAFF' ||
    role === 'DOCTOR' ||
    role === 'NURSE' ||
    role === 'AESTHETICIAN'
  )
}

export function useMarketingHandoffUnread() {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)
  const enabled = canReceiveMarketingHandoffs(user?.role)

  useEffect(() => {
    if (!enabled || !user) {
      setUnread(0)
      return
    }
    const branchScope =
      isBranchOwner(user) || isTimeclockStaff(user) ? user.branchId ?? null : 'all'

    async function refresh() {
      try {
        const rows = await listMarketingHandoffs(branchScope === 'all' ? null : branchScope)
        setUnread(countUnreadHandoffs(rows, branchScope))
      } catch {
        setUnread(0)
      }
    }

    void refresh()
    return subscribeMarketingLeads(() => {
      void refresh()
    })
  }, [enabled, user])

  return { unread, enabled }
}
