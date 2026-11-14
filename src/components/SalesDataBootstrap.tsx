import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { preloadCatalogFromSupabase } from '@/services/catalogService'
import { preloadCatalogPriceOverrides } from '@/services/catalogPriceOverrideService'
import { preloadCatalogProductsFromSupabase } from '@/services/productCatalogService'
import { refreshRemoteSalesAfterAuth } from '@/services/salesService'
import { preloadExpensesFromSupabase } from '@/services/expenseService'
import { preloadGeneratedForms } from '@/services/imajicaFormsService'
import { isHqRole, isOperationsManagerRole, isBranchScopedStaff } from '@/utils/franchiseAccess'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

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
      const orgWide = isHqRole(user.role) || isOperationsManagerRole(user.role)
      await Promise.all([
        refreshRemoteSalesAfterAuth(branchId),
        preloadExpensesFromSupabase(branchId ? { branchId } : undefined),
        preloadGeneratedForms(
          orgWide
            ? { orgWide: true }
            : branchId
              ? { branchId, orgWide: false }
              : { orgWide: false },
        ),
      ])
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.role, user?.branchId])

  return null
}
