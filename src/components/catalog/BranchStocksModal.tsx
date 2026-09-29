import { MapPin, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { CatalogProduct, ProductBranchStock } from '@/types'

export function BranchStocksModal({
  open,
  product,
  stocks,
  onClose,
}: {
  open: boolean
  product: CatalogProduct | null
  stocks: ProductBranchStock[]
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
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[12px] bg-white shadow-xl">
        <div className="flex items-center justify-between bg-[#0A2E26] px-5 py-3.5">
          <h3 className="text-sm font-semibold text-white sm:text-base">
            Branch Stocks - {product.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto bg-[#F7F7F5] p-4 sm:p-5">
          {stocks.map((row) => {
            const out = row.stock <= 0
            return (
              <div
                key={row.branchId}
                className="flex items-center gap-3 rounded-[10px] border border-border bg-white px-3.5 py-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-slate-100">
                  <MapPin className="h-4 w-4 text-[#0A2E26]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-charcoal">{row.branchName}</p>
                  <p className="text-xs text-slate-ui">
                    Restock Alert Point: {row.restockPoint}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold',
                    out
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800',
                  )}
                >
                  {out ? 'Out of Stock' : `${row.stock} in Stock`}
                </span>
              </div>
            )
          })}
          {stocks.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-ui">No branch stock records.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
