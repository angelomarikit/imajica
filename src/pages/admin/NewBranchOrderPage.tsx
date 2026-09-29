import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Box, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { demoBranches } from '@/constants/demoData'
import {
  BRANCH_ORDER_SUPPLIER,
  createBranchOrder,
  getBranchOrderById,
  UNIT_TYPES,
  updateBranchOrder,
} from '@/services/branchOrderService'
import { getCatalogProducts, getConsumables } from '@/services/productCatalogService'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'

const labelCls =
  'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal'
const controlCls =
  'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15'

type DraftLine = {
  category: string
  unitType: string
  name: string
  quantity: string
  unitPrice: string
}

function emptyLine(): DraftLine {
  return { category: 'Product', unitType: 'Piece', name: '', quantity: '1', unitPrice: '0' }
}

function Required() {
  return <span className="text-red-500"> *</span>
}

export function NewBranchOrderPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('edit')
  const existing = editId ? getBranchOrderById(editId) : undefined

  const matchedBranch =
    existing?.branchId && demoBranches.some((b) => b.id === existing.branchId)
      ? existing.branchId
      : existing
        ? demoBranches.find((b) => b.name === existing.branchName)?.id ??
          (existing.branchName ? '__custom__' : '')
        : ''

  const [branchId, setBranchId] = useState(matchedBranch)
  const [branchName, setBranchName] = useState(existing?.branchName ?? '')
  const [orderDate, setOrderDate] = useState(
    existing?.orderDate ?? new Date().toISOString().slice(0, 10),
  )
  const [phone, setPhone] = useState(existing?.phone ?? '')
  const [contactPerson, setContactPerson] = useState(existing?.contactPerson ?? '')
  const [deductOnDailyCash, setDeductOnDailyCash] = useState(
    existing?.deductOnDailyCash ?? false,
  )
  const [remarks, setRemarks] = useState(existing?.remarks ?? '')
  const [shipping, setShipping] = useState(String(existing?.shipping ?? 0))
  const [otherCharges, setOtherCharges] = useState(String(existing?.otherCharges ?? 0))
  const [lines, setLines] = useState<DraftLine[]>(
    existing?.items.length
      ? existing.items.map((i) => ({
          category: i.category,
          unitType: i.unitType,
          name: i.name,
          quantity: String(i.quantity),
          unitPrice: String(i.unitPrice),
        }))
      : [],
  )
  const [saving, setSaving] = useState(false)

  const catalogNames = useMemo(() => {
    const products = getCatalogProducts().map((p) => ({
      name: p.name,
      category: 'Product',
      unitPrice: p.retailPrice,
    }))
    const consumables = getConsumables().map((c) => ({
      name: c.name,
      category: 'Consumable',
      unitPrice: c.price,
    }))
    return [...products, ...consumables]
  }, [])

  const subtotal = lines.reduce((sum, l) => {
    const q = Number(l.quantity) || 0
    const p = Number(l.unitPrice) || 0
    return sum + q * p
  }, 0)
  const ship = Number(shipping) || 0
  const other = Number(otherCharges) || 0
  const total = subtotal + ship + other

  function onBranchChange(id: string) {
    setBranchId(id)
    if (id === '__custom__' && existing) {
      setBranchName(existing.branchName)
      return
    }
    const b = demoBranches.find((x) => x.id === id)
    setBranchName(b?.name ?? '')
    if (b?.phone && !phone) setPhone(b.phone.replace(/\s/g, ''))
  }

  function addItem() {
    setLines((rows) => [...rows, emptyLine()])
  }

  function updateLine(idx: number, patch: Partial<DraftLine>) {
    setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  function pickCatalogName(idx: number, name: string) {
    const hit = catalogNames.find((c) => c.name === name)
    updateLine(idx, {
      name,
      category: hit?.category ?? lines[idx]?.category ?? 'Product',
      unitPrice: hit ? String(hit.unitPrice) : lines[idx]?.unitPrice,
    })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!branchName.trim()) {
      toast.error('Please select a branch')
      return
    }
    if (!contactPerson.trim()) {
      toast.error('Contact person is required')
      return
    }
    const items = lines
      .map((l) => {
        const quantity = Number(l.quantity)
        const unitPrice = Number(l.unitPrice)
        if (!l.name.trim() || !Number.isFinite(quantity) || quantity <= 0) return null
        return {
          category: l.category,
          unitType: l.unitType,
          name: l.name.trim(),
          quantity,
          unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        }
      })
      .filter(Boolean) as {
      category: string
      unitType: string
      name: string
      quantity: number
      unitPrice: number
    }[]

    if (!items.length) {
      toast.error('Add at least one order item')
      return
    }

    setSaving(true)
    try {
      const payload = {
        branchId: branchId && branchId !== '__custom__' ? branchId : undefined,
        branchName,
        phone: phone.trim() || undefined,
        contactPerson,
        orderDate,
        shipping: ship,
        otherCharges: other,
        deductOnDailyCash,
        remarks: remarks.trim() || undefined,
        items,
      }
      if (existing) {
        updateBranchOrder(existing.id, payload)
        toast.success(`Invoice ${existing.invoiceNumber} updated`)
      } else {
        const created = createBranchOrder(payload)
        toast.success(`Branch order saved — ${created.invoiceNumber}`)
      }
      navigate('/admin/operations/branch-orders')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AdminPageBanner
        title={
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#C5A059]/40 bg-[#C5A059]/15 text-[#C5A059]">
              <Box className="h-5 w-5" />
            </span>
            {existing ? 'Edit Branch Order' : 'Create Branch Order'}
          </span>
        }
        description="Register new branch orders to track and manage warehouse inventories, shipping logistics, and store supplies efficiently."
        actions={
          <div className="min-w-[160px] rounded-[12px] border border-[#C5A059]/35 bg-black/25 px-5 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C5A059]">
              Supplier
            </p>
            <p className="mt-1 font-display text-xl text-white sm:text-2xl">
              {BRANCH_ORDER_SUPPLIER}
            </p>
          </div>
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="text-base font-bold text-charcoal">Branch Order Form</h2>
        </div>

        <div className="space-y-6 px-5 py-5 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>
                Branch
                <Required />
              </span>
              <select
                className={controlCls}
                value={branchId}
                onChange={(e) => onBranchChange(e.target.value)}
                required
              >
                <option value="">Select Branch</option>
                {demoBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
                {branchId === '__custom__' && existing ? (
                  <option value="__custom__">{existing.branchName}</option>
                ) : null}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>
                Date
                <Required />
              </span>
              <input
                type="date"
                className={controlCls}
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className={labelCls}>Phone Number</span>
              <input
                className={controlCls}
                placeholder="e.g., 09325189434"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelCls}>
                Contact Person
                <Required />
              </span>
              <input
                className={controlCls}
                placeholder="e.g., Ms. Shane"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                required
              />
            </label>
          </div>

          <div>
            <h3 className="text-base font-bold text-charcoal">Order Items</h3>
            <div className="mt-3 overflow-x-auto rounded-[10px] border border-border">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#F3F1EC] text-[11px] font-bold uppercase tracking-wide text-charcoal">
                    <th className="px-3 py-3">Item No.</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Unit Type</th>
                    <th className="px-3 py-3">Product/Consumable Name</th>
                    <th className="px-3 py-3">Quantity</th>
                    <th className="px-3 py-3">Unit Price</th>
                    <th className="px-3 py-3">Total</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)
                    return (
                      <tr key={idx} className="border-t border-border/70">
                        <td className="px-3 py-2 text-slate-ui">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <select
                            className="h-9 w-full rounded-[8px] border border-border px-2 text-sm"
                            value={line.category}
                            onChange={(e) => updateLine(idx, { category: e.target.value })}
                          >
                            <option value="Product">Product</option>
                            <option value="Consumable">Consumable</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="h-9 w-full rounded-[8px] border border-border px-2 text-sm"
                            value={line.unitType}
                            onChange={(e) => updateLine(idx, { unitType: e.target.value })}
                          >
                            {UNIT_TYPES.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            list={`bo-catalog-${idx}`}
                            className="h-9 w-full min-w-[180px] rounded-[8px] border border-border px-2 text-sm"
                            placeholder="Select or type name"
                            value={line.name}
                            onChange={(e) => pickCatalogName(idx, e.target.value)}
                          />
                          <datalist id={`bo-catalog-${idx}`}>
                            {catalogNames
                              .filter(
                                (c) =>
                                  line.category === 'Product'
                                    ? c.category === 'Product'
                                    : c.category === 'Consumable',
                              )
                              .map((c) => (
                                <option key={c.name} value={c.name} />
                              ))}
                          </datalist>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            className="h-9 w-24 rounded-[8px] border border-border px-2 text-sm"
                            value={line.quantity}
                            onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-9 w-28 rounded-[8px] border border-border px-2 text-sm"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2 font-medium text-[#073D2C]">
                          {formatPeso(lineTotal)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            aria-label="Remove item"
                            onClick={() => setLines((rows) => rows.filter((_, i) => i !== idx))}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-rose-100 text-rose-700 transition hover:bg-rose-200"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {!lines.length ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-ui">
                        No items yet. Click Add Item to start this order.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-[10px] border border-charcoal/80 bg-white px-4 text-sm font-medium text-charcoal transition hover:bg-ivory-100"
            >
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border text-emerald-800 focus:ring-emerald-700/30"
                  checked={deductOnDailyCash}
                  onChange={(e) => setDeductOnDailyCash(e.target.checked)}
                />
                <span>
                  <span className="block text-sm font-semibold text-charcoal">
                    Deduct on Daily Cash
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-ui">
                    If checked, this branch order cost will be automatically deducted from
                    today&apos;s daily cash record for the selected branch.
                  </span>
                </span>
              </label>
              <label className="block">
                <span className={labelCls}>Remarks</span>
                <textarea
                  className="min-h-[120px] w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
                  placeholder="Enter any additional remarks or notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </label>
            </div>

            <div className="rounded-[12px] border border-border bg-[#F7F5F1] p-4 sm:p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-ui">Subtotal:</span>
                <span className="font-medium text-charcoal">{formatPeso(subtotal)}</span>
              </div>
              <label className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-[11px] font-bold uppercase tracking-wide text-charcoal">
                  Shipping
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-9 w-28 rounded-[8px] border border-border bg-white px-2 text-right text-sm"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                />
              </label>
              <label className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-[11px] font-bold uppercase tracking-wide text-charcoal">
                  Other Charges
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-9 w-28 rounded-[8px] border border-border bg-white px-2 text-right text-sm"
                  value={otherCharges}
                  onChange={(e) => setOtherCharges(e.target.value)}
                />
              </label>
              <div
                className={cn(
                  'mt-4 flex items-center justify-between border-t border-border/80 pt-3',
                )}
              >
                <span className="text-sm font-bold uppercase tracking-wide text-charcoal">
                  Total:
                </span>
                <span className="font-metric text-2xl font-semibold tracking-tight text-[#073D2C]">
                  {formatPeso(total)}
                </span>
              </div>
            </div>
          </div>

          {existing ? (
            <p className="rounded-[10px] bg-sky-50 px-3 py-2 text-xs text-sky-800">
              Editing invoice{' '}
              <span className="font-semibold">{existing.invoiceNumber}</span> — number stays the
              same after save.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Link to="/admin/operations/branch-orders">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : existing ? 'Save Changes' : 'Save Branch Order'}
            </Button>
          </div>
        </div>
      </Card>
    </form>
  )
}
