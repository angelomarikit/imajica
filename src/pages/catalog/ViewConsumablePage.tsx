import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StockHistoryModal } from '@/components/catalog/StockHistoryModal'
import { getConsumableById, subscribeProducts } from '@/services/productCatalogService'
import {
  getConsumableBranchStocks,
  getConsumableStockHistory,
  subscribeConsumableStock,
  type ConsumableBranchStock,
} from '@/services/consumableStockService'
import type { CatalogProduct, ConsumableItem, ProductStockHistoryEntry } from '@/types'
import { cn } from '@/utils/cn'

function formatCreatedLong(iso: string) {
  const d = new Date(iso.includes('T') ? iso : `${iso}T23:37:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function branchStockBadgeClass(stock: number) {
  if (stock <= 0) return 'bg-red-100 text-red-700'
  if (stock < 5) return 'bg-amber-100 text-amber-700'
  return 'bg-emerald-100 text-emerald-800'
}

export function ViewConsumablePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<ConsumableItem | null>(null)
  const [stocks, setStocks] = useState<ConsumableBranchStock[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<ProductStockHistoryEntry[]>([])

  useEffect(() => {
    if (!id) return
    const load = () => {
      const found = getConsumableById(id)
      if (!found) {
        toast.error('Consumable not found')
        navigate('/admin/catalog/consumables', { replace: true })
        return
      }
      setItem(found)
      setStocks(getConsumableBranchStocks(found.id))
    }
    load()
    const unsubP = subscribeProducts(load)
    const unsubS = subscribeConsumableStock(load)
    return () => {
      unsubP()
      unsubS()
    }
  }, [id, navigate])

  function openHistory(branchId: string) {
    if (!item) return
    setHistory(getConsumableStockHistory(item.id, branchId))
    setHistoryOpen(true)
  }

  if (!item) {
    return <p className="text-sm text-slate-ui">Loading consumable…</p>
  }

  const modalProduct = {
    id: item.id,
    name: item.name,
    sku: '',
    branchName: item.branchName,
    retailPrice: 0,
    baseCost: 0,
    status: 'active' as const,
    createdAt: item.createdAt,
  } satisfies CatalogProduct

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Link to="/admin/catalog/consumables">
          <Button variant="secondary" className="bg-[#0A2E26] text-white hover:bg-[#0A2E26]/90">
            <ArrowLeft className="h-4 w-4" /> Back to Consumables
          </Button>
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-[14px] bg-[#0A2E26] px-6 py-7 sm:px-8">
        <div className="absolute inset-y-0 left-0 w-1 bg-[#C5A059]" />
        <h1 className="font-display text-3xl tracking-tight text-[#C5A059] sm:text-4xl">
          {item.name}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-white/85">
          Consumable stock scoping details, availability tracking, and adjustment auditing timeline.
        </p>
      </div>

      <Card className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-ui">Date Created</p>
        <p className="mt-2 text-lg font-semibold text-charcoal">
          {formatCreatedLong(item.createdAt)}
        </p>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border bg-[#F3F4F2] px-5 py-3">
          <h2 className="text-sm font-semibold text-[#073D2C]">Scoped Branch stock levels</h2>
        </div>
        <div className="overflow-x-auto p-2 sm:p-3">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-3 py-3">Branch</th>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3">History Audit</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((row) => (
                <tr key={row.branchId} className="border-t border-border/70">
                  <td className="px-3 py-3 font-medium text-charcoal">{row.branchName}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        'inline-flex min-w-10 items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold',
                        branchStockBadgeClass(row.stock),
                      )}
                    >
                      {row.stock}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {row.hasHistory ? (
                      <button
                        type="button"
                        onClick={() => openHistory(row.branchId)}
                        className="inline-flex items-center gap-1.5 rounded-[8px] bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                      >
                        <Clock className="h-3.5 w-3.5" /> History
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-[8px] bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500"
                      >
                        <Clock className="h-3.5 w-3.5" /> No History
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <StockHistoryModal
        open={historyOpen}
        product={modalProduct}
        entries={history}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  )
}
