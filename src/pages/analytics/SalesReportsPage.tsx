import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Box,
  CalendarDays,
  FileSpreadsheet,
  Filter,
  Info,
  Package,
  Search,
  ShoppingCart,
  Star,
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
  salesSummary,
  subscribeAnalytics,
} from '@/services/analyticsService'
import { preloadSalesData, isSalesDataLoaded } from '@/services/salesService'
import type { AnalyticsSaleType, Sale } from '@/types'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'

type TypeFilter = 'all' | AnalyticsSaleType

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function typeBadge(type: AnalyticsSaleType | undefined) {
  if (type === 'product') return <Badge variant="neutral">Product</Badge>
  if (type === 'package') return <Badge variant="purple">Package</Badge>
  return <Badge variant="success">Service</Badge>
}

export function SalesReportsPage() {
  const range = defaultAnalyticsRange()
  const [sales, setSales] = useState(() => getAnalyticsSales())
  const [dataReady, setDataReady] = useState(() => isSalesDataLoaded() && getAnalyticsSales().length > 0)
  const [fromDraft, setFromDraft] = useState(range.from)
  const [toDraft, setToDraft] = useState(range.to)
  const [from, setFrom] = useState(range.from)
  const [to, setTo] = useState(range.to)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    void preloadSalesData().then(() => {
      if (!cancelled) {
        setSales(getAnalyticsSales())
        setDataReady(true)
      }
    })
    return subscribeAnalytics(() => {
      if (!cancelled) {
        setSales(getAnalyticsSales())
        setDataReady(true)
      }
    })
  }, [])

  const summary = useMemo(() => salesSummary(sales, from, to), [sales, from, to])

  const filteredRows = useMemo(() => {
    return summary.rows.filter((s) => {
      if (typeFilter !== 'all' && s.itemType !== typeFilter) return false
      if (query) {
        const q = query.toLowerCase()
        if (!s.clientName.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [summary.rows, typeFilter, query])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)

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
      `imajica-sales-transactions-${from}-${to}.csv`,
      [
        'Service/Product',
        'Booking Ref',
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
        s.bookingRef || '',
        s.clientName,
        s.staffName || '',
        String(s.totalAmount),
        s.itemType || 'service',
        s.paymentType || 'Full Payment',
        s.status,
        s.branchName,
        s.createdAt.slice(0, 10),
      ]),
    )
    toast.success('Exported sales transactions')
  }

  function handleProfitLoss() {
    toast.message('Profit-Loss snapshot', {
      description: `Net sales ${formatPesoExact(summary.netSales)} after expenses & fees.`,
    })
  }

  const typeTabs: { id: TypeFilter; label: string; icon: typeof Star }[] = [
    { id: 'all', label: 'All', icon: Filter },
    { id: 'service', label: 'Services', icon: Star },
    { id: 'package', label: 'Packages', icon: Package },
    { id: 'product', label: 'Products', icon: ShoppingCart },
  ]

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Imajica Sales Transactions"
        description="Clinic performance overview, real-time transaction tracking, staff commissions, and operational profit-loss analytics in a unified showcase presentation."
        stat={{
          value: summary.bookings.toFixed(2),
          label: 'Total Bookings',
        }}
      />

      {!dataReady ? (
        <Card className="p-6 text-center text-sm text-slate-ui">
          Loading sales transactions from import… ({sales.length.toLocaleString()} loaded so far)
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Total Sales (Included Expenses)"
          value={formatPesoExact(summary.grossSales)}
        />
        <KpiCard
          label="Product Sales"
          value={formatPesoExact(summary.productSales)}
          footer={
            <Link
              to="/admin/analytics/sales-product-report"
              className="text-xs font-medium text-sky-600 hover:underline"
            >
              Click for details
            </Link>
          }
        />
        <KpiCard label="Service Sales" value={formatPesoExact(summary.serviceSales)} />
        <KpiCard
          label="Gross Commission"
          value={formatPesoExact(summary.grossCommission)}
          footer={
            <p className="text-[11px] text-slate-ui">Select a specific branch to view commission</p>
          }
        />
        <KpiCard label="Total Bookings" value={summary.bookings.toFixed(2)} />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#073D2C]">
          <CalendarDays className="h-4 w-4 text-[#C5A059]" />
          Sales Breakdown ({from} to {to})
        </div>
        <div className="grid gap-3 lg:grid-cols-5">
          <BreakdownCard label="Gross Sales" value={formatPesoExact(summary.grossSales)} />
          <BreakdownCard
            label="Branch Expenses"
            value={`-${formatPesoExact(summary.branchExpenses)}`}
            accent="border-l-4 border-l-orange-400"
          />
          <BreakdownCard
            label="Transaction Fees"
            value={`-${formatPesoExact(summary.fees)}`}
            accent="border-l-4 border-l-amber-400"
            footer={
              <p className="mt-1 text-[11px] text-slate-ui">Credit Card (3%) &amp; QRPH (₱15)</p>
            }
          />
          <BreakdownCard
            label="Net Sales"
            value={formatPesoExact(summary.netSales)}
            accent="border-l-4 border-l-[#073D2C]"
          />
          <div className="rounded-[12px] border border-border bg-ivory-50 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-ui">
              Calculation
            </p>
            <p className="mt-2 font-mono text-xs text-[#073D2C]">
              {summary.grossSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })} −{' '}
              {summary.branchExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })} −{' '}
              {summary.fees.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-2 font-metric text-xl font-semibold tracking-tight text-[#073D2C]">
              {summary.netSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-slate-ui">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
          Branch expenses have been deducted. View{' '}
          <Link to="/admin/operations/expenses" className="font-medium text-sky-700 hover:underline">
            Operations → Expenses
          </Link>{' '}
          for details.
        </p>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-ui">
            Filter by type
          </span>
          {typeTabs.map((t) => {
            const Icon = t.icon
            const active = typeFilter === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTypeFilter(t.id)
                  setPage(1)
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  active
                    ? 'bg-[#073D2C] text-white'
                    : 'border border-border bg-white text-[#073D2C] hover:bg-ivory-100',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
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
          <Button type="button" onClick={applyFilter} className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </Button>
          <label className="text-xs text-slate-ui">
            Show
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
            </select>{' '}
            entries
          </label>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={handleExport} className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button type="button" variant="gold" onClick={handleProfitLoss} className="gap-1.5">
              <Box className="h-3.5 w-3.5" />
              Profit-Loss Report
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
            <input
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="Search customer name..."
              className="w-full rounded-[8px] border border-border bg-white py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <Button type="button" onClick={applySearch}>
            Search
          </Button>
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
              {pageRows.map((s) => (
                <TransactionRow key={s.id} sale={s} />
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-2 py-8 text-center text-slate-ui">
                    No transactions in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-ui">
          <span>
            Showing {(page - 1) * pageSize + (pageRows.length ? 1 : 0)}–
            {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}
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

function KpiCard({
  label,
  value,
  footer,
}: {
  label: string
  value: string
  footer?: ReactNode
}) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">{label}</p>
      <p className="mt-2 font-metric text-xl font-semibold tracking-tight text-[#073D2C] sm:text-2xl">{value}</p>
      {footer ? <div className="mt-2">{footer}</div> : null}
    </Card>
  )
}

function BreakdownCard({
  label,
  value,
  accent,
  footer,
}: {
  label: string
  value: string
  accent?: string
  footer?: ReactNode
}) {
  return (
    <div className={cn('rounded-[12px] border border-border bg-white px-4 py-3', accent)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-ui">{label}</p>
      <p className="mt-2 font-metric text-lg font-semibold tracking-tight text-[#073D2C]">{value}</p>
      {footer}
    </div>
  )
}

function TransactionRow({ sale: s }: { sale: Sale }) {
  return (
    <tr className="border-t border-border/70 hover:bg-ivory-100">
      <td className="px-2 py-3">
        <p className="font-semibold uppercase text-[#073D2C]">{s.treatmentOrPackage}</p>
        <p className="text-[11px] text-slate-ui">id: {s.bookingRef || s.invoiceNumber.slice(-4)}</p>
      </td>
      <td className="px-2 py-3 font-medium uppercase text-[#073D2C]">{s.clientName}</td>
      <td className="px-2 py-3 text-slate-ui">{s.staffName || '—'}</td>
      <td className="px-2 py-3 font-semibold">{formatPesoExact(s.totalAmount)}</td>
      <td className="px-2 py-3">{typeBadge(s.itemType)}</td>
      <td className="px-2 py-3">
        <span className="text-xs font-semibold text-emerald-700">
          {s.paymentType || 'Full Payment'}
        </span>
      </td>
      <td className="px-2 py-3">
        <span
          className={cn(
            'text-xs font-semibold',
            s.status === 'paid' ? 'text-emerald-700' : 'text-amber-600',
          )}
        >
          {s.status === 'paid' ? 'Paid' : s.status === 'pending' ? 'Pending' : s.status}
        </span>
      </td>
      <td className="px-2 py-3">{s.branchName}</td>
      <td className="px-2 py-3 text-slate-ui">{formatShortDate(s.createdAt)}</td>
    </tr>
  )
}
