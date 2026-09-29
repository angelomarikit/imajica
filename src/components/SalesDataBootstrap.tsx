import { useEffect } from 'react'
import { preloadSalesData } from '@/services/salesService'

/** Loads imported sales JSON + syncs customers on app start */
export function SalesDataBootstrap() {
  useEffect(() => {
    void preloadSalesData()
  }, [])
  return null
}
