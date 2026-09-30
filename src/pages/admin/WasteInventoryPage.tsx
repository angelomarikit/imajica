import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  daysExpired,
  getWasteBranches,
  getWasteItems,
  subscribeWaste,
} from '@/services/wasteService'
import { formatPeso } from '@/utils/currency'
import { useAuth } from '@/contexts/AuthContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { isFranchiseBranchOwner } from '@/utils/franchiseAccess'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function WasteInventoryPage() {
  const { user } = useAuth()
  const forcedBranchId = useForcedBranchId()
  const franchiseOwner = isFranchiseBranchOwner(user)
  const [items, setItems] = useState(() => getWasteItems())
  const [branchFilter, setBranchFilter] = useState(
    franchiseOwner ? user?.branchName ?? 'all' : 'all',
  )

  useEffect(() => subscribeWaste(() => setItems(getWasteItems())), [])

  useEffect(() => {
    if (franchiseOwner && user?.branchName) setBranchFilter(user.branchName)
  }, [franchiseOwner, user?.branchName])

  const branches = useMemo(() => getWasteBranches(), [items])

  const filtered = useMemo(() => {
    if (branchFilter === 'all') return items
    return items.filter((i) => i.branchName === branchFilter)
  }, [items, branchFilter])

  void forcedBranchId

  function exportCsv() {
    const header = [
      'Product Name',
      'Category',
      'Branch',
      'Base Price',
      'Expiry Date',
      'Days Expired',
    ]
    const rows = filtered.map((i) => [
      i.productName,
      i.category,
      i.branchName,
      String(i.basePrice),
      i.expiryDate,
      String(daysExpired(i.expiryDate)),
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'imajica-waste-inventory.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported waste inventory CSV')
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Waste Inventory"
        description="Monitor expired and wasted products dynamically across your clinic branch network. Track loss value, product details, and days expired."
        stat={{ value: filtered.length, label: 'Expired Items' }}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-charcoal sm:text-lg">Expired Products List</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 min-w-[160px] rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              disabled={franchiseOwner}
            >
              {!franchiseOwner && <option value="all">All Branches</option>}
              {(franchiseOwner && user?.branchName
                ? [user.branchName]
                : branches
              ).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <Button onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Product Name</th>
                <th className="px-2 py-3">Category</th>
                <th className="px-2 py-3">Branch</th>
                <th className="px-2 py-3">Base Price</th>
                <th className="px-2 py-3">Expiry Date</th>
                <th className="px-2 py-3">Days Expired</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const days = daysExpired(item.expiryDate)
                return (
                  <tr key={item.id} className="border-t border-border/70 hover:bg-ivory-100">
                    <td className="px-2 py-3 font-medium uppercase tracking-wide text-charcoal">
                      {item.productName}
                    </td>
                    <td className="px-2 py-3">
                      <Badge variant="info">{item.category}</Badge>
                    </td>
                    <td className="px-2 py-3">
                      <Badge variant="neutral">{item.branchName}</Badge>
                    </td>
                    <td className="px-2 py-3 text-charcoal">{formatPeso(item.basePrice)}</td>
                    <td className="px-2 py-3 text-slate-ui">{formatDate(item.expiryDate)}</td>
                    <td className="px-2 py-3">
                      <Badge variant="danger">{days} days</Badge>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={6} className="px-2 py-12 text-center text-sm text-slate-ui">
                    No expired products found for this filter.
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
