import {
  BOOKING_BUCKETS,
  isBookingBucket,
  type BookingBucket,
} from '@/constants/bookingPipeline'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export type BookingPipelineRow = {
  appointmentId: string
  branchId: string
  branchName: string
  startAt: string
  status: string
  bucket: BookingBucket
  clientId: string
  clientName: string
  phone: string
  isNew: boolean
}

export type BranchBookingTotal = {
  branchId: string
  branchName: string
  total: number
}

export type ClientSplit = {
  newClients: number
  returningClients: number
}

export function manilaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(date)
}

export function defaultPipelineRange() {
  const to = manilaDateKey()
  return { from: `${to.slice(0, 8)}01`, to }
}

export function pipelineHref(
  base: string,
  params: { from: string; to: string; bucket?: BookingBucket },
) {
  const q = new URLSearchParams({ from: params.from, to: params.to })
  if (params.bucket) q.set('bucket', params.bucket)
  return `${base}?${q.toString()}`
}

export async function fetchBookingPipeline(input: {
  from: string
  to: string
  branchId?: string | null
}): Promise<BookingPipelineRow[]> {
  if (!isSupabaseConfigured || !supabase) return []
  const { data, error } = await supabase.rpc('marketing_booking_pipeline', {
    p_from: input.from,
    p_to: input.to,
    p_branch_id: input.branchId || null,
  })
  if (error) throw new Error(error.message)
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => {
    const bucketRaw = String(row.bucket ?? 'pending')
    return {
      appointmentId: String(row.appointment_id),
      branchId: String(row.branch_id),
      branchName: String(row.branch_name ?? 'Clinic'),
      startAt: String(row.start_at),
      status: String(row.status ?? ''),
      bucket: isBookingBucket(bucketRaw) ? bucketRaw : 'pending',
      clientId: String(row.client_id ?? ''),
      clientName: String(row.client_name ?? 'Client'),
      phone: String(row.phone ?? ''),
      isNew: Boolean(row.is_new),
    }
  })
}

/** Appointment counts per clinic, sorted by clinic name. */
export function bookingsByBranch(rows: BookingPipelineRow[]): BranchBookingTotal[] {
  const map = new Map<string, BranchBookingTotal>()
  for (const row of rows) {
    const current = map.get(row.branchId)
    if (current) current.total += 1
    else map.set(row.branchId, { branchId: row.branchId, branchName: row.branchName, total: 1 })
  }
  return [...map.values()].sort((a, b) => a.branchName.localeCompare(b.branchName))
}

/**
 * Distinct clients in the range.
 * A client is new when their earliest booking in the range is their first non-cancelled visit.
 */
export function clientSplit(rows: BookingPipelineRow[]): ClientSplit {
  const earliest = new Map<string, BookingPipelineRow>()
  for (const row of rows) {
    if (!row.clientId) continue
    const prev = earliest.get(row.clientId)
    if (!prev || row.startAt < prev.startAt) earliest.set(row.clientId, row)
  }
  let newClients = 0
  let returningClients = 0
  for (const row of earliest.values()) {
    if (row.isNew) newClients += 1
    else returningClients += 1
  }
  return { newClients, returningClients }
}

export function countByBucket(rows: BookingPipelineRow[]): Record<BookingBucket, number> {
  const counts = Object.fromEntries(BOOKING_BUCKETS.map((bucket) => [bucket, 0])) as Record<
    BookingBucket,
    number
  >
  for (const row of rows) counts[row.bucket] += 1
  return counts
}
