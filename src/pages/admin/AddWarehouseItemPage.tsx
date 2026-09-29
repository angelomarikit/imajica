import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  createWarehouseItem,
  WAREHOUSE_UNIT_TYPES,
} from '@/services/warehouseService'
import type { WarehouseItemType } from '@/types'

const labelCls =
  'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal'
const controlCls =
  'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15'

function Required() {
  return <span className="text-red-500"> *</span>
}

export function AddWarehouseItemPage() {
  const navigate = useNavigate()
  const [itemType, setItemType] = useState<WarehouseItemType | ''>('')
  const [unitType, setUnitType] = useState('')
  const [name, setName] = useState('')
  const [stock, setStock] = useState('0')
  const [price, setPrice] = useState('0.00')
  const [saving, setSaving] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!itemType) {
      toast.error('Select an item type')
      return
    }
    if (!name.trim()) {
      toast.error('Item name is required')
      return
    }
    setSaving(true)
    try {
      createWarehouseItem({
        itemType,
        name,
        unitType: unitType || undefined,
        warehouseStock: Number(stock) || 0,
        acquisitionPrice: Number(price) || 0,
      })
      toast.success('Warehouse item created')
      navigate('/admin/operations/warehouse')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AdminPageBanner
        title="Add Central Stock"
        description="Register new product models or active consumables under central clinic warehouse repository controls."
        actions={
          <Link to="/admin/operations/warehouse">
            <Button
              type="button"
              variant="secondary"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Catalog
            </Button>
          </Link>
        }
      />

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-emerald-800" />
          <h2 className="text-base font-bold text-charcoal">
            Add New Warehouse Inventory Item
          </h2>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-4">
            <label className="block">
              <span className={labelCls}>
                Item Type
                <Required />
              </span>
              <select
                className={controlCls}
                value={itemType}
                onChange={(e) => setItemType(e.target.value as WarehouseItemType | '')}
                required
              >
                <option value="">--Select Type--</option>
                <option value="product">Product</option>
                <option value="consumable">Consumable</option>
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Unit Type</span>
              <select
                className={controlCls}
                value={unitType}
                onChange={(e) => setUnitType(e.target.value)}
              >
                <option value="">--Select Unit--</option>
                {WAREHOUSE_UNIT_TYPES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>
                Item Name
                <Required />
              </span>
              <input
                className={controlCls}
                placeholder="Enter item name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className={labelCls}>
                Initial Warehouse Stock
                <Required />
              </span>
              <input
                type="number"
                min={0}
                className={controlCls}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className={labelCls}>
                Acquisition Price
                <Required />
              </span>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-ui">
                  ₱
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={`${controlCls} pl-7`}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Link to="/admin/operations/warehouse">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create Item'}
          </Button>
        </div>
      </Card>
    </form>
  )
}
