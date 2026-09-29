import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Filter, Search } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  defaultAnalyticsRange,
  exportCsv,
  getAnalyticsSales,
  productSalesReport,
  subscribeAnalytics,
} from '@/services/analyticsService'
import { preloadSalesData } from '@/services/salesService'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'

export function SalesProductReportPage() {
  const range = defaultAnalyticsRange()
  const [sales, setSales] = useState(() => getAnalyticsSales())
  const [fromDraft, setFromDraft] = useState(range.from)
  const [toDraft, setToDraft] = useState(range.to)
  const [from, setFrom] = useState(range.from)
  const [to, setTo] = useState(range.to)
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

  const rows = useMemo(() => productSalesReport(sales, from, to), [sales, from, to])

  const filtered = useMemo(() => {
    if (!query) return rows
    const q = query.toLowerCase()
    return rows.filter(
      (r) => r.productName.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q),
    )
  }, [rows, query])

  const totals = useMemo(() => {
    const units = filtered.reduce((s, r) => s + r.unitsSold, 0)
    const revenue = filtered.reduce((s, r) => s + r.totalRevenue, 0)
    const cost = filtered.reduce((s, r) => s + r.totalCost, 0)
    const profit = revenue - cost
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0
    return { units, revenue, cost, profit, margin }
  }, [filtered])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  function applyFilter() {
    setFrom(fromDraft)
    setTo(toDraft)
    setPage(1)
  }

  function handleExport() {
    exportCsv(
      `imajica-product-sales-${from}-${to}.csv`,
      [
        'Product',
        'SKU',
        'Units Sold',
        'Base Cost',
        'Retail Price',
        'Total Revenue',
        'Total Cost',
        'Total Profit',
        'Margin %',
      ],
      filtered.map((r) => [
        r.productName,
        r.sku,
        String(r.unitsSold),
        String(r.baseCost),
        String(r.retailPrice),
        String(r.totalRevenue),
        String(r.totalCost),
        String(r.totalProfit),
        r.profitMargin.toFixed(2),
      ]),
    )
    toast.success('Exported product sales report')
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Sales Product Report"
        description="Analyze units sold, costs, gross revenues, and net profits for catalog products."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
            Total Units Sold
          </p>
          <p className="mt-2 font-metric text-2xl font-semibold tracking-tight text-[#073D2C]">{totals.units}</p>
          <p className="mt-1 text-[11px] text-slate-ui">Sum of all product quantities.</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
            Gross Revenue
          </p>
          <p className="mt-2 font-metric text-2xl font-semibold tracking-tight text-[#073D2C]">
            {formatPesoExact(totals.revenue)}
          </p>
          <p className="mt-1 text-[11px] text-slate-ui">Total product retail sales.</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
            Cost of Goods (COGS)
          </p>
          <p className="mt-2 font-metric text-2xl font-semibold tracking-tight text-[#073D2C]">
            {formatPesoExact(totals.cost)}
          </p>
          <p className="mt-1 text-[11px] text-slate-ui">Sum of product base cost.</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
            Net Product Profit
          </p>
          <p className="mt-2 font-metric text-2xl font-semibold tracking-tight text-[#073D2C]">
            {formatPesoExact(totals.profit)}
          </p>
          <p className="mt-1 text-[11px] text-slate-ui">
            Margin: {totals.margin.toFixed(2)}%.
          </p>
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-ui">
            From
            <input
              type="date"
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
              className="mt-1 block rounded-[8px] border border-border bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-slate-ui">
            To
            <input
              type="date"
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
              className="mt-1 block rounded-[8px] border border-border bg-white px-3 py-2 text-sm"
            />
          </label>
          <Button type="button" onClick={applyFilter} className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </Button>
          <Button type="button" onClick={handleExport} className="ml-auto gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export Excel
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
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
          <div className="relative ml-auto min-w-[240px] flex-1 sm:max-w-sm">
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
              placeholder="Search product name or SKU..."
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
                <th className="px-2 py-3">Product Name</th>
                <th className="px-2 py-3">Units Sold</th>
                <th className="px-2 py-3">Base Cost</th>
                <th className="px-2 py-3">Retail Price</th>
                <th className="px-2 py-3">Total Revenue</th>
                <th className="px-2 py-3">Total Cost</th>
                <th className="px-2 py-3">Total Profit</th>
                <th className="px-2 py-3">Profit Margin</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.sku} className="border-t border-border/70 hover:bg-ivory-100">
                  <td className="px-2 py-3">
                    <p className="font-semibold uppercase text-[#073D2C]">{r.productName}</p>
                    <p className="text-[11px] text-slate-ui">SKU: {r.sku}</p>
                  </td>
                  <td className="px-2 py-3">{r.unitsSold}</td>
                  <td className="px-2 py-3">{formatPesoExact(r.baseCost)}</td>
                  <td className="px-2 py-3">{formatPesoExact(r.retailPrice)}</td>
                  <td className="px-2 py-3 font-semibold">{formatPesoExact(r.totalRevenue)}</td>
                  <td className="px-2 py-3">{formatPesoExact(r.totalCost)}</td>
                  <td className="px-2 py-3">{formatPesoExact(r.totalProfit)}</td>
                  <td className="px-2 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        r.profitMargin > 0
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-emerald-50/80 text-emerald-700',
                      )}
                    >
                      {r.profitMargin.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-8 text-center text-slate-ui">
                    No product sales in this range.
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
