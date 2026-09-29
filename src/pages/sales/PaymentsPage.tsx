import { useState } from 'react'
import { FileText } from 'lucide-react'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { demoSales } from '@/constants/demoData'
import type { Sale } from '@/types'
import { formatPeso } from '@/utils/currency'

export function PaymentsPage() {
  const [invoice, setInvoice] = useState<Sale | null>(null)

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
        title="Payments"
        description="Review recent booking payments, settlement status, and sales invoices."
        stat={{ value: demoSales.length, label: 'Total Sales' }}
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
              {demoSales.map((s) => (
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
                  <td className="px-2 py-3 font-medium text-[#073D2C]">{s.clientName}</td>
                  <td className="px-2 py-3">{s.treatmentOrPackage}</td>
                  <td className="px-2 py-3">{s.branchName}</td>
                  <td className="px-2 py-3 font-semibold">{formatPeso(s.totalAmount)}</td>
                  <td className="px-2 py-3 capitalize">{s.paymentMethod.replace('_', ' ')}</td>
                  <td className="px-2 py-3">
                    <Badge variant="success">{s.status}</Badge>
                  </td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      aria-label="Print invoice"
                      title="Print invoice"
                      onClick={() => printSaleInvoice(s)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-emerald-100 text-emerald-800 transition hover:bg-emerald-200"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {invoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-emerald-950/40"
            aria-label="Close invoice"
            onClick={() => setInvoice(null)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-[14px] bg-white p-6 shadow-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C5A059]">
              Sales Invoice
            </p>
            <h3 className="font-display text-2xl text-[#073D2C]">{invoice.invoiceNumber}</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-ui">
              <p>
                <span className="font-semibold text-[#073D2C]">Client:</span> {invoice.clientName}
              </p>
              <p>
                <span className="font-semibold text-[#073D2C]">Item:</span>{' '}
                {invoice.treatmentOrPackage}
              </p>
              <p>
                <span className="font-semibold text-[#073D2C]">Branch:</span> {invoice.branchName}
              </p>
              <p>
                <span className="font-semibold text-[#073D2C]">Date:</span>{' '}
                {new Date(invoice.createdAt).toLocaleString()}
              </p>
            </div>
            <p className="mt-5 font-metric text-3xl font-semibold tracking-tight text-[#073D2C]">
              {formatPeso(invoice.totalAmount)}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setInvoice(null)}>
                Close
              </Button>
              <Button onClick={() => printSaleInvoice(invoice)}>
                <FileText className="h-4 w-4" /> Print Invoice
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
