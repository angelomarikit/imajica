import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Box,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  FileSpreadsheet,
  History,
  Plus,
  Search,
  SquarePen,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { BranchStocksModal } from '@/components/catalog/BranchStocksModal'
import { StockHistoryModal } from '@/components/catalog/StockHistoryModal'
import { useAuth } from '@/contexts/AuthContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import {
  deleteCatalogProduct,
  getCatalogProducts,
  subscribeProducts,
} from '@/services/productCatalogService'
import {
  getProductBranchStocks,
  getProductStockHistory,
  subscribeProductStock,
} from '@/services/productStockService'
import type { CatalogProduct, ProductBranchStock, ProductStockHistoryEntry } from '@/types'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'
import { isFranchiseBranchOwner } from '@/utils/franchiseAccess'

export function ProductInventoryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const franchiseOwner = isFranchiseBranchOwner(user)
  const forcedBranchId = useForcedBranchId()
  const [products, setProducts] = useState(() => getCatalogProducts())
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const [stocksProduct, setStocksProduct] = useState<CatalogProduct | null>(null)
  const [stocks, setStocks] = useState<ProductBranchStock[]>([])
  const [historyProduct, setHistoryProduct] = useState<CatalogProduct | null>(null)
  const [history, setHistory] = useState<ProductStockHistoryEntry[]>([])

  useEffect(
    () =>
      subscribeProducts(() => {
        setProducts(getCatalogProducts())
      }),
    [],
  )

  useEffect(() => subscribeProductStock(() => setProducts(getCatalogProducts())), [])

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        search
          ? p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [products, search],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const rows = filtered.slice(start, start + pageSize)

  function openBranchStocks(p: CatalogProduct) {
    setStocksProduct(p)
    const all = getProductBranchStocks(p.id)
    setStocks(
      forcedBranchId ? all.filter((s) => s.branchId === forcedBranchId) : all,
    )
  }

  function openStockHistory(p: CatalogProduct) {
    setHistoryProduct(p)
    const all = getProductStockHistory(p.id)
    setHistory(
      forcedBranchId
        ? all.filter((h) => !h.branchId || h.branchId === forcedBranchId)
        : all,
    )
  }

  function exportCsv() {
    const header = ['Product Name', 'SKU', 'Category', 'Branch', 'Retail Price', 'Base Cost']
    const lines = filtered.map((p) =>
      [p.name, p.sku, p.categoryName ?? 'N/A', p.branchName, p.retailPrice, p.baseCost]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'imajica-products.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title={franchiseOwner ? 'Branch Stock' : 'Imajica Product Inventory'}
        description={
          franchiseOwner
            ? 'Add and manage products for your branch inventory, including stock and pricing.'
            : 'Manage clinic skincare products, cosmetics, raw goods inventory, and branch distribution networks with precise stock targets and safety alert points.'
        }
        stat={{ value: products.length, label: 'Total Products' }}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl text-[#073D2C] sm:text-3xl">
            {franchiseOwner ? 'Your Branch Inventory' : 'Skincare & Clinic Inventory'}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportCsv}>
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </Button>
            <Link to="/admin/catalog/products/new">
              <Button>
                <Plus className="h-4 w-4" /> Add Product
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-ui">
              Show Entries
            </span>
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
          </label>
          <div className="ml-auto flex min-w-[240px] flex-1 flex-col gap-1 sm:max-w-lg">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-ui">
              Search Product
            </span>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
                <input
                  className="h-10 w-full rounded-[10px] border border-border pl-9 pr-3 text-sm"
                  placeholder="Search product name or SKU..."
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
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Product Name</th>
                <th className="px-2 py-3">Category</th>
                <th className="px-2 py-3">Branch Location</th>
                <th className="px-2 py-3">Retail Price</th>
                <th className="px-2 py-3">Base Cost</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-border/70 hover:bg-ivory-100">
                  <td className="px-2 py-3">
                    <p className="font-semibold text-[#073D2C]">{p.name}</p>
                    <p className="text-xs text-slate-ui">SKU: {p.sku}</p>
                  </td>
                  <td className="px-2 py-3">
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {p.categoryName ?? 'N/A'}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-slate-ui">{p.branchName}</td>
                  <td className="px-2 py-3 font-medium">{formatPeso(p.retailPrice)}</td>
                  <td className="px-2 py-3 font-medium">{formatPeso(p.baseCost)}</td>
                  <td className="px-2 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <ActionBtn
                        className="bg-sky-50 text-sky-600"
                        label="View"
                        onClick={() => navigate(`/admin/catalog/products/${p.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </ActionBtn>
                      <ActionBtn
                        className="bg-orange-50 text-orange-500"
                        label="Edit"
                        onClick={() => navigate(`/admin/catalog/products/${p.id}/edit`)}
                      >
                        <SquarePen className="h-3.5 w-3.5" />
                      </ActionBtn>
                      <ActionBtn
                        className="bg-violet-50 text-violet-600"
                        label="Branch Stocks"
                        onClick={() => openBranchStocks(p)}
                      >
                        <Box className="h-3.5 w-3.5" />
                      </ActionBtn>
                      <ActionBtn
                        className="bg-teal-50 text-teal-700"
                        label="Stock History"
                        onClick={() => openStockHistory(p)}
                      >
                        <History className="h-3.5 w-3.5" />
                      </ActionBtn>
                      <ActionBtn
                        className="bg-red-50 text-red-600"
                        label="Delete"
                        onClick={() => {
                          if (confirm(`Delete ${p.name}?`)) {
                            deleteCatalogProduct(p.id)
                            toast.message('Product removed')
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-10 text-center text-slate-ui">
                    No products found.
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

      <BranchStocksModal
        open={Boolean(stocksProduct)}
        product={stocksProduct}
        stocks={stocks}
        onClose={() => setStocksProduct(null)}
      />
      <StockHistoryModal
        open={Boolean(historyProduct)}
        product={historyProduct}
        entries={history}
        onClose={() => setHistoryProduct(null)}
      />
    </div>
  )
}

function ActionBtn({
  children,
  className,
  label,
  onClick,
}: {
  children: ReactNode
  className: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-[8px]',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Pager({
  start,
  pageSize,
  total,
  page,
  totalPages,
  onPage,
}: {
  start: number
  pageSize: number
  total: number
  page: number
  totalPages: number
  onPage: (n: number | ((p: number) => number)) => void
}) {
  const nums = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    return Array.from(
      new Set([1, 2, 3, totalPages, page, page - 1, page + 1].filter((n) => n >= 1 && n <= totalPages)),
    ).sort((a, b) => a - b)
  }, [totalPages, page])

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-ui">
      <p>
        Showing {total === 0 ? 0 : start + 1} to {Math.min(start + pageSize, total)} of {total}{' '}
        entries.
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-border disabled:opacity-40"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage((p) => Math.max(1, p - 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-border disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {nums.map((n, i) => (
          <span key={n} className="contents">
            {i > 0 && n - nums[i - 1]! > 1 ? <span className="px-1">…</span> : null}
            <button
              type="button"
              onClick={() => onPage(n)}
              className={cn(
                'inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] px-2 text-sm font-semibold',
                n === page ? 'bg-[#073D2C] text-white' : 'border border-border bg-white',
              )}
            >
              {n}
            </button>
          </span>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage((p) => Math.min(totalPages, p + 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-border disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(totalPages)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-border disabled:opacity-40"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
