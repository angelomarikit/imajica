import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getStockTransfers, subscribeStockTransfers } from '@/services/stockTransferService'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function StockTransfersPage() {
  const [logs, setLogs] = useState(() => getStockTransfers())

  useEffect(() => subscribeStockTransfers(() => setLogs(getStockTransfers())), [])

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Branch Transfers"
        description="Initiate and log stock transfers dynamically between active clinic branches. Keep records of item types, quantities, and transfer paths."
        stat={{ value: logs.length, label: 'Total Logs' }}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-charcoal sm:text-lg">Transfer History Log</h2>
          <Link to="/admin/operations/stock-transfers/new">
            <Button>
              <Plus className="h-4 w-4" /> New Branch Transfer
            </Button>
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-[#F3F1EC] text-[11px] font-bold uppercase tracking-wide text-slate-ui">
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Item Type</th>
                <th className="px-3 py-3">Item Name</th>
                <th className="px-3 py-3">Source Branch</th>
                <th className="px-3 py-3">Target Branch</th>
                <th className="px-3 py-3">Quantity</th>
                <th className="px-3 py-3">Performed By</th>
                <th className="px-3 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id} className="border-t border-border/70 hover:bg-ivory-100">
                  <td className="px-3 py-3 text-slate-ui">{formatDate(row.transferDate)}</td>
                  <td className="px-3 py-3">
                    <Badge variant={row.itemType === 'product' ? 'info' : 'purple'}>
                      {row.itemType === 'product' ? 'Product' : 'Consumable'}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 font-medium uppercase text-charcoal">{row.itemName}</td>
                  <td className="px-3 py-3">{row.sourceBranchName}</td>
                  <td className="px-3 py-3">{row.targetBranchName}</td>
                  <td className="px-3 py-3 font-semibold text-[#073D2C]">{row.quantity}</td>
                  <td className="px-3 py-3 text-slate-ui">{row.performedBy}</td>
                  <td className="px-3 py-3 text-slate-ui">{row.remarks || '—'}</td>
                </tr>
              ))}
              {!logs.length ? (
                <tr>
                  <td colSpan={8} className="px-3 py-14 text-center text-sm text-charcoal">
                    No branch-to-branch transfers found.{' '}
                    <Link
                      to="/admin/operations/stock-transfers/new"
                      className="font-semibold text-emerald-800 underline-offset-2 hover:underline"
                    >
                      Perform one now
                    </Link>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
