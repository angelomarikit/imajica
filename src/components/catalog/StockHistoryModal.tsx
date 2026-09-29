import { X } from 'lucide-react'
import type { CatalogProduct, ProductStockHistoryEntry } from '@/types'

function splitDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return { date: iso.slice(0, 10), time: iso.slice(11, 19) || '—' }
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  }
}

export function StockHistoryModal({
  open,
  product,
  entries,
  onClose,
}: {
  open: boolean
  product: CatalogProduct | null
  entries: ProductStockHistoryEntry[]
  onClose: () => void
}) {
  if (!open || !product) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-emerald-950/45"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[12px] bg-white shadow-xl">
        <div className="flex items-center justify-between bg-[#0A2E26] px-5 py-3.5">
          <h3 className="text-sm font-semibold text-white sm:text-base">
            Stock History - {product.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-white/10 text-white hover:bg-white/20"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#0A2E26] text-xs font-semibold uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-3 py-3">Prev</th>
                <th className="px-3 py-3">New</th>
                <th className="px-3 py-3">Adj</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Reference</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => {
                const { date, time } = splitDateTime(row.createdAt)
                return (
                  <tr key={row.id} className="border-b border-border/80">
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-charcoal">{date}</p>
                      <p className="text-xs text-slate-ui">{time}</p>
                    </td>
                    <td className="px-3 py-3 align-top font-semibold text-charcoal">
                      {row.previousQty}
                    </td>
                    <td className="px-3 py-3 align-top font-semibold text-charcoal">
                      {row.newQty}
                    </td>
                    <td className="px-3 py-3 align-top font-semibold text-charcoal">
                      {row.adjustment}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {row.movementType}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      {row.reference ? (
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {row.reference}
                        </span>
                      ) : (
                        <span className="text-slate-ui">—</span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 align-top text-xs text-slate-ui">
                      {row.notes ?? '—'}
                    </td>
                  </tr>
                )
              })}
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-ui">
                    No stock history for this product yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
