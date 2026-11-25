import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { isLowStock, listInventory, type InventoryRow } from '@/services/inventoryService'
import { canAccessHqOps, HQ_SENTINEL_BRANCH_ID } from '@/utils/franchiseAccess'

export function LowStockPanel() {
  const { user } = useAuth()
  const ops = canAccessHqOps(user)
  const forced = useForcedBranchId()
  const { selectedBranchId } = useBranch()
  const branchId = forced ?? (selectedBranchId !== 'all' ? selectedBranchId : null)
  const [rows, setRows] = useState<InventoryRow[]>([])

  useEffect(() => {
    let cancelled = false
    void listInventory(branchId)
      .then((next) => {
        if (!cancelled) setRows(next)
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [branchId])

  const low = rows.filter(
    (row) =>
      row.branchId &&
      row.branchId !== HQ_SENTINEL_BRANCH_ID &&
      row.branchQuantity != null &&
      isLowStock(row.branchQuantity, row.reorderLevel),
  )
  if (low.length === 0) return null

  return (
    <section className="rounded-[16px] border border-amber-200 bg-[#FBF7F0] p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a6d2f]">Low stock</p>
          <h2 className="font-display text-2xl text-[#073D2C]">
            {ops && !branchId ? 'Branches and franchises' : 'This clinic'}
          </h2>
        </div>
        <Link to="/admin/operations/inventory" className="text-sm font-semibold text-emerald-800 hover:underline">
          Open inventory
        </Link>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {low.slice(0, 9).map((row) => (
          <li key={`${row.branchId}-${row.warehouseItemId}`} className="rounded-[12px] border border-[#E8D9B8] bg-white px-3 py-2">
            <p className="text-sm font-semibold text-[#073D2C]">{row.itemName}</p>
            <p className="text-xs text-slate-ui">
              {row.branchName} · {row.branchQuantity} on hand · reorder {row.reorderLevel}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
