import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Eye, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import {
  deleteBranchOrder,
  getBranchOrders,
  subscribeBranchOrders,
} from '@/services/branchOrderService'
import type { BranchOrder } from '@/types'
import { formatPeso } from '@/utils/currency'
import { isFranchiseBranchOwner } from '@/utils/franchiseAccess'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function BranchOrdersPage() {
  const { user } = useAuth()
  const franchiseOwner = isFranchiseBranchOwner(user)
  const forcedBranchId = useForcedBranchId()
  const [orders, setOrders] = useState(() => getBranchOrders())
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [invoiceOrder, setInvoiceOrder] = useState<BranchOrder | null>(null)

  useEffect(() => subscribeBranchOrders(() => setOrders(getBranchOrders())), [])

  const filtered = useMemo(() => {
    let list = orders
    if (franchiseOwner) {
      list = list.filter((o) => {
        if (forcedBranchId && o.branchId === forcedBranchId) return true
        if (user?.branchName && o.branchName === user.branchName) return true
        return false
      })
    }
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter((o) =>
      `${o.invoiceNumber} ${o.branchName} ${o.contactPerson} ${o.phone ?? ''}`.toLowerCase().includes(
        q,
      ),
    )
  }, [orders, search, franchiseOwner, forcedBranchId, user?.branchName])

  function handleDelete(order: BranchOrder) {
    if (!window.confirm(`Delete invoice ${order.invoiceNumber}?`)) return
    deleteBranchOrder(order.id)
    toast.success('Order deleted')
  }

  function printInvoice(order: BranchOrder) {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900')
    if (!w) {
      toast.error('Allow pop-ups to print the invoice')
      return
    }
    const rows = order.items
      .map(
        (i) =>
          `<tr><td>${i.itemNo}</td><td>${i.category}</td><td>${i.unitType}</td><td>${i.name}</td><td style="text-align:right">${i.quantity}</td><td style="text-align:right">${formatPeso(i.unitPrice)}</td><td style="text-align:right">${formatPeso(i.lineTotal)}</td></tr>`,
      )
      .join('')
    w.document.write(`<!doctype html><html><head><title>${order.invoiceNumber}</title>
      <style>
        body{font-family:Georgia,serif;color:#073D2C;padding:32px}
        h1{color:#C5A059;margin:0}
        table{width:100%;border-collapse:collapse;margin-top:24px;font-family:system-ui,sans-serif;font-size:13px}
        th,td{border-bottom:1px solid #e8e4dc;padding:8px;text-align:left}
        .meta{margin-top:12px;font-family:system-ui,sans-serif;font-size:13px;color:#64748b}
      </style></head><body>
      <h1>Imajica Medical Aesthetics</h1>
      <p class="meta">Branch Order Invoice · Supplier: ${order.supplier}</p>
      <h2 style="margin-top:20px">${order.invoiceNumber}</h2>
      <div class="meta">
        <div>Date: ${formatDate(order.orderDate)}</div>
        <div>Branch: ${order.branchName}</div>
        <div>Contact: ${order.contactPerson}</div>
        ${order.phone ? `<div>Phone: ${order.phone}</div>` : ''}
      </div>
      <table><thead><tr><th>#</th><th>Category</th><th>Unit</th><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p style="text-align:right;margin-top:12px;font-family:system-ui">Subtotal: ${formatPeso(order.subtotal)}</p>
      <p style="text-align:right;font-family:system-ui">Shipping: ${formatPeso(order.shipping)}</p>
      <p style="text-align:right;font-family:system-ui">Other: ${formatPeso(order.otherCharges)}</p>
      <p style="text-align:right;margin-top:12px;font-size:1.25rem"><strong>Total: ${formatPeso(order.totalAmount)}</strong></p>
      </body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Branch Orders"
        description="Track, manage, and dispatch orders across the branch network. Review items, invoice totals, and download spreadsheets."
        stat={{ value: filtered.length, label: 'Total Orders' }}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl text-[#073D2C]">Branch Orders Log</h2>
          <Link to="/admin/operations/branch-orders/new">
            <Button>
              <Plus className="h-4 w-4" /> New Branch Order
            </Button>
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[240px] flex-1">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-ui">
              Search Orders
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
              <input
                className="h-10 w-full rounded-[10px] border border-border pl-9 pr-3 text-sm"
                placeholder="Search by invoice, branch, contact person..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSearch(query)
                }}
              />
            </div>
          </div>
          <Button onClick={() => setSearch(query)}>Search</Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Invoice #</th>
                <th className="px-2 py-3">Date</th>
                <th className="px-2 py-3">Branch</th>
                <th className="px-2 py-3">Contact Person</th>
                <th className="px-2 py-3">Items</th>
                <th className="px-2 py-3">Total</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-border/70 hover:bg-ivory-100">
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => setInvoiceOrder(o)}
                      className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                    >
                      {o.invoiceNumber}
                    </button>
                  </td>
                  <td className="px-2 py-3 text-slate-ui">{formatDate(o.orderDate)}</td>
                  <td className="px-2 py-3 font-semibold text-[#073D2C]">{o.branchName}</td>
                  <td className="px-2 py-3 uppercase tracking-wide text-slate-ui">
                    {o.contactPerson}
                  </td>
                  <td className="px-2 py-3">
                    <Badge variant="neutral">{o.itemCount} items</Badge>
                  </td>
                  <td className="px-2 py-3 font-semibold text-[#073D2C]">
                    {formatPeso(o.totalAmount)}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-1.5">
                      <IconBtn
                        label="View invoice"
                        className="bg-sky-100 text-sky-700 hover:bg-sky-200"
                        onClick={() => setInvoiceOrder(o)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn
                        label="Print invoice"
                        className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        onClick={() => printInvoice(o)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </IconBtn>
                      <Link
                        to={`/admin/operations/branch-orders/new?edit=${o.id}`}
                        aria-label="Edit"
                        title="Edit"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-orange-100 text-orange-700 transition hover:bg-orange-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <IconBtn
                        label="Delete"
                        className="bg-rose-100 text-rose-700 hover:bg-rose-200"
                        onClick={() => handleDelete(o)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="px-2 py-10 text-center text-slate-ui">
                    No branch orders found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {invoiceOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-emerald-950/40"
            aria-label="Close invoice"
            onClick={() => setInvoiceOrder(null)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[14px] bg-white p-5 shadow-xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C5A059]">
                  Branch Order Invoice
                </p>
                <h3 className="font-display text-2xl text-[#073D2C] sm:text-3xl">
                  {invoiceOrder.invoiceNumber}
                </h3>
              </div>
              <Button variant="secondary" onClick={() => setInvoiceOrder(null)}>
                Close
              </Button>
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <Meta label="Date" value={formatDate(invoiceOrder.orderDate)} />
              <Meta label="Branch" value={invoiceOrder.branchName} />
              <Meta label="Contact" value={invoiceOrder.contactPerson} />
              <Meta label="Supplier" value={invoiceOrder.supplier} />
            </div>
            <div className="mt-4 overflow-x-auto rounded-[10px] border border-border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-ivory-100 text-xs uppercase text-slate-ui">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceOrder.items.map((i) => (
                    <tr key={i.id} className="border-t border-border/70">
                      <td className="px-3 py-2">{i.itemNo}</td>
                      <td className="px-3 py-2">{i.name}</td>
                      <td className="px-3 py-2 text-right">{i.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatPeso(i.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatPeso(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-metric text-2xl font-semibold tracking-tight text-[#073D2C]">
                {formatPeso(invoiceOrder.totalAmount)}
              </p>
              <Button onClick={() => printInvoice(invoiceOrder)}>
                <FileText className="h-4 w-4" /> Print Invoice
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-ui">{label}</p>
      <p className="font-medium text-[#073D2C]">{value}</p>
    </div>
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
