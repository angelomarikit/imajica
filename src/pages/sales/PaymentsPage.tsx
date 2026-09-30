import { useEffect, useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { getSales, preloadSalesData, subscribeSalesData } from '@/services/salesService'
import type { Sale } from '@/types'
import { formatPeso } from '@/utils/currency'
import { useAuth } from '@/contexts/AuthContext'
import { isFranchiseBranchOwner } from '@/utils/franchiseAccess'

export function PaymentsPage() {
  const { user } = useAuth()
  const forcedBranchId = useForcedBranchId()
  const franchiseOwner = isFranchiseBranchOwner(user)
  const [invoice, setInvoice] = useState<Sale | null>(null)
  const [salesTick, setSalesTick] = useState(0)

  useEffect(() => {
    void preloadSalesData().then(() => setSalesTick((n) => n + 1))
    return subscribeSalesData(() => setSalesTick((n) => n + 1))
  }, [])

  const sales = useMemo(() => {
    void salesTick
    const all = getSales()
    if (!forcedBranchId) return all
    return all.filter((s) => s.branchId === forcedBranchId)
  }, [forcedBranchId, salesTick])

  function printSaleInvoice(sale: Sale) {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900')
    if (!w) return
    w.document.write(`<!doctype html><html><head><title>${sale.invoiceNumber}</title>
      <style>
        body{font-family:Georgia,serif;color:#073D2C;padding:32px}
        h1{color:#C5A059;margin:0}
        .meta{margin-top:12px;font-family:system-ui,sans-serif;font-size:13px;color:#64748b}
      </style></head><body>
      <h1>Imajica Medical Aesthetics</h1>
      <p class="meta">Sales Invoice</p>
      <h2 style="margin-top:20px">${sale.invoiceNumber}</h2>
      <div class="meta">
        <div>Date: ${new Date(sale.createdAt).toLocaleString()}</div>
        <div>Client: ${sale.clientName}</div>
        <div>Branch: ${sale.branchName}</div>
        <div>Item: ${sale.treatmentOrPackage}</div>
        <div>Method: ${sale.paymentMethod.replace('_', ' ')}</div>
      </div>
      <p style="margin-top:24px;font-size:1.35rem"><strong>Total: ${formatPeso(sale.totalAmount)}</strong></p>
      </body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        eyebrow="Sales"
        title={franchiseOwner ? 'Franchise Sale' : 'Payments'}
        description={
          franchiseOwner
            ? `Sales and invoices for ${user?.branchName ?? 'your franchise branch'}.`
            : 'Review recent booking payments, settlement status, and sales invoices.'
        }
        stat={{ value: sales.length, label: 'Total Sales' }}
      />

      <Card className="p-4 sm:p-5">
        <h2 className="font-display text-2xl text-[#073D2C]">Recent Bookings / Payments</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Invoice #</th>
                <th className="px-2 py-3">Date</th>
                <th className="px-2 py-3">Client</th>
                <th className="px-2 py-3">Item</th>
                <th className="px-2 py-3">Branch</th>
                <th className="px-2 py-3">Amount</th>
                <th className="px-2 py-3">Method</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-2 py-8 text-center text-slate-ui">
                    No sales for this branch yet.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="border-t border-border/70 hover:bg-ivory-100">
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => setInvoice(s)}
                        className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        {s.invoiceNumber}
                      </button>
                    </td>
                    <td className="px-2 py-3 text-slate-ui">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-3">{s.clientName}</td>
                    <td className="px-2 py-3">{s.treatmentOrPackage}</td>
                    <td className="px-2 py-3 text-slate-ui">{s.branchName}</td>
                    <td className="px-2 py-3 font-medium">{formatPeso(s.totalAmount)}</td>
                    <td className="px-2 py-3 capitalize text-slate-ui">
                      {s.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="px-2 py-3">
                      <Badge variant={s.status === 'paid' ? 'success' : 'neutral'}>{s.status}</Badge>
                    </td>
                    <td className="px-2 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => printSaleInvoice(s)}
                      >
                        <FileText className="h-3.5 w-3.5" /> Print
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {invoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-emerald-950/40"
            aria-label="Close"
            onClick={() => setInvoice(null)}
          />
          <Card className="relative z-10 w-full max-w-md p-6">
            <h3 className="font-display text-2xl text-[#073D2C]">{invoice.invoiceNumber}</h3>
            <p className="mt-2 text-sm text-slate-ui">{invoice.clientName}</p>
            <p className="mt-4 text-lg font-semibold">{formatPeso(invoice.totalAmount)}</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setInvoice(null)}>
                Close
              </Button>
              <Button type="button" onClick={() => printSaleInvoice(invoice)}>
                Print
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
