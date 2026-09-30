import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  Clock,
  FilePenLine,
  Minus,
  Package,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { useAuth } from '@/contexts/AuthContext'
import {
  adjustWarehouseStock,
  deleteWarehouseItem,
  getWarehouseItems,
  getWarehouseMovements,
  subscribeWarehouse,
  updateWarehouseItem,
  WAREHOUSE_UNIT_TYPES,
} from '@/services/warehouseService'
import type { WarehouseItem, WarehouseItemType } from '@/types'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'
import { isFranchiseBranchOwner } from '@/utils/franchiseAccess'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function WarehousePage() {
  const { user } = useAuth()
  const franchiseOwner = isFranchiseBranchOwner(user)
  const [items, setItems] = useState(() => getWarehouseItems())
  const [tab, setTab] = useState<WarehouseItemType>('product')
  const [query, setQuery] = useState('')
  const [historyItem, setHistoryItem] = useState<WarehouseItem | null>(null)
  const [editItem, setEditItem] = useState<WarehouseItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editPrice, setEditPrice] = useState('0')

  useEffect(() => subscribeWarehouse(() => setItems(getWarehouseItems())), [])

  if (franchiseOwner) {
    return <Navigate to="/admin/catalog/products" replace />
  }

  const products = useMemo(() => items.filter((i) => i.itemType === 'product'), [items])
  const consumables = useMemo(() => items.filter((i) => i.itemType === 'consumable'), [items])

  const filtered = useMemo(() => {
    const list = tab === 'product' ? products : consumables
    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter((i) => i.name.toLowerCase().includes(q))
  }, [tab, products, consumables, query])

  function openEdit(item: WarehouseItem) {
    setEditItem(item)
    setEditName(item.name)
    setEditUnit(item.unitType ?? '')
    setEditPrice(String(item.acquisitionPrice))
  }

  function saveEdit() {
    if (!editItem) return
    if (!editName.trim()) {
      toast.error('Item name is required')
      return
    }
    updateWarehouseItem(editItem.id, {
      name: editName,
      unitType: editUnit || undefined,
      acquisitionPrice: Number(editPrice) || 0,
    })
    toast.success('Item updated')
    setEditItem(null)
  }

  function onAdjust(item: WarehouseItem, delta: number) {
    const label = delta > 0 ? 'Stock in' : 'Stock out'
    const qty = Math.abs(delta)
    const updated = adjustWarehouseStock(item.id, delta, label)
    if (!updated) return
    if (delta < 0 && item.warehouseStock === 0) {
      toast.error('Already out of stock')
      return
    }
    toast.success(`${label}: ${qty}`)
  }

  function onDelete(item: WarehouseItem) {
    if (!window.confirm(`Delete ${item.name}?`)) return
    deleteWarehouseItem(item.id)
    toast.success('Item deleted')
  }

  const movements = historyItem ? getWarehouseMovements(historyItem.id) : []

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Central Warehouse"
        description="Manage and track clinic bulk inventory stock levels, products, and consumables in the centralized clinic warehouse repository."
        stat={{ value: items.length, label: 'Total Items' }}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-charcoal sm:text-lg">Warehouse Stock Control</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
              <input
                className="h-10 w-56 rounded-full border border-border bg-white pl-9 pr-3 text-sm"
                placeholder="Search items..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Link to="/admin/operations/warehouse/new">
              <Button>
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-4 flex gap-6 border-b border-border text-sm font-semibold">
          <TabButton
            active={tab === 'product'}
            onClick={() => setTab('product')}
            icon={<Package className="h-4 w-4" />}
            label="Products"
            count={products.length}
          />
          <TabButton
            active={tab === 'consumable'}
            onClick={() => setTab('consumable')}
            icon={<Sparkles className="h-4 w-4" />}
            label="Consumables"
            count={consumables.length}
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Item Name</th>
                <th className="px-2 py-3">Unit</th>
                <th className="px-2 py-3">Warehouse Stock</th>
                <th className="px-2 py-3">Price</th>
                <th className="px-2 py-3">Date Created</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-border/70 hover:bg-ivory-100">
                  <td className="px-2 py-3 font-semibold uppercase tracking-wide text-charcoal">
                    {item.name}
                  </td>
                  <td className="px-2 py-3 text-slate-ui">{item.unitType || '—'}</td>
                  <td className="px-2 py-3">
                    {item.warehouseStock <= 0 ? (
                      <Badge variant="danger">Out of Stock</Badge>
                    ) : item.warehouseStock <= 5 ? (
                      <Badge variant="warning">{item.warehouseStock}</Badge>
                    ) : (
                      <Badge variant="success">{item.warehouseStock}</Badge>
                    )}
                  </td>
                  <td className="px-2 py-3">{formatPeso(item.acquisitionPrice)}</td>
                  <td className="px-2 py-3 text-slate-ui">{formatDate(item.createdAt)}</td>
                  <td className="px-2 py-3">
                    <div className="flex gap-1.5">
                      <IconBtn
                        label="Add stock"
                        className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        onClick={() => onAdjust(item, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn
                        label="Remove stock"
                        className="bg-orange-100 text-orange-700 hover:bg-orange-200"
                        onClick={() => onAdjust(item, -1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn
                        label="History"
                        className="bg-violet-100 text-violet-700 hover:bg-violet-200"
                        onClick={() => setHistoryItem(item)}
                      >
                        <Clock className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn
                        label="Edit"
                        className="bg-sky-100 text-sky-700 hover:bg-sky-200"
                        onClick={() => openEdit(item)}
                      >
                        <FilePenLine className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn
                        label="Delete"
                        className="bg-rose-100 text-rose-700 hover:bg-rose-200"
                        onClick={() => onDelete(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={6} className="px-2 py-12 text-center text-sm text-slate-ui">
                    No warehouse items found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Edit Warehouse Item"
      >
        {editItem ? (
          <div className="space-y-4">
            <label className="block text-xs">
              <span className="mb-1 block font-bold uppercase tracking-wide text-slate-ui">
                Item Name
              </span>
              <input
                className="h-10 w-full rounded-[10px] border border-border px-3 text-sm"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-bold uppercase tracking-wide text-slate-ui">
                Unit Type
              </span>
              <select
                className="h-10 w-full rounded-[10px] border border-border px-3 text-sm"
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
              >
                <option value="">—</option>
                {WAREHOUSE_UNIT_TYPES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-bold uppercase tracking-wide text-slate-ui">
                Acquisition Price
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="h-10 w-full rounded-[10px] border border-border px-3 text-sm"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditItem(null)}>
                Cancel
              </Button>
              <Button onClick={saveEdit}>Save</Button>
            </div>
          </div>
        ) : null}
      </Drawer>

      {historyItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-emerald-950/40"
            aria-label="Close history"
            onClick={() => setHistoryItem(null)}
          />
          <div className="relative z-10 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-[14px] bg-white p-5 shadow-xl">
            <h3 className="font-display text-2xl text-[#073D2C]">Stock History</h3>
            <p className="mt-1 text-sm font-medium uppercase text-slate-ui">{historyItem.name}</p>
            <div className="mt-4 space-y-2">
              {movements.length ? (
                movements.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-[10px] border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-[#073D2C]">
                        {m.delta > 0 ? '+' : ''}
                        {m.delta} {m.note ? `· ${m.note}` : ''}
                      </p>
                      <p className="text-xs text-slate-ui">
                        {new Date(m.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-slate-ui">No stock movements yet.</p>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setHistoryItem(null)}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 border-b-2 pb-2.5 transition',
        active
          ? 'border-[#073D2C] text-[#073D2C]'
          : 'border-transparent text-slate-ui hover:text-[#073D2C]',
      )}
    >
      {icon}
      {label}
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
        {count}
      </span>
    </button>
  )
}

function IconBtn({
  children,
  className,
  onClick,
  label,
}: {
  children: ReactNode
  className: string
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] transition ${className}`}
    >
      {children}
    </button>
  )
}
