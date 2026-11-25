import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BOOKING_BUCKET_META, BOOKING_BUCKETS } from '@/constants/bookingPipeline'
import { useBookingPipeline, usePipelineBranchId } from '@/hooks/useBookingPipeline'
import {
  bookingsByBranch,
  clientSplit,
  countByBucket,
  defaultPipelineRange,
  pipelineHref,
} from '@/services/bookingPipelineService'
import { Card } from '@/components/ui/Card'

export function BookingPipelineSummary({ pipelinePath }: { pipelinePath: string }) {
  const initial = defaultPipelineRange()
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const branchId = usePipelineBranchId()
  const { rows, loading, error, configured } = useBookingPipeline(from, to, branchId)
  const branches = bookingsByBranch(rows)
  const split = clientSplit(rows)
  const buckets = countByBucket(rows)
  const total = rows.length

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">Bookings</p>
          <h2 className="font-display text-2xl text-[#073D2C]">Total bookings by clinic</h2>
          <p className="mt-1 text-sm text-slate-ui">
            Counts use the appointment date in Philippine time.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-slate-ui">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block h-10 rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal"
            />
          </label>
          <label className="text-xs font-medium text-slate-ui">
            To
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block h-10 rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal"
            />
          </label>
        </div>
      </div>

      {!configured ? (
        <p className="mt-4 text-sm text-slate-ui">
          Connect Supabase to load live bookings for each clinic.
        </p>
      ) : loading ? (
        <p className="mt-4 text-sm text-slate-ui">Loading bookings…</p>
      ) : error ? (
        <p className="mt-4 text-sm text-red-700">{error}</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
          <div className="overflow-hidden rounded-[12px] border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FBF7F0] text-[11px] font-bold uppercase tracking-wide text-[#8a6d2f]">
                <tr>
                  <th className="px-4 py-2.5">Clinic</th>
                  <th className="px-4 py-2.5 text-right">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-slate-ui">
                      No bookings in this date range.
                    </td>
                  </tr>
                ) : (
                  branches.map((branch) => (
                    <tr key={branch.branchId} className="border-t border-border">
                      <td className="px-4 py-3 font-medium text-[#073D2C]">{branch.branchName}</td>
                      <td className="px-4 py-3 text-right font-metric text-lg text-charcoal">
                        {branch.total}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {branches.length > 0 ? (
                <tfoot>
                  <tr className="border-t border-border bg-ivory-100/60">
                    <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-ui">
                      All clinics in view
                    </td>
                    <td className="px-4 py-3 text-right font-metric text-lg font-semibold text-[#073D2C]">
                      {total}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">
                New clients
              </p>
              <p className="mt-1 font-metric text-3xl font-semibold text-[#073D2C]">{split.newClients}</p>
              <p className="mt-1 text-xs text-emerald-900/80">
                First non-cancelled visit falls in this range.
              </p>
            </div>
            <div className="rounded-[12px] border border-[#E8D9B8] bg-[#FBF7F0] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a6d2f]">
                Returning clients
              </p>
              <p className="mt-1 font-metric text-3xl font-semibold text-[#073D2C]">
                {split.returningClients}
              </p>
              <p className="mt-1 text-xs text-[#8a6d2f]">
                Already had an earlier visit before this booking.
              </p>
            </div>
            <Link
              to={pipelineHref(pipelinePath, { from, to })}
              className="text-sm font-semibold text-emerald-800 hover:underline"
            >
              Open clients by status
            </Link>
            <div className="flex flex-wrap gap-2 text-xs text-slate-ui">
              {BOOKING_BUCKETS.map((bucket) => (
                <Link
                  key={bucket}
                  to={pipelineHref(pipelinePath, { from, to, bucket })}
                  className="rounded-full border border-border bg-white px-2.5 py-1 hover:border-emerald-800/40"
                >
                  {BOOKING_BUCKET_META[bucket].shortLabel} {buckets[bucket]}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
