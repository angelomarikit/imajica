import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { preloadCatalogPriceOverrides } from '@/services/catalogPriceOverrideService'
import { preloadSalesData, refreshRemoteSalesAfterAuth } from '@/services/salesService'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

/** Loads imported sales JSON + catalog price overrides; refreshes remote sales after auth. */
export function SalesDataBootstrap() {
  const { user } = useAuth()
  const bootedJson = useRef(false)

  useEffect(() => {
    if (bootedJson.current) return
    bootedJson.current = true
    void preloadSalesData()
    void preloadCatalogPriceOverrides()
  }, [])

  // SalesDataBootstrap used to run outside AuthProvider — empty RLS result wiped remote sales.
  // After a real staff session exists, pull the full remote set.
  useEffect(() => {
    if (!user || user.role === 'CLIENT') return
    let cancelled = false
    void (async () => {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession()
        if (!data.session || cancelled) return
      }
      await refreshRemoteSalesAfterAuth()
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.role])

  return null
}
