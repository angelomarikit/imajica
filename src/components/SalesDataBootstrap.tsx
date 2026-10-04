import { useEffect } from 'react'
import { preloadCatalogPriceOverrides } from '@/services/catalogPriceOverrideService'
import { preloadSalesData } from '@/services/salesService'

/** Loads imported sales JSON + catalog price overrides on app start */
export function SalesDataBootstrap() {
  useEffect(() => {
    void preloadSalesData()
    void preloadCatalogPriceOverrides()
  }, [])
  return null
}
