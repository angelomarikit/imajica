import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { preloadCatalogPriceOverrides } from '@/services/catalogPriceOverrideService'
import { preloadSalesData, refreshRemoteSalesAfterAuth } from '@/services/salesService'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { isBranchScopedStaff } from '@/utils/franchiseAccess'

/** Loads catalog overrides + remote sales after a real staff session exists. */
export function SalesDataBootstrap() {
  const { user } = useAuth()
  const bootedOverrides = useRef(false)

  useEffect(() => {
    if (bootedOverrides.current) return
    bootedOverrides.current = true
    void preloadCatalogPriceOverrides()
  }, [])

  // Wait for auth — a pre-login empty fetch used to leave clinic dashboards at ₱0.
  // Clinic staff: ops-only refresh (excludes Migration dump). HQ keeps fuller preload.
  useEffect(() => {
    if (!user || user.role === 'CLIENT') return
    let cancelled = false
    void (async () => {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession()
        if (!data.session || cancelled) return
      }
      const branchId = isBranchScopedStaff(user) ? user.branchId : undefined
      await refreshRemoteSalesAfterAuth(branchId)
      if (cancelled) return
      if (!branchId) {
        await preloadSalesData()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.role, user?.branchId])

  return null
}
