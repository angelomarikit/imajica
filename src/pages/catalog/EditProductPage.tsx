import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Boxes, CalendarDays, Package, Settings2, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  createCatalogProduct,
  getCatalogProductById,
  getVisibleCategories,
  updateCatalogProduct,
} from '@/services/productCatalogService'
import {
  getProductBranchStocks,
  getProductStockBranches,
  saveProductBranchStocks,
} from '@/services/productStockService'
import { cn } from '@/utils/cn'

const SUPPLIERS = ['Imajica Aesthetic', 'Clinic Supply Co.', 'DermCare PH', 'MediDistro']

const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal'
const control =
  'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15'

function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition',
        checked ? 'bg-emerald-800' : 'bg-slate-300',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
          checked ? 'left-5' : 'left-0.5',
        )}
      />
    </button>
  )
}

export function EditProductPage() {
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const editId = routeId || params.get('edit') || undefined
  const isEdit = Boolean(editId)

  const categories = useMemo(() => getVisibleCategories(), [])
  const [loaded, setLoaded] = useState(!isEdit)
  const [saving, setSaving] = useState(false)

  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [supplier, setSupplier] = useState('')
  const [retailPrice, setRetailPrice] = useState('0')
  const [baseCost, setBaseCost] = useState('0')
  const [active, setActive] = useState(true)
  const [manufacturingDate, setManufacturingDate] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [removalDate, setRemovalDate] = useState('')
  const [stockRows, setStockRows] = useState<
    Array<{ branchId: string; branchName: string; stock: number; restockPoint: number }>
  >([])

  useEffect(() => {
    if (!editId) {
      setLoaded(true)
      return
    }
    const existing = getCatalogProductById(editId)
    if (!existing) {
      toast.error('Product not found')
      navigate('/admin/catalog/products', { replace: true })
      return
    }
    setSku(existing.sku)
    setName(existing.name)
    setCategoryId(existing.categoryId ?? '')
    setSupplier(existing.supplier ?? '')
    setRetailPrice(String(existing.retailPrice))
    setBaseCost(String(existing.baseCost))
    setActive(existing.status === 'active')
    setManufacturingDate(existing.manufacturingDate ?? '')
    setExpirationDate(existing.expirationDate ?? '')
    setRemovalDate(existing.removalDate ?? '')
    setStockRows(getProductBranchStocks(existing.id))
    setLoaded(true)
  }, [editId, navigate])

  useEffect(() => {
    if (isEdit) return
    setStockRows(
      getProductStockBranches().map((b) => ({
        branchId: b.id,
        branchName: b.name.replace(/ Branch$/, ''),
        stock: 0,
        restockPoint: 0,
      })),
    )
  }, [isEdit])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Item name is required')
      return
    }
    setSaving(true)
    try {
      const cat = categories.find((c) => c.id === categoryId)
      const payload = {
        name: name.trim().toUpperCase(),
        sku: sku.trim(),
        categoryId: cat?.id,
        categoryName: cat?.name ?? 'N/A',
        supplier: supplier.trim() || undefined,
        retailPrice: Number(retailPrice) || 0,
        baseCost: Number(baseCost) || 0,
        status: (active ? 'active' : 'inactive') as 'active' | 'inactive',
        manufacturingDate: manufacturingDate || undefined,
        expirationDate: expirationDate || undefined,
        removalDate: removalDate || undefined,
      }

      if (isEdit && editId) {
        const existing = getCatalogProductById(editId)
        if (!existing) {
          toast.error('Product not found')
          return
        }
        updateCatalogProduct({
          ...existing,
          ...payload,
          sku: payload.sku || existing.sku,
        })
        saveProductBranchStocks(
          editId,
          stockRows.map((r) => ({
            branchId: r.branchId,
            stock: r.stock,
            restockPoint: r.restockPoint,
          })),
        )
        toast.success('Product updated')
      } else {
        const created = createCatalogProduct({
          name: payload.name,
          sku: payload.sku || undefined,
          categoryId: payload.categoryId,
          supplier: payload.supplier,
          retailPrice: payload.retailPrice,
          baseCost: payload.baseCost,
          status: payload.status,
          manufacturingDate: payload.manufacturingDate,
          expirationDate: payload.expirationDate,
          removalDate: payload.removalDate,
        })
        saveProductBranchStocks(
          created.id,
          stockRows.map((r) => ({
            branchId: r.branchId,
            stock: r.stock,
            restockPoint: r.restockPoint,
          })),
        )
        toast.success('Product added')
      }
      navigate('/admin/catalog/products')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return <p className="text-sm text-slate-ui">Loading product…</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="relative overflow-hidden rounded-[14px] bg-[#0A2E26] px-6 py-6 sm:px-8">
        <div className="absolute inset-y-0 left-0 w-1 bg-[#C5A059]" />
        <h1 className="font-display text-3xl text-[#C5A059] sm:text-4xl">
          {isEdit ? 'Edit Product' : 'Add Product'}
        </h1>
        <p className="mt-1 text-sm text-white/80">
          {isEdit
            ? 'Modify product parameters, stock warning configurations, and status details.'
            : 'Create a retail product with pricing, branch stock alerts, and catalog status.'}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_0.85fr]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-start gap-2">
              <Package className="mt-0.5 h-4 w-4 text-[#C5A059]" />
              <div>
                <h2 className="font-semibold text-[#073D2C]">Product Details</h2>
                <p className="text-sm text-slate-ui">
                  Core catalog identity, categorization, and suppliers information.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={label}>SKU Code</span>
                <input
                  className={control}
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Auto if blank"
                />
              </label>
              <label className="block">
                <span className={label}>Item Name</span>
                <input
                  className={control}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ACNE CREAM 10G"
                  required
                />
              </label>
              <label className="block">
                <span className={label}>Category</span>
                <select
                  className={control}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={label}>Supplier</span>
                <select
                  className={control}
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                >
                  <option value="">Select Supplier</option>
                  {SUPPLIERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-start gap-2">
              <Tag className="mt-0.5 h-4 w-4 text-[#C5A059]" />
              <div>
                <h2 className="font-semibold text-[#073D2C]">Pricing Details</h2>
                <p className="text-sm text-slate-ui">
                  Configure purchase base cost and retail selling prices.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={label}>Retail Price (Selling)</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-ui">
                    ₱
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={cn(control, 'pl-7')}
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(e.target.value)}
                  />
                </div>
              </label>
              <label className="block">
                <span className={label}>Base Cost (Capital)</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-ui">
                    ₱
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={cn(control, 'pl-7')}
                    value={baseCost}
                    onChange={(e) => setBaseCost(e.target.value)}
                  />
                </div>
              </label>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-start gap-2">
              <Boxes className="mt-0.5 h-4 w-4 text-[#C5A059]" />
              <div>
                <h2 className="font-semibold text-[#073D2C]">Stocks Inventory</h2>
                <p className="text-sm text-slate-ui">
                  Configure stock levels and restock warning alerts per branch location.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {stockRows.map((row) => (
                <div
                  key={row.branchId}
                  className="grid gap-3 rounded-[10px] border border-border bg-[#FAFAF8] p-3 sm:grid-cols-[1.2fr_0.7fr_0.7fr]"
                >
                  <p className="self-center text-sm font-semibold text-[#073D2C]">
                    {row.branchName}
                  </p>
                  <label className="block">
                    <span className={label}>Stock</span>
                    <input
                      type="number"
                      min={0}
                      className={control}
                      value={row.stock}
                      onChange={(e) => {
                        const stock = Math.max(0, Number(e.target.value) || 0)
                        setStockRows((prev) =>
                          prev.map((r) => (r.branchId === row.branchId ? { ...r, stock } : r)),
                        )
                      }}
                    />
                  </label>
                  <label className="block">
                    <span className={label}>Restock Point</span>
                    <input
                      type="number"
                      min={0}
                      className={control}
                      value={row.restockPoint}
                      onChange={(e) => {
                        const restockPoint = Math.max(0, Number(e.target.value) || 0)
                        setStockRows((prev) =>
                          prev.map((r) =>
                            r.branchId === row.branchId ? { ...r, restockPoint } : r,
                          ),
                        )
                      }}
                    />
                  </label>
                </div>
              ))}
              {stockRows.length === 0 ? (
                <p className="text-sm text-slate-ui">No active clinic branches available.</p>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-[#C5A059]" />
              <h2 className="font-semibold text-[#073D2C]">Product Settings</h2>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-charcoal">Active Status</p>
                <p className="text-xs text-slate-ui">Viewable in store catalog</p>
              </div>
              <Switch checked={active} onChange={setActive} ariaLabel="Active status" />
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 text-[#C5A059]" />
              <div>
                <h2 className="font-semibold text-[#073D2C]">Inventory Dates</h2>
                <p className="text-sm text-slate-ui">Lifecycle milestones and metrics tracking.</p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className={label}>Manufacturing Date</span>
                <input
                  type="date"
                  className={control}
                  value={manufacturingDate}
                  onChange={(e) => setManufacturingDate(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={label}>Expiration Date</span>
                <input
                  type="date"
                  className={control}
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={label}>Removal Date</span>
                <input
                  type="date"
                  className={control}
                  value={removalDate}
                  onChange={(e) => setRemovalDate(e.target.value)}
                />
              </label>
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Link to="/admin/catalog/products">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Product'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
