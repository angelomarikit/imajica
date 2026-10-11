import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Filter, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { exportCsv, salesSummary } from '@/services/analyticsService'
import { fetchOpsSalesForRange } from '@/services/salesService'
import type { AnalyticsSaleType, Sale } from '@/types'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'
import { useAuth } from '@/contexts/AuthContext'
import { isFranchiseBranchOwner } from '@/utils/franchiseAccess'

type TypeFilter = 'all' | AnalyticsSaleType

const inputClass =
  'rounded-[6px] border border-border bg-white px-2.5 py-1.5 text-sm text-[#073D2C] outline-none focus:border-[#073D2C]'

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
  // Ops Excel source of truth starts Apr 2026 — show month-to-date within that era.
  const monthStart = `${to.slice(0, 8)}01`
  const opsStart = '2026-04-01'
  return { from: monthStart < opsStart ? opsStart : monthStart, to }
}

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

/** Display payment type without Intracode-style “Payment Payment” doubling. */
function paymentLabel(sale: Sale) {
  const raw = (sale.paymentType || 'Full Payment').trim().replace(/\s+/g, ' ')
  if (/installment\s*\(\s*downpayment\s*\)/i.test(raw)) return 'Installment (Downpayment)'
  if (/installment/i.test(raw)) return 'Installment Payment'
  if (/split/i.test(raw)) return 'Split Payment'
  if (/partial/i.test(raw)) return 'Partial'
  return 'Full Payment'
}

export function PaymentsPage() {
  const { user } = useAuth()
  const forcedBranchId = useForcedBranchId()
  const franchiseOwner = isFranchiseBranchOwner(user)
  const initialRange = defaultFranchiseRange()

  const [rows, setRows] = useState<Sale[]>([])
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
    void fetchOpsSalesForRange({
      branchId: forcedBranchId,
      from,
      to,
    })
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch((err) => {
        console.error('[franchise-sales] load failed', err)
        if (!cancelled) {
          setRows([])
          toast.error('Could not load franchise sales')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [forcedBranchId, from, to])

  const summary = useMemo(() => salesSummary(rows, from, to), [rows, from, to])

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

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-[#073D2C] sm:text-[1.75rem]">
        {franchiseOwner ? 'Franchise Sales' : 'Payments'}
      </h1>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total Sales" value={formatPesoExact(summary.grossSales)} />
        <KpiCard label="Product Sales" value={formatPesoExact(summary.productSales)} />
        <KpiCard label="Service Sales" value={formatPesoExact(summary.serviceSales)} />
        <KpiCard
          label="Booking Sales"
          hint="(Services + Packages)"
          value={formatPesoExact(summary.serviceSales)}
        />
        <KpiCard label="Total Bookings" value={String(summary.bookings)} />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-ui">
            Show
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className={inputClass}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            entries
          </label>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={fromDraft}
                onChange={(e) => setFromDraft(e.target.value)}
                className={inputClass}
                aria-label="From date"
              />
              <span className="text-sm text-slate-ui">to</span>
              <input
                type="date"
                value={toDraft}
                onChange={(e) => setToDraft(e.target.value)}
                className={inputClass}
                aria-label="To date"
              />
              <button
                type="button"
                onClick={applyFilter}
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-[#eef1f4] px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-[#e4e8ec]"
              >
                <Filter className="h-3.5 w-3.5" />
                Filter
              </button>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as TypeFilter)
                  setPage(1)
                }}
                className={inputClass}
                aria-label="Sales type"
              >
                <option value="all">All Sales</option>
                <option value="service">Services</option>
                <option value="package">Packages</option>
                <option value="product">Products</option>
              </select>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#073D2C] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#0a4d38]"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-ui" />
              <input
                value={queryDraft}
                onChange={(e) => {
                  setQueryDraft(e.target.value)
                  setQuery(e.target.value.trim())
                  setPage(1)
                }}
                placeholder="Search sales..."
                className={cn(inputClass, 'w-full py-1.5 pl-8 pr-2.5')}
              />
            </div>
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
                    Loading sales…
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
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => i + 1).map((n) => (
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
            {pageCount > 7 ? (
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

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card className="border border-border/80 bg-white p-4 shadow-none">
      <p className="text-sm text-slate-500">{label}</p>
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
      <p className="mt-2 font-metric text-xl font-semibold tracking-tight text-slate-900 sm:text-[1.35rem]">
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
