import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { preloadCatalogFromSupabase } from '@/services/catalogService'
import { preloadCatalogPriceOverrides } from '@/services/catalogPriceOverrideService'
import { preloadCatalogProductsFromSupabase } from '@/services/productCatalogService'
import { refreshRemoteSalesAfterAuth } from '@/services/salesService'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { isBranchScopedStaff } from '@/utils/franchiseAccess'

/** Loads catalog overrides + product prices from Supabase + ops sales warm-cache after login. */
export function SalesDataBootstrap() {
  const { user } = useAuth()
  const bootedOverrides = useRef(false)

  useEffect(() => {
    if (bootedOverrides.current) return
    bootedOverrides.current = true
    void preloadCatalogPriceOverrides()
    void preloadCatalogProductsFromSupabase()
    void preloadCatalogFromSupabase()
  }, [])

  // Ops-only warm cache (last ~90 days). Never JSON dump / Migration history.
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
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.role, user?.branchId])

  return null
}
