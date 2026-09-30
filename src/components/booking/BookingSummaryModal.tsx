import { CalendarDays, Package, Stethoscope, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  deleteExtraSalesByBooking,
  getSalesForBooking,
  type TodayBookingRow,
} from '@/services/salesService'
import type { Sale } from '@/types'
import { formatPesoExact } from '@/utils/currency'

function formatSummaryDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function lineTypeLabel(sale: Sale): string {
  if (sale.itemType === 'package') return 'Package'
  if (sale.itemType === 'product') return 'Product'
  return 'Service'
}

function unitPrice(sale: Sale): number {
  if (sale.unitRetailPrice != null) return sale.unitRetailPrice
  const qty = Math.max(1, sale.quantity ?? 1)
  return sale.totalAmount / qty
}

export function BookingSummaryModal({
  open,
  row,
  onClose,
  onDeleted,
}: {
  open: boolean
  row: TodayBookingRow | null
  onClose: () => void
  onDeleted?: () => void
}) {
  if (!open || !row) return null

  const lines = getSalesForBooking(row.bookingKey)
  const services = lines.filter((l) => l.itemType !== 'product')
  const products = lines.filter((l) => l.itemType === 'product')
  const methodBadge = row.paymentMethod === 'N/A' ? 'N/A' : row.paymentMethod

  function handleDelete() {
    if (!row.isLive) {
      toast.error('Imported historical sales cannot be deleted here')
      return
    }
    if (!window.confirm(`Delete booking ${row.bookingId} for ${row.patientName}?`)) return
    deleteExtraSalesByBooking(row.bookingKey)
    toast.success('Booking removed')
    onDeleted?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <button
        type="button"
        className="fixed inset-0 bg-[#041c18]/45 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-summary-title"
        className="relative z-10 my-4 w-full max-w-3xl overflow-hidden rounded-[16px] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
              <CalendarDays className="h-4 w-4" />
            </span>
            <h2 id="booking-summary-title" className="font-display text-lg font-semibold tracking-tight text-[#0f172a] sm:text-xl">
              Booking Summary
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-ui hover:bg-ivory-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {/* Overview */}
          <div className="grid gap-4 rounded-[12px] border border-border bg-[#f8fafc] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-ui">Booking ID</p>
              <p className="mt-1 text-xl font-bold text-[#0f172a]">{row.bookingId}</p>
              <p className="mt-0.5 text-xs text-slate-ui">{formatSummaryDate(row.dateIso)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-ui">
                Customer / Staff
              </p>
              <p className="mt-1 text-base font-bold uppercase text-[#0f172a]">{row.patientName}</p>
              <p className="mt-0.5 text-xs text-slate-ui">{row.staffName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-ui">
                Status &amp; Terms
              </p>
              <div className="mt-1.5 flex flex-col items-start gap-1.5">
                <Badge variant={row.status === 'Paid' ? 'success' : 'warning'}>{row.status}</Badge>
                <Badge variant="neutral">{row.paymentType.toUpperCase()}</Badge>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-ui">Amount Paid</p>
              <p className="mt-1 text-xl font-bold text-emerald-800">
                {formatPesoExact(row.payment)}
              </p>
              <span className="mt-1.5 inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                {methodBadge || 'N/A'}
              </span>
            </div>
          </div>

          {/* Services & Packages */}
          <section className="overflow-hidden rounded-[12px] border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-white px-4 py-3">
              <Stethoscope className="h-4 w-4 text-emerald-800" />
              <h3 className="font-semibold text-[#0f172a]">Services &amp; Packages</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f1f5f9] text-[10px] font-bold uppercase tracking-wide text-slate-ui">
                  <tr>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-ui">
                        No services found for this booking
                      </td>
                    </tr>
                  ) : (
                    services.map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium text-[#0f172a]">
                          {s.treatmentOrPackage}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                            {lineTypeLabel(s)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#0f172a]">
                          {formatPesoExact(s.totalAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Products */}
          <section className="overflow-hidden rounded-[12px] border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-white px-4 py-3">
              <Package className="h-4 w-4 text-emerald-800" />
              <h3 className="font-semibold text-[#0f172a]">Products Purchased</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f1f5f9] text-[10px] font-bold uppercase tracking-wide text-slate-ui">
                  <tr>
                    <th className="px-4 py-2.5">Product</th>
                    <th className="px-4 py-2.5">Quantity</th>
                    <th className="px-4 py-2.5 text-right">Unit Price</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-ui">
                        No products found for this booking
                      </td>
                    </tr>
                  ) : (
                    products.map((s) => {
                      const qty = Math.max(1, s.quantity ?? 1)
                      return (
                        <tr key={s.id} className="border-t border-border">
                          <td className="px-4 py-3 font-medium text-[#0f172a]">
                            {s.treatmentOrPackage}
                          </td>
                          <td className="px-4 py-3 text-slate-ui">{qty}</td>
                          <td className="px-4 py-3 text-right text-[#0f172a]">
                            {formatPesoExact(unitPrice(s))}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-[#0f172a]">
                            {formatPesoExact(s.totalAmount)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={!row.isLive}>
            Delete
          </Button>
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
