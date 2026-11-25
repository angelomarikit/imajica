import { Link } from 'react-router-dom'
import { BOOKING_BUCKET_META, BOOKING_BUCKETS, type BookingBucket } from '@/constants/bookingPipeline'
import { useBookingPipeline } from '@/hooks/useBookingPipeline'
import { countByBucket, pipelineHref } from '@/services/bookingPipelineService'
import { cn } from '@/utils/cn'

function monthBounds(monthCursor: Date) {
  const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
  const end = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0)
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { from: key(start), to: key(end) }
}

const tone: Record<BookingBucket, string> = {
  show: 'border-emerald-200 bg-emerald-50',
  cancelled: 'border-red-200 bg-red-50',
  pending: 'border-[#E8D9B8] bg-[#FBF7F0]',
  rescheduled: 'border-sky-200 bg-sky-50',
}

export function BookingStatusStrip({
  branchId,
  monthCursor,
  pipelinePath,
}: {
  branchId?: string
  monthCursor: Date
  pipelinePath: string
}) {
  const { from, to } = monthBounds(monthCursor)
  const { rows, loading, error, configured } = useBookingPipeline(from, to, branchId ?? null)
  const counts = countByBucket(rows)
  const monthLabel = monthCursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">Lead status</p>
        <h2 className="font-display text-2xl text-[#073D2C]">{monthLabel}</h2>
        <p className="text-sm text-slate-ui">
          Show stays with the clinic. Cancelled, pending, and rescheduled stay with CSR.
        </p>
      </div>

      {!branchId ? (
        <p className="text-sm text-slate-ui">Select a clinic to see lead status.</p>
      ) : !configured ? (
        <p className="text-sm text-slate-ui">Connect Supabase to load lead status for this month.</p>
      ) : loading ? (
        <p className="text-sm text-slate-ui">Loading lead status…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {BOOKING_BUCKETS.map((bucket) => {
            const meta = BOOKING_BUCKET_META[bucket]
            return (
              <article key={bucket} className={cn('rounded-[12px] border p-4', tone[bucket])}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#073D2C]/70">
                      {meta.label}
                    </p>
                    <p className="font-metric text-3xl font-semibold text-[#073D2C]">{counts[bucket]}</p>
                  </div>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#073D2C]">
                    {meta.owner}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#073D2C]/80">{meta.ownerNote}</p>
                {meta.script ? (
                  <p className="mt-3 border-t border-black/5 pt-3 text-sm leading-relaxed text-[#073D2C]">
                    <span className="font-semibold">Script. </span>
                    {meta.script}
                  </p>
                ) : null}
                <Link
                  to={pipelineHref(pipelinePath, { from, to, bucket })}
                  className="mt-3 inline-block text-xs font-semibold text-emerald-800 hover:underline"
                >
                  View clients
                </Link>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
