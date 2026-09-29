import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Info, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StockHistoryModal } from '@/components/catalog/StockHistoryModal'
import { getCatalogProductById, subscribeProducts } from '@/services/productCatalogService'
import {
  getProductBranchStocks,
  getProductStockHistory,
  subscribeProductStock,
} from '@/services/productStockService'
import type { CatalogProduct, ProductBranchStock, ProductStockHistoryEntry } from '@/types'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'

export function ViewProductPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<CatalogProduct | null>(null)
  const [stocks, setStocks] = useState<ProductBranchStock[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyBranchId, setHistoryBranchId] = useState<string | undefined>()
  const [history, setHistory] = useState<ProductStockHistoryEntry[]>([])

  useEffect(() => {
    if (!id) return
    const load = () => {
      const p = getCatalogProductById(id)
      if (!p) {
        toast.error('Product not found')
        navigate('/admin/catalog/products', { replace: true })
        return
      }
      setProduct(p)
      setStocks(getProductBranchStocks(id))
    }
    load()
    const unsubP = subscribeProducts(load)
    const unsubS = subscribeProductStock(load)
    return () => {
      unsubP()
      unsubS()
    }
  }, [id, navigate])

  const historyEntries = useMemo(() => {
    if (!product) return []
    return historyBranchId
      ? history.filter((h) => h.branchId === historyBranchId)
      : history
  }, [history, historyBranchId, product])

  function openHistory(branchId?: string) {
    if (!product) return
    setHistoryBranchId(branchId)
    setHistory(getProductStockHistory(product.id, branchId))
    setHistoryOpen(true)
  }

  if (!product) {
    return <p className="text-sm text-slate-ui">Loading product…</p>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-ui">
          Product Management <span className="text-slate-300">/</span> View Product
        </p>
        <Link to="/admin/catalog/products">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" /> Back to Product List
          </Button>
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-[14px] bg-[#0A2E26] px-6 py-7 sm:px-8">
        <div className="absolute inset-y-0 left-0 w-1 bg-[#C5A059]" />
        <h1 className="font-display text-3xl uppercase tracking-wide text-[#C5A059] sm:text-4xl">
          {product.name}
        </h1>
        <p className="mt-1 text-sm text-white/85">SKU Code: {product.sku}</p>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Info className="h-4 w-4 text-[#073D2C]" />
          <h2 className="font-semibold text-[#073D2C]">Specifications</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Spec label="Category" value={product.categoryName?.trim() || 'N/A'} />
          <Spec label="Supplier" value={product.supplier?.trim() || 'N/A'} />
          <div className="rounded-[10px] border border-border bg-[#FAFAF8] px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-ui">Status</p>
            <div className="mt-1.5">
              <Badge variant={product.status === 'active' ? 'gold' : 'neutral'}>
                {product.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <div className="rounded-[10px] border border-border bg-[#FAFAF8] px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-ui">
              Retail Price (Selling)
            </p>
            <p className="mt-1.5 text-lg font-bold text-emerald-700">
              {formatPeso(product.retailPrice)}
            </p>
          </div>
          <div className="rounded-[10px] border border-border bg-[#FAFAF8] px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-ui">
              Base Cost (Capital)
            </p>
            <p className="mt-1.5 text-lg font-bold text-slate-500">
              {formatPeso(product.baseCost)}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#073D2C]" />
          <h2 className="font-semibold text-[#073D2C]">Branch Stocks</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Branch</th>
                <th className="px-2 py-3">Stock</th>
                <th className="px-2 py-3">Restock Point</th>
                <th className="px-2 py-3">History</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((row) => (
                <tr key={row.branchId} className="border-t border-border/70">
                  <td className="px-2 py-3 font-medium text-charcoal">{row.branchName}</td>
                  <td className="px-2 py-3">
                    <span
                      className={cn(
                        'inline-flex min-w-8 items-center justify-center rounded-md px-2 py-1 text-xs font-bold',
                        row.stock <= 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-800',
                      )}
                    >
                      {row.stock}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-slate-ui">{row.restockPoint}</td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => openHistory(row.branchId)}
                      className="inline-flex items-center gap-1.5 rounded-[8px] border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-charcoal hover:bg-ivory-100"
                    >
                      <Clock className="h-3.5 w-3.5" /> History
                    </button>
                  </td>
                </tr>
              ))}
              {stocks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-8 text-center text-slate-ui">
                    No branch stock rows.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <StockHistoryModal
        open={historyOpen}
        product={product}
        entries={historyEntries}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-[#FAFAF8] px-3.5 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-ui">{label}</p>
      <p className="mt-1.5 font-medium text-charcoal">{value}</p>
    </div>
  )
}
