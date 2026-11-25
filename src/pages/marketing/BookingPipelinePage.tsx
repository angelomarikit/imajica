import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import {
  BOOKING_BUCKET_META,
  BOOKING_BUCKETS,
  formatAppointmentStatus,
  isBookingBucket,
  type BookingBucket,
} from '@/constants/bookingPipeline'
import { useBookingPipeline, usePipelineBranchId } from '@/hooks/useBookingPipeline'
import { countByBucket, defaultPipelineRange } from '@/services/bookingPipelineService'

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const badgeVariant: Record<BookingBucket, 'success' | 'danger' | 'warning' | 'info'> = {
  show: 'success',
  cancelled: 'danger',
  pending: 'warning',
  rescheduled: 'info',
}

export function BookingPipelinePage() {
  const initial = defaultPipelineRange()
  const [params, setParams] = useSearchParams()
  const from = params.get('from') || initial.from
  const to = params.get('to') || initial.to
  const bucketParam = params.get('bucket')
  const bucket: BookingBucket = isBookingBucket(bucketParam) ? bucketParam : 'show'
  const branchId = usePipelineBranchId()
  const { rows, loading, error, configured } = useBookingPipeline(from, to, branchId)
  const counts = countByBucket(rows)
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (row.bucket !== bucket) return false
      if (!q) return true
      return (
        row.clientName.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q) ||
        row.branchName.toLowerCase().includes(q)
      )
    })
  }, [rows, bucket, query])

  function setRange(nextFrom: string, nextTo: string) {
    const next = new URLSearchParams(params)
    next.set('from', nextFrom)
    next.set('to', nextTo)
    setParams(next, { replace: true })
  }

  function setBucket(next: string) {
    const nextParams = new URLSearchParams(params)
    nextParams.set('bucket', next)
    if (!nextParams.get('from')) nextParams.set('from', from)
    if (!nextParams.get('to')) nextParams.set('to', to)
    setParams(nextParams, { replace: true })
  }

  const meta = BOOKING_BUCKET_META[bucket]

  return (
    <div className="space-y-5">
      <AdminPageBanner
        eyebrow="Clients"
        title="Clients by status"
        description="Each booking in the date range, grouped by what happens next. Show belongs to the clinic. Cancelled, pending, and rescheduled belong to CSR."
        stat={{ value: rows.length, label: 'Bookings in range' }}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-slate-ui">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setRange(e.target.value, to)}
              className="mt-1 block h-10 rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal"
            />
          </label>
          <label className="text-xs font-medium text-slate-ui">
            To
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setRange(from, e.target.value)}
              className="mt-1 block h-10 rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal"
            />
          </label>
        </div>
        <label className="text-xs font-medium text-slate-ui">
          Search
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, phone, or clinic"
            className="mt-1 block h-10 w-64 max-w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal"
          />
        </label>
      </div>

      <Tabs
        value={bucket}
        onChange={setBucket}
        items={BOOKING_BUCKETS.map((id) => ({
          id,
          label: `${BOOKING_BUCKET_META[id].label} (${counts[id]})`,
        }))}
      />

      <div className="rounded-[12px] border border-border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badgeVariant[bucket]}>{meta.owner}</Badge>
          <p className="text-sm text-[#073D2C]">{meta.ownerNote}</p>
        </div>
        {meta.script ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-ui">
            <span className="font-semibold text-[#073D2C]">CSR script. </span>
            {meta.script}
          </p>
        ) : null}
      </div>

      {!configured ? (
        <p className="text-sm text-slate-ui">Connect Supabase to load clients for this status.</p>
      ) : loading ? (
        <p className="text-sm text-slate-ui">Loading clients…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : visible.length === 0 ? (
        <p className="rounded-[12px] border border-dashed border-border px-4 py-10 text-center text-sm text-slate-ui">
          No {meta.label.toLowerCase()} clients in this date range.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-border bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#FBF7F0] text-[11px] font-bold uppercase tracking-wide text-[#8a6d2f]">
              <tr>
                <th className="px-4 py-2.5">Client</th>
                <th className="px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5">Clinic</th>
                <th className="px-4 py-2.5">Appointment</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Owner</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.appointmentId} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#073D2C]">{row.clientName}</p>
                    <p className="text-xs text-slate-ui">{row.isNew ? 'New client' : 'Returning client'}</p>
                  </td>
                  <td className="px-4 py-3 text-charcoal">{row.phone || '—'}</td>
                  <td className="px-4 py-3 text-charcoal">{row.branchName}</td>
                  <td className="px-4 py-3 text-charcoal">{formatWhen(row.startAt)}</td>
                  <td className="px-4 py-3 capitalize text-charcoal">
                    {formatAppointmentStatus(row.status)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={badgeVariant[row.bucket]}>{meta.owner}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
