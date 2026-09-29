import { useEffect, useMemo, useState } from 'react'
import {
  DollarSign,
  FileSpreadsheet,
  Filter,
  Megaphone,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  defaultAnalyticsRange,
  exportCsv,
  getAnalyticsSales,
  getNewClientSalesRows,
  subscribeAnalytics,
} from '@/services/analyticsService'
import { preloadSalesData } from '@/services/salesService'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'

const LEAD_CHANNELS = ['all', 'Walk-In', 'Facebook', 'Instagram', 'Referral'] as const

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function leadBadge(source: string) {
  if (source === 'Facebook') return <Badge variant="info">Facebook</Badge>
  if (source === 'Instagram') return <Badge variant="purple">Instagram</Badge>
  if (source === 'Referral') return <Badge variant="orange">Referral</Badge>
  return <Badge variant="success">Walk-In</Badge>
}

export function NewClientSalesPage() {
  const range = defaultAnalyticsRange()
  const [sales, setSales] = useState(() => getAnalyticsSales())
  const [fromDraft, setFromDraft] = useState(range.from)
  const [toDraft, setToDraft] = useState(range.to)
  const [from, setFrom] = useState(range.from)
  const [to, setTo] = useState(range.to)
  const [leadDraft, setLeadDraft] = useState('all')
  const [lead, setLead] = useState('all')
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    void preloadSalesData().then(() => {
      if (!cancelled) setSales(getAnalyticsSales())
    })
    return subscribeAnalytics(() => {
      if (!cancelled) setSales(getAnalyticsSales())
    })
  }, [])

  const rows = useMemo(
    () => getNewClientSalesRows(sales, from, to, lead),
    [sales, from, to, lead],
  )

  const filtered = useMemo(() => {
    if (!query) return rows
    const q = query.toLowerCase()
    return rows.filter(
      (r) =>
        r.customerName.toLowerCase().includes(q) ||
        r.bookingRef.toLowerCase().includes(q) ||
        r.availed.toLowerCase().includes(q),
    )
  }, [rows, query])

  const totalSales = filtered.reduce((s, r) => s + r.amountPaid, 0)
  const topLead = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of filtered) {
      counts.set(r.leadSource, (counts.get(r.leadSource) || 0) + 1)
    }
    let best = 'Walk-In'
    let max = 0
    for (const [k, v] of counts) {
      if (v > max) {
        max = v
        best = k
      }
    }
    return best
  }, [filtered])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  function applyFilter() {
    setFrom(fromDraft)
    setTo(toDraft)
    setLead(leadDraft)
    setPage(1)
  }

  function resetFilters() {
    setFromDraft(range.from)
    setToDraft(range.to)
    setLeadDraft('all')
    setFrom(range.from)
    setTo(range.to)
    setLead('all')
    setQueryDraft('')
    setQuery('')
    setPage(1)
  }

  function handleExport() {
    exportCsv(
      `imajica-new-client-sales-${from}-${to}.csv`,
      [
        'First Booking Date',
        'Customer',
        'Booking Ref',
        'Availed',
        'Lead Source',
        'Staff',
        'Amount',
        'Payment Type',
        'Status',
        'Branch',
      ],
      filtered.map((r) => [
        r.firstBookingDate,
        r.customerName,
        r.bookingRef,
        r.availed,
        r.leadSource,
        r.staffName,
        String(r.amountPaid),
        r.paymentType,
        r.status,
        r.branchName,
      ]),
    )
    toast.success('Exported new client sales')
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            New Client Sales Report
            <span className="rounded-full bg-violet-500/90 px-3 py-1 font-sans text-[11px] font-semibold uppercase tracking-wide text-white">
              First-Time Clients
            </span>
          </span>
        }
        description="Track newly acquired clients, their first availed services, payment amounts, and marketing lead channels."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
              New Clients
            </p>
            <p className="mt-1 font-metric text-2xl font-semibold tracking-tight text-[#073D2C]">{filtered.length}</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-800">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
              Total First Sales
            </p>
            <p className="mt-1 font-metric text-2xl font-semibold tracking-tight text-[#073D2C]">
              {formatPesoExact(totalSales)}
            </p>
          </div>
        </Card>
        <Card className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-800">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
              Top Lead Source
            </p>
            <p className="mt-1 font-display text-2xl text-[#073D2C]">{topLead}</p>
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-ui">
            Start Date
            <input
              type="date"
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
              className="mt-1 block rounded-[8px] border border-border bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-slate-ui">
            End Date
            <input
              type="date"
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
              className="mt-1 block rounded-[8px] border border-border bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-slate-ui">
            Lead Source Channel
            <select
              value={leadDraft}
              onChange={(e) => setLeadDraft(e.target.value)}
              className="mt-1 block min-w-[160px] rounded-[8px] border border-border bg-white px-3 py-2 text-sm"
            >
              {LEAD_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Channels' : c}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" onClick={applyFilter} className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </Button>
          <button
            type="button"
            aria-label="Reset filters"
            title="Reset filters"
            onClick={resetFilters}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-[#073D2C] hover:bg-ivory-100"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl text-[#073D2C]">First-Time Client Bookings</h2>
          <Button type="button" onClick={handleExport} className="gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export Excel
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-slate-ui">
            {pageSize} entries per page
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="ml-1 rounded-[8px] border border-border bg-white px-2 py-2 text-sm"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
            <input
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setQuery(queryDraft.trim())
                  setPage(1)
                }
              }}
              placeholder="Search customer or booking..."
              className="w-full rounded-[8px] border border-border bg-white py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <Button
            type="button"
            onClick={() => {
              setQuery(queryDraft.trim())
              setPage(1)
            }}
          >
            Search
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">First Booking Date</th>
                <th className="px-2 py-3">Customer Name</th>
                <th className="px-2 py-3">Availed Services / Products</th>
                <th className="px-2 py-3">Lead Source</th>
                <th className="px-2 py-3">Staff</th>
                <th className="px-2 py-3">Amount Paid</th>
                <th className="px-2 py-3">Payment Type</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Branch</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr
                  key={`${r.bookingRef}-${r.customerName}`}
                  className="border-t border-border/70 hover:bg-ivory-100"
                >
                  <td className="px-2 py-3 text-slate-ui">
                    {formatShortDate(r.firstBookingDate)}
                  </td>
                  <td className="px-2 py-3">
                    <p className="font-semibold uppercase text-[#073D2C]">{r.customerName}</p>
                    <p className="text-[11px] text-slate-ui">Booking #{r.bookingRef}</p>
                  </td>
                  <td className="px-2 py-3">{r.availed}</td>
                  <td className="px-2 py-3">{leadBadge(r.leadSource)}</td>
                  <td className="px-2 py-3">{r.staffName}</td>
                  <td className="px-2 py-3 font-semibold">{formatPesoExact(r.amountPaid)}</td>
                  <td className="px-2 py-3">{r.paymentType}</td>
                  <td className="px-2 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        r.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800',
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-2 py-3">{r.branchName}</td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-2 py-8 text-center text-slate-ui">
                    No first-time client sales in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-ui">
          <span>
            Showing {(page - 1) * pageSize + (pageRows.length ? 1 : 0)}–
            {Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
