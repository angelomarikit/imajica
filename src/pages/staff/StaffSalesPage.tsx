import { useEffect, useMemo, useState } from 'react'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  defaultAnalyticsRange,
  getAnalyticsSales,
  subscribeAnalytics,
} from '@/services/analyticsService'
import { preloadSalesData } from '@/services/salesService'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'

type StaffSaleRow = {
  rank: number
  staffName: string
  bookingCount: number
  totalSales: number
}

export function StaffSalesPage() {
  const range = defaultAnalyticsRange()
  const [fromDraft, setFromDraft] = useState(range.from)
  const [toDraft, setToDraft] = useState(range.to)
  const [from, setFrom] = useState(range.from)
  const [to, setTo] = useState(range.to)
  const [tick, setTick] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void preloadSalesData().then(() => {
      if (!cancelled) {
        setTick((n) => n + 1)
        setLoading(false)
      }
    })
    return subscribeAnalytics(() => setTick((n) => n + 1))
  }, [])

  const rows = useMemo(() => {
    void tick
    const sales = getAnalyticsSales().filter((s) => {
      const d = s.createdAt.slice(0, 10)
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })

    const map = new Map<string, { bookingCount: number; totalSales: number }>()
    for (const s of sales) {
      const key = (s.staffName || '').trim() || 'Unknown Unknown'
      const existing = map.get(key)
      if (existing) {
        existing.bookingCount += 1
        existing.totalSales += s.totalAmount
      } else {
        map.set(key, { bookingCount: 1, totalSales: s.totalAmount })
      }
    }

    return [...map.entries()]
      .map(([staffName, stats]) => ({ staffName, ...stats }))
      .sort((a, b) => b.bookingCount - a.bookingCount || b.totalSales - a.totalSales)
      .map((r, i): StaffSaleRow => ({ ...r, rank: i + 1 }))
  }, [from, to, tick])

  function applyFilter() {
    setFrom(fromDraft)
    setTo(toDraft)
  }

  function clearFilter() {
    setFromDraft(range.from)
    setToDraft(range.to)
    setFrom(range.from)
    setTo(range.to)
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Staff Sales Ranking"
        description="Leaderboard statement detailing staff performance based on total bookings and sales."
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-ui">
            From Date
            <input
              type="date"
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
              className="mt-1 block min-w-[160px] rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-ui">
            To Date
            <input
              type="date"
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
              className="mt-1 block min-w-[160px] rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <Button type="button" onClick={applyFilter} className="min-w-[120px]">
            Filter
          </Button>
          <Button type="button" variant="secondary" onClick={clearFilter}>
            Clear
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                  Rank
                </th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                  Staff Name
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                  Booking Count
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                  Total Sales
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-ui">
                    Loading staff sales…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-ui">
                    No staff sales in this range.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={`${r.rank}-${r.staffName}`} className="border-t border-border/60">
                    <td className="px-5 py-4 align-middle">
                      <RankBadge rank={r.rank} />
                    </td>
                    <td className="px-5 py-4 align-middle text-[15px] text-[#0a0a0a]">
                      {r.staffName}
                    </td>
                    <td className="px-5 py-4 text-right align-middle">
                      <span className="inline-flex min-w-[3.25rem] items-center justify-center rounded-md bg-[#eceff3] px-2.5 py-1 text-sm tabular-nums text-[#334155]">
                        {r.bookingCount}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right align-middle text-[15px] tabular-nums text-[#0a0a0a]">
                      {formatPesoExact(r.totalSales)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold',
          rank === 1 && 'border-[#e8c547] text-[#b8860b]',
          rank === 2 && 'border-[#c5c9ce] text-[#6b7280]',
          rank === 3 && 'border-[#e0a060] text-[#c2410c]',
        )}
      >
        {rank}
      </span>
    )
  }
  return <span className="pl-2.5 text-sm text-slate-600">{rank}</span>
}
