import { useEffect, useState } from 'react'
import { useBranch } from '@/contexts/BranchContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { isSupabaseConfigured } from '@/lib/supabase'
import {
  fetchBookingPipeline,
  type BookingPipelineRow,
} from '@/services/bookingPipelineService'

/** Clinic filter for the pipeline: locked branch, header selection, or all assigned clinics. */
export function usePipelineBranchId(): string | null {
  const forced = useForcedBranchId()
  const { selectedBranchId } = useBranch()
  if (forced) return forced
  if (!selectedBranchId || selectedBranchId === 'all') return null
  return selectedBranchId
}

export function useBookingPipeline(from: string, to: string, branchId: string | null) {
  const [rows, setRows] = useState<BookingPipelineRow[]>([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !from || !to) {
      setRows([])
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchBookingPipeline({ from, to, branchId })
      .then((next) => {
        if (!cancelled) setRows(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRows([])
          setError(err instanceof Error ? err.message : 'Could not load bookings')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [from, to, branchId])

  return { rows, loading, error, configured: isSupabaseConfigured }
}
