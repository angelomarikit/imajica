import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileSpreadsheet, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Pager } from '@/pages/catalog/ProductInventoryPage'
import {
  couponStatus,
  daysSinceEnded,
  deleteCoupon,
  getCoupons,
  subscribeCoupons,
} from '@/services/couponService'
import type { PromoCoupon } from '@/types'
import { formatPeso } from '@/utils/currency'

function formatRange(from: string, until: string) {
  const a = new Date(from).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
  const b = new Date(until).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
  return `${a} to ${b}`
}

export function CouponListPage() {
  const [coupons, setCoupons] = useState<PromoCoupon[]>(() => getCoupons())
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  useEffect(() => subscribeCoupons(() => setCoupons(getCoupons())), [])

  const filtered = useMemo(
    () =>
      coupons.filter(
        (c) =>
          !search ||
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [coupons, search],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const rows = filtered.slice(start, start + pageSize)

  function exportCsv() {
    const header = [
      'Code',
      'Name',
      'Branch',
      'Discount Value',
      'Discount Type',
      'Valid From',
      'Valid Until',
      'Status',
    ]
    const lines = filtered.map((c) =>
      [
        c.code,
        c.name,
        c.branchName,
        c.discountValue,
        c.discountType,
        c.validFrom,
        c.validUntil,
        couponStatus(c),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'imajica-coupons.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported Excel-compatible CSV')
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Imajica Promo Coupons"
        description="Configure marketing discount codes, validity dates, value discounts, and scoping applicability settings."
        stat={{ value: coupons.length, label: 'Total Coupons' }}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl text-[#073D2C]">Promotional Coupon Settings</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportCsv}>
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </Button>
            <Link to="/admin/catalog/promotions/new">
              <Button>
                <Plus className="h-4 w-4" /> Add New Coupon
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n} entries
              </option>
            ))}
          </select>
          <div className="ml-auto flex min-w-[240px] flex-1 items-center gap-2 sm:max-w-lg">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
              <input
                className="h-10 w-full rounded-[10px] border border-border pl-9 pr-3 text-sm"
                placeholder="Search coupon code or name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearch(query)
                    setPage(1)
                  }
                }}
              />
            </div>
            <Button
              onClick={() => {
                setSearch(query)
                setPage(1)
              }}
            >
              Search
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Coupon Code</th>
                <th className="px-2 py-3">Coupon Name</th>
                <th className="px-2 py-3">Branch Name</th>
                <th className="px-2 py-3">Discount Value</th>
                <th className="px-2 py-3">Discount Type</th>
                <th className="px-2 py-3">Validity Period</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Applicable Service</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const status = couponStatus(c)
                const endedDays = daysSinceEnded(c)
                return (
                  <tr key={c.id} className="border-t border-border/70 hover:bg-ivory-100">
                    <td className="px-2 py-3 font-semibold text-[#073D2C]">{c.code}</td>
                    <td className="px-2 py-3">
                      <p className="font-bold uppercase text-[#073D2C]">{c.name}</p>
                      <p className="text-xs text-slate-ui">{c.description || '—'}</p>
                    </td>
                    <td className="px-2 py-3 text-slate-ui">{c.branchName}</td>
                    <td className="px-2 py-3 font-medium">
                      {c.discountType === 'percentage'
                        ? `${c.discountValue}%`
                        : formatPeso(c.discountValue)}
                    </td>
                    <td className="px-2 py-3">
                      <Badge variant="neutral">
                        {c.discountType === 'fixed' ? 'Fixed' : 'Percent'}
                      </Badge>
                    </td>
                    <td className="px-2 py-3">
                      <p className="text-slate-ui">{formatRange(c.validFrom, c.validUntil)}</p>
                      {status === 'expired' ? (
                        <p className="text-[11px] text-slate-ui/80">
                          (Ended {endedDays} day{endedDays === 1 ? '' : 's'} ago)
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-3">
                      <Badge
                        variant={
                          status === 'active' ? 'success' : status === 'scheduled' ? 'warning' : 'danger'
                        }
                      >
                        {status === 'active'
                          ? 'Active'
                          : status === 'scheduled'
                            ? 'Scheduled'
                            : 'Expired'}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-slate-ui">
                      {c.serviceName ?? c.packageName ?? '—'}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex gap-1.5">
                        <Link
                          to={`/admin/catalog/promotions/new?edit=${c.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#E8D9B8] text-[#073D2C]"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          aria-label="Delete"
                          onClick={() => {
                            if (confirm(`Delete coupon ${c.code}?`)) {
                              deleteCoupon(c.id)
                              toast.message('Coupon removed')
                            }
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-red-100 text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-2 py-10 text-center text-slate-ui">
                    No coupons found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <Pager
          start={start}
          pageSize={pageSize}
          total={filtered.length}
          page={safePage}
          totalPages={totalPages}
          onPage={setPage}
        />
      </Card>
    </div>
  )
}
