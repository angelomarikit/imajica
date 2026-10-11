import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Filter, Search } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import {
  defaultAnalyticsRange,
  exportCsv,
  filterSalesByDate,
  salesSummary,
} from '@/services/analyticsService'
import {
  getSales,
  preloadSalesData,
  subscribeSalesData,
} from '@/services/salesService'
import type { AnalyticsSaleType, Sale } from '@/types'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'
import { useAuth } from '@/contexts/AuthContext'
import { isFranchiseBranchOwner } from '@/utils/franchiseAccess'

type TypeFilter = 'all' | AnalyticsSaleType

/** Manila calendar YYYY-MM-DD */
function manilaDate(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function defaultFranchiseRange() {
  const to = manilaDate()
  const from = `${to.slice(0, 8)}01`
  return { from, to }
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isMigrationSale(s: Sale) {
  return (s.leadSource || '').trim().toLowerCase() === 'migration'
}

function typeBadge(type: AnalyticsSaleType | undefined) {
  if (type === 'product') return <Badge variant="neutral">Product</Badge>
  if (type === 'package') return <Badge variant="purple">Package</Badge>
  return <Badge variant="success">Service</Badge>
}

function paymentLabel(sale: Sale) {
  const raw = (sale.paymentType || 'Full Payment').trim()
  if (/payment$/i.test(raw)) return raw
  return `${raw} Payment`
}

export function PaymentsPage() {
  const { user } = useAuth()
  const forcedBranchId = useForcedBranchId()
  const franchiseOwner = isFranchiseBranchOwner(user)
  const initialRange = franchiseOwner ? defaultFranchiseRange() : defaultAnalyticsRange()

  const [salesTick, setSalesTick] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fromDraft, setFromDraft] = useState(initialRange.from)
  const [toDraft, setToDraft] = useState(initialRange.to)
  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void preloadSalesData(
      forcedBranchId ? { branchId: forcedBranchId, skipImported: true } : undefined,
    ).finally(() => {
      if (!cancelled) {
        setSalesTick((n) => n + 1)
        setLoading(false)
      }
    })
    return subscribeSalesData(() => {
      if (!cancelled) {
        setSalesTick((n) => n + 1)
        setLoading(false)
      }
    })
  }, [forcedBranchId])

  const opsSales = useMemo(() => {
    void salesTick
    return getSales().filter((s) => {
      if (isMigrationSale(s)) return false
      if (forcedBranchId && s.branchId !== forcedBranchId) return false
      return true
    })
  }, [forcedBranchId, salesTick])

  const summary = useMemo(() => salesSummary(opsSales, from, to), [opsSales, from, to])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return summary.rows
      .filter((s) => {
        if (typeFilter !== 'all' && s.itemType !== typeFilter) return false
        if (!q) return true
        return (
          s.clientName.toLowerCase().includes(q) ||
          s.treatmentOrPackage.toLowerCase().includes(q) ||
          (s.staffName || '').toLowerCase().includes(q) ||
          s.branchName.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [summary.rows, typeFilter, query])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  function applyFilter() {
    setFrom(fromDraft)
    setTo(toDraft)
    setPage(1)
  }

  function applySearch() {
    setQuery(queryDraft.trim())
    setPage(1)
  }

  function handleExport() {
    exportCsv(
      `imajica-franchise-sales-${from}-${to}.csv`,
      [
        'Service/Product',
        'Customer',
        'Staff',
        'Amount',
        'Type',
        'Payment',
        'Status',
        'Branch',
        'Date',
      ],
      filteredRows.map((s) => [
        s.treatmentOrPackage,
        s.clientName,
        s.staffName || '',
        String(s.totalAmount),
        s.itemType || 'service',
        paymentLabel(s),
        s.status,
        s.branchName,
        s.createdAt.slice(0, 10),
      ]),
    )
    toast.success('Exported franchise sales')
  }

  const title = franchiseOwner ? 'Franchise Sales' : 'Payments'
  const description = franchiseOwner
    ? `Live clinic sales for ${user?.branchName ?? 'your branch'} (migration installments stay on client profiles).`
    : 'Review booking payments and clinic sales invoices.'

  return (
    <div className="space-y-5">
      <AdminPageBanner
        eyebrow="Sales"
        title={title}
        description={description}
        stat={{ value: summary.bookings, label: 'Total Bookings' }}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total Sales" value={formatPesoExact(summary.grossSales)} />
        <KpiCard label="Product Sales" value={formatPesoExact(summary.productSales)} />
        <KpiCard label="Service Sales" value={formatPesoExact(summary.serviceSales)} />
        <KpiCard
          label="Booking Sales (Services + Packages)"
          value={formatPesoExact(summary.serviceSales)}
        />
        <KpiCard label="Total Bookings" value={String(summary.bookings)} />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-ui">
            Show
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="ml-1 rounded-[8px] border border-border bg-white px-2 py-2 text-sm text-[#073D2C]"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>{' '}
            entries
          </label>

          <label className="text-xs text-slate-ui">
            From
            <input
              type="date"
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
              className="mt-1 block rounded-[8px] border border-border bg-white px-3 py-2 text-sm text-[#073D2C]"
            />
          </label>
          <label className="text-xs text-slate-ui">
            To
            <input
              type="date"
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
              className="mt-1 block rounded-[8px] border border-border bg-white px-3 py-2 text-sm text-[#073D2C]"
            />
          </label>
          <Button type="button" variant="secondary" onClick={applyFilter} className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </Button>

          <label className="text-xs text-slate-ui">
            Sales
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as TypeFilter)
                setPage(1)
              }}
              className="mt-1 block rounded-[8px] border border-border bg-white px-3 py-2 text-sm text-[#073D2C]"
            >
              <option value="all">All Sales</option>
              <option value="service">Services</option>
              <option value="package">Packages</option>
              <option value="product">Products</option>
            </select>
          </label>

          <Button type="button" onClick={handleExport} className="gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export
          </Button>

          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
            <input
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="Search sales..."
              className="w-full rounded-[8px] border border-border bg-white py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Service / Product</th>
                <th className="px-2 py-3">Customer</th>
                <th className="px-2 py-3">Staff</th>
                <th className="px-2 py-3">Amount</th>
                <th className="px-2 py-3">Type</th>
                <th className="px-2 py-3">Payment</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Branch</th>
                <th className="px-2 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-2 py-8 text-center text-slate-ui">
                    Loading franchise sales…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-2 py-8 text-center text-slate-ui">
                    No sales in this range.
                  </td>
                </tr>
              ) : (
                pageRows.map((s) => <TransactionRow key={s.id} sale={s} />)
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-ui">
          <span>
            Showing {(safePage - 1) * pageSize + (pageRows.length ? 1 : 0)}–
            {Math.min(safePage * pageSize, filteredRows.length)} of {filteredRows.length}
            {filterSalesByDate(opsSales, from, to).length !== filteredRows.length
              ? ` (filtered)`
              : ''}
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {Array.from({ length: Math.min(pageCount, 12) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={cn(
                  'min-w-8 rounded-[6px] px-2 py-1 text-xs font-semibold transition',
                  n === safePage
                    ? 'bg-[#073D2C] text-white'
                    : 'border border-border bg-white text-[#073D2C] hover:bg-ivory-100',
                )}
              >
                {n}
              </button>
            ))}
            {pageCount > 12 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={safePage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">{label}</p>
      <p className="mt-2 font-metric text-xl font-semibold tracking-tight text-[#073D2C] sm:text-2xl">
        {value}
      </p>
    </Card>
  )
}

function TransactionRow({ sale: s }: { sale: Sale }) {
  return (
    <tr className="border-t border-border/70 hover:bg-ivory-100">
      <td className="px-2 py-3 font-semibold uppercase text-[#073D2C]">{s.treatmentOrPackage}</td>
      <td className="px-2 py-3 font-medium text-[#073D2C]">{s.clientName}</td>
      <td className="px-2 py-3 text-slate-ui">{s.staffName || '—'}</td>
      <td className="px-2 py-3 font-semibold">{formatPesoExact(s.totalAmount)}</td>
      <td className="px-2 py-3">{typeBadge(s.itemType)}</td>
      <td className="px-2 py-3">
        <Badge variant="success">{paymentLabel(s)}</Badge>
      </td>
      <td className="px-2 py-3">
        <Badge variant={s.status === 'paid' ? 'success' : 'warning'}>
          {s.status === 'paid' ? 'Paid' : s.status === 'pending' ? 'Pending' : s.status}
        </Badge>
      </td>
      <td className="px-2 py-3">{s.branchName}</td>
      <td className="px-2 py-3 text-slate-ui">{formatShortDate(s.createdAt)}</td>
    </tr>
  )
}
