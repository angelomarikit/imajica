import { useEffect, useMemo, useState } from 'react'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Card } from '@/components/ui/Card'
import { useBranch } from '@/contexts/BranchContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import {
  isLowStock,
  listInventory,
  listStockRecipes,
  type InventoryRow,
  type StockRecipe,
} from '@/services/inventoryService'

export function BranchInventoryPage() {
  const forced = useForcedBranchId()
  const { selectedBranchId, selectedBranch } = useBranch()
  const branchId = forced ?? (selectedBranchId !== 'all' ? selectedBranchId : null)
  const clinicName = selectedBranch?.name ?? 'This clinic'

  const [rows, setRows] = useState<InventoryRow[]>([])
  const [recipes, setRecipes] = useState<StockRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void Promise.all([
      listInventory(branchId),
      listStockRecipes().catch(() => [] as StockRecipe[]),
    ])
      .then(([nextRows, nextRecipes]) => {
        if (cancelled) return
        setRows(nextRows.filter((row) => row.branchId))
        setRecipes(nextRecipes)
      })
      .catch((err) => {
        if (cancelled) return
        setRows([])
        setRecipes([])
        setError(err instanceof Error ? err.message : 'Could not load branch inventory.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [branchId])

  const usedBy = useMemo(() => {
    const map = new Map<string, StockRecipe[]>()
    for (const recipe of recipes) {
      const list = map.get(recipe.warehouseItemId) ?? []
      list.push(recipe)
      map.set(recipe.warehouseItemId, list)
    }
    return map
  }, [recipes])

  const lowRows = rows.filter(
    (row) => row.branchQuantity != null && isLowStock(row.branchQuantity, row.reorderLevel),
  )
  const outRows = rows.filter((row) => (row.branchQuantity ?? 0) <= 0)
  const onHandRows = rows.filter((row) => (row.branchQuantity ?? 0) > 0)
  const showClinic = !branchId

  return (
    <div className="space-y-5">
      <AdminPageBanner
        eyebrow="Branch inventory"
        title="New Branch Inventory"
        description={
          branchId
            ? `${clinicName} stock from the warehouse. A transfer adds quantity here. A sale deducts the supplies linked to that service, product, or package.`
            : 'Stock each clinic received from the warehouse. Choose a clinic in the header to see one branch.'
        }
      />

      {loading ? <p className="text-sm text-slate-ui">Loading branch inventory…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">On hand</p>
          <p className="mt-1 font-metric text-3xl text-[#073D2C]">{onHandRows.length}</p>
          <p className="text-xs text-slate-ui">
            {branchId ? 'Items with stock at this clinic' : 'Items with stock across clinics'}
          </p>
        </Card>
        <Card className="border-amber-200 bg-[#FBF7F0] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a6d2f]">Low stock</p>
          <p className="mt-1 font-metric text-3xl text-[#073D2C]">{lowRows.length}</p>
          <p className="text-xs text-[#8a6d2f]">At or under the reorder level</p>
        </Card>
        <Card className="border-red-200 bg-red-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-red-800">Out</p>
          <p className="mt-1 font-metric text-3xl text-[#073D2C]">{outRows.length}</p>
          <p className="text-xs text-red-800">None left, or below zero</p>
        </Card>
      </div>

      {rows.length === 0 && !loading && !error ? (
        <p className="rounded-[12px] border border-dashed border-border px-4 py-8 text-center text-sm text-slate-ui">
          No warehouse stock has been sent here yet. HQ or the Operations Manager can transfer items from Inventory.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-[12px] border border-border bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#FBF7F0] text-[11px] font-bold uppercase tracking-wide text-[#8a6d2f]">
              <tr>
                <th className="px-4 py-2.5">Item</th>
                {showClinic ? <th className="px-4 py-2.5">Clinic</th> : null}
                <th className="px-4 py-2.5 text-right">On hand</th>
                <th className="px-4 py-2.5 text-right">Reorder</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Used by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const qty = row.branchQuantity ?? 0
                const low = isLowStock(qty, row.reorderLevel)
                const links = usedBy.get(row.warehouseItemId) ?? []
                return (
                  <tr key={`${row.branchId}-${row.warehouseItemId}`} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#073D2C]">{row.itemName}</p>
                      <p className="text-xs capitalize text-slate-ui">
                        {row.itemType}
                        {row.unitType ? ` · ${row.unitType}` : ''}
                      </p>
                    </td>
                    {showClinic ? <td className="px-4 py-3 text-charcoal">{row.branchName}</td> : null}
                    <td className="px-4 py-3 text-right font-metric text-lg text-[#073D2C]">{qty}</td>
                    <td className="px-4 py-3 text-right text-slate-ui">{row.reorderLevel}</td>
                    <td className="px-4 py-3">
                      <span className={low ? 'font-semibold text-red-700' : 'text-emerald-800'}>
                        {qty <= 0 ? 'Out' : low ? 'Low' : 'OK'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-ui">
                      {links.length === 0
                        ? 'Not linked yet'
                        : links
                            .map((link) => `${link.catalogLabel} · ${link.quantityPerSale} per sale`)
                            .join(', ')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
