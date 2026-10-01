import { useEffect, useMemo, useState } from 'react'
import { Eye, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { BookingSummaryModal } from '@/components/booking/BookingSummaryModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  deleteExtraSalesByBooking,
  getBookingRows,
  preloadSalesData,
  subscribeSalesData,
  todayDateKey,
  type TodayBookingRow,
} from '@/services/salesService'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'

function formatBookingDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TodaysBookingPanel({
  branchId,
  mode = 'today',
}: {
  branchId?: string
  /** today = current local day only; all = full booking list */
  mode?: 'today' | 'all'
}) {
  const [rows, setRows] = useState<TodayBookingRow[]>([])
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [viewRow, setViewRow] = useState<TodayBookingRow | null>(null)

  useEffect(() => {
    const refresh = () => {
      setRows(
        getBookingRows({
          dateKey: mode === 'today' ? todayDateKey() : undefined,
          branchId,
        }),
      )
    }
    void preloadSalesData().then(refresh)
    refresh()
    return subscribeSalesData(refresh)
  }, [branchId, mode])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const hay = [
        r.bookingId,
        r.patientName,
        r.services,
        r.products,
        r.staffName,
        r.paymentMethod,
        r.paymentType,
        r.status,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  async function handleDelete(row: TodayBookingRow) {
    if (!row.isLive) {
      toast.error('Imported historical sales cannot be deleted here')
      return
    }
    if (!window.confirm(`Delete booking ${row.bookingId} for ${row.patientName}?`)) return
    try {
      await deleteExtraSalesByBooking(row.bookingKey)
      toast.success('Booking removed')
      if (viewRow?.bookingKey === row.bookingKey) setViewRow(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete booking')
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <BookingSummaryModal
        open={Boolean(viewRow)}
        row={viewRow}
        onClose={() => setViewRow(null)}
        onDeleted={() => setViewRow(null)}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-[#073D2C]">
            {mode === 'today' ? "Today's Booking" : 'Booking List'}
          </h2>
          <p className="page-subtitle">
            {mode === 'today'
              ? 'Track the appointments and payments scheduled for today.'
              : 'Full booking history from checkout transactions.'}
          </p>
        </div>
        {mode === 'today' ? <Badge variant="gold">Today</Badge> : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-ui">
          Show
          <select
            className="h-9 rounded-[8px] border border-border bg-white px-2 text-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          entries
        </label>
        <div className="flex min-w-[240px] flex-1 items-center gap-2 sm:max-w-md sm:flex-none">
          <input
            className="h-10 flex-1 rounded-[10px] border border-border px-3 text-sm"
            placeholder={mode === 'today' ? "Search today's bookings..." : 'Search bookings...'}
            value={queryDraft}
            onChange={(e) => setQueryDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setQuery(queryDraft)
                setPage(1)
              }
            }}
          />
          <Button
            type="button"
            onClick={() => {
              setQuery(queryDraft)
              setPage(1)
            }}
          >
            Search
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-[12px] border border-border">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-ivory-100/80 text-[10px] font-bold uppercase tracking-wide text-slate-ui">
            <tr>
              <th className="px-3 py-3">Booking ID</th>
              <th className="px-3 py-3">Patient Name</th>
              <th className="px-3 py-3">Services/Packages</th>
              <th className="px-3 py-3">Products</th>
              <th className="px-3 py-3">Staff</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Payment</th>
              <th className="px-3 py-3">Payment Type</th>
              <th className="px-3 py-3">Payment Method</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-12 text-center text-slate-ui">
                  {mode === 'today'
                    ? 'No bookings for today yet. Complete a checkout to see it here.'
                    : 'No bookings found.'}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.bookingKey} className="border-t border-border align-top">
                  <td className="px-3 py-3 font-semibold text-[#073D2C]">{row.bookingId}</td>
                  <td className="px-3 py-3 font-medium uppercase text-[#073D2C]">
                    {row.patientName}
                  </td>
                  <td className="max-w-[220px] px-3 py-3 text-slate-ui">{row.services}</td>
                  <td className="max-w-[160px] px-3 py-3 text-slate-ui">{row.products}</td>
                  <td className="px-3 py-3 text-[#073D2C]">{row.staffName}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-ui">
                    {formatBookingDate(row.dateIso)}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={row.status === 'Paid' ? 'success' : 'warning'}>{row.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-medium text-[#073D2C]">
                    {formatPesoExact(row.payment)}
                  </td>
                  <td className="px-3 py-3">{row.paymentType}</td>
                  <td className="px-3 py-3 font-medium uppercase">{row.paymentMethod}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewRow(row)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-sky-600 hover:bg-sky-50"
                        title="View booking"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-ui">
        <p>
          Showing {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1} to{' '}
          {Math.min(safePage * pageSize, filtered.length)} of {filtered.length} entries
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={cn(
              'rounded-[8px] border border-border px-3 py-1.5 disabled:opacity-40',
            )}
          >
            Previous
          </button>
          <span className="px-2 font-semibold text-[#073D2C]">
            {safePage} / {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            className="rounded-[8px] border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </Card>
  )
}
