import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { demoBranches } from '@/constants/demoData'
import {
  createStockTransfer,
  getBranchStock,
  getTransferableItems,
} from '@/services/stockTransferService'
import type { StockTransferItemType } from '@/types'
import { cn } from '@/utils/cn'

const labelCls =
  'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal'
const controlCls =
  'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15'

function Required() {
  return <span className="text-red-500"> *</span>
}

export function NewStockTransferPage() {
  const navigate = useNavigate()
  const branches = demoBranches.filter((b) => b.status === 'active')

  const [sourceBranchId, setSourceBranchId] = useState('')
  const [targetBranchId, setTargetBranchId] = useState('')
  const [itemType, setItemType] = useState<StockTransferItemType>('product')
  const [itemId, setItemId] = useState('')
  const [itemQuery, setItemQuery] = useState('')
  const [quantity, setQuantity] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)

  const items = useMemo(() => getTransferableItems(itemType), [itemType])

  const filteredItems = useMemo(() => {
    if (!itemQuery.trim()) return items
    const q = itemQuery.toLowerCase()
    return items.filter((i) => i.name.toLowerCase().includes(q))
  }, [items, itemQuery])

  const selectedItem = items.find((i) => i.id === itemId)
  const sourceBranch = branches.find((b) => b.id === sourceBranchId)
  const targetBranch = branches.find((b) => b.id === targetBranchId)

  const available =
    sourceBranchId && itemId ? getBranchStock(sourceBranchId, itemType, itemId) : 0

  const canSubmit =
    !!sourceBranchId &&
    !!targetBranchId &&
    sourceBranchId !== targetBranchId &&
    !!itemId &&
    Number(quantity) > 0 &&
    Number(quantity) <= available

  function onItemTypeChange(type: StockTransferItemType) {
    setItemType(type)
    setItemId('')
    setItemQuery('')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    try {
      createStockTransfer({
        sourceBranchId,
        targetBranchId,
        itemType,
        itemId,
        quantity: Number(quantity),
        remarks: remarks.trim() || undefined,
      })
      toast.success('Branch transfer completed')
      navigate('/admin/operations/stock-transfers')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transfer failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AdminPageBanner
        title="New Branch Transfer"
        description="Perform direct stock transfers from one branch inventory pool to another. Instantly verify active quantities at the source branch."
        actions={
          <Link to="/admin/operations/stock-transfers">
            <Button
              type="button"
              variant="secondary"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" /> Transfer Logs
            </Button>
          </Link>
        }
      />

      <Card className="p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h2 className="text-base font-bold text-charcoal">Perform Direct Stock Transfer</h2>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className={labelCls}>
                  Source Branch
                  <Required />
                </span>
                <select
                  className={controlCls}
                  value={sourceBranchId}
                  onChange={(e) => setSourceBranchId(e.target.value)}
                  required
                >
                  <option value="">Select Source Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-slate-ui">
                  Select the branch you want to transfer stock FROM.
                </span>
              </label>

              <label className="block">
                <span className={labelCls}>
                  Target Branch
                  <Required />
                </span>
                <select
                  className={controlCls}
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  required
                >
                  <option value="">Select Target Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} disabled={b.id === sourceBranchId}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-slate-ui">
                  Select the branch you want to transfer stock TO.
                </span>
              </label>

              <fieldset>
                <legend className={labelCls}>
                  Item Type
                  <Required />
                </legend>
                <div className="mt-1 space-y-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="itemType"
                      checked={itemType === 'product'}
                      onChange={() => onItemTypeChange('product')}
                      className="text-emerald-800 focus:ring-emerald-700/30"
                    />
                    Product (Retail/Installment)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="itemType"
                      checked={itemType === 'consumable'}
                      onChange={() => onItemTypeChange('consumable')}
                      className="text-emerald-800 focus:ring-emerald-700/30"
                    />
                    Consumable (Clinic Use)
                  </label>
                </div>
              </fieldset>

              <div>
                <span className={labelCls}>
                  {itemType === 'product' ? 'Product Name' : 'Consumable Name'}
                  <Required />
                </span>
                <input
                  className={controlCls}
                  placeholder="Search and select an item..."
                  value={itemQuery}
                  onChange={(e) => {
                    setItemQuery(e.target.value)
                    setItemId('')
                  }}
                  list="stock-transfer-items"
                />
                <datalist id="stock-transfer-items">
                  {filteredItems.map((i) => (
                    <option key={i.id} value={i.name} />
                  ))}
                </datalist>
                <select
                  className={cn(controlCls, 'mt-2')}
                  value={itemId}
                  onChange={(e) => {
                    const id = e.target.value
                    setItemId(id)
                    const hit = items.find((i) => i.id === id)
                    if (hit) setItemQuery(hit.name)
                  }}
                  required
                >
                  <option value="">Select item…</option>
                  {filteredItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="block">
                <span className={labelCls}>
                  Quantity to Transfer
                  <Required />
                </span>
                <input
                  type="number"
                  min={1}
                  max={available || undefined}
                  className={controlCls}
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className={labelCls}>Remarks / Notes</span>
                <textarea
                  className="min-h-[100px] w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
                  placeholder="Enter transfer reason or notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="rounded-[12px] border border-border bg-[#F7F5F1] p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-emerald-800" />
              <h3 className="text-sm font-bold text-charcoal">Transfer Overview</h3>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[10px] border border-border bg-white px-3 py-3 text-center text-xs">
              <div>
                <p className="font-bold uppercase tracking-wide text-slate-ui">From</p>
                <p className="mt-1 text-sm font-semibold text-[#073D2C]">
                  {sourceBranch?.name || 'Select Source Branch'}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-emerald-800" />
              <div>
                <p className="font-bold uppercase tracking-wide text-slate-ui">To</p>
                <p className="mt-1 text-sm font-semibold text-[#073D2C]">
                  {targetBranch?.name || 'Select Target Branch'}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-ui">
                Selected Item
              </p>
              <p className="mt-1 font-display text-xl text-[#073D2C]">
                {selectedItem?.name || (itemType === 'product' ? 'Select Product' : 'Select Consumable')}
              </p>
            </div>

            <div className="mt-6 border-t border-border/80 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-ui">
                Available Stock at Source:
              </p>
              <p className="mt-1 font-metric text-4xl font-semibold tracking-tight text-[#073D2C]">{available}</p>
              <p className="mt-2 text-xs text-slate-ui">
                {sourceBranchId && itemId
                  ? 'Quantity available for transfer from the selected source branch.'
                  : 'Please select a source branch and an item to check stock.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <Link to="/admin/operations/stock-transfers">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={!canSubmit || saving}>
            {saving ? 'Transferring…' : 'Perform Transfer'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </form>
  )
}
