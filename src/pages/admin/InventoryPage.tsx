import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { getPackagesCatalog, getServices } from '@/services/catalogService'
import {
  deleteStockRecipe,
  isLowStock,
  listInventory,
  listStockRecipes,
  saveStockRecipe,
  saveWarehouseItem,
  transferWarehouseStock,
  type InventoryRow,
  type StockRecipe,
} from '@/services/inventoryService'
import { getCatalogProducts } from '@/services/productCatalogService'
import { canAccessHqOps, HQ_SENTINEL_BRANCH_ID } from '@/utils/franchiseAccess'

const field =
  'mt-1 h-10 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal'

export function InventoryPage() {
  const { user } = useAuth()
  const ops = canAccessHqOps(user)
  const forced = useForcedBranchId()
  const { selectedBranchId, branches } = useBranch()
  const branchId = forced ?? (selectedBranchId !== 'all' ? selectedBranchId : null)

  const [rows, setRows] = useState<InventoryRow[]>([])
  const [recipes, setRecipes] = useState<StockRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [itemName, setItemName] = useState('')
  const [itemType, setItemType] = useState<'product' | 'consumable'>('consumable')
  const [unitType, setUnitType] = useState('Piece')
  const [openingQty, setOpeningQty] = useState('0')

  const [transferItem, setTransferItem] = useState('')
  const [transferBranch, setTransferBranch] = useState('')
  const [transferQty, setTransferQty] = useState('1')
  const [transferring, setTransferring] = useState(false)

  const [recipeItem, setRecipeItem] = useState('')
  const [recipeKind, setRecipeKind] = useState<StockRecipe['catalogKind']>('service')
  const [recipeCatalogId, setRecipeCatalogId] = useState('')
  const [recipeQty, setRecipeQty] = useState('1')

  const clinics = useMemo(
    () =>
      branches.filter(
        (b) =>
          b.status === 'active' &&
          b.branchType !== 'warehouse' &&
          b.id !== HQ_SENTINEL_BRANCH_ID,
      ),
    [branches],
  )

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [nextRows, nextRecipes] = await Promise.all([
        listInventory(branchId),
        ops ? listStockRecipes() : Promise.resolve([]),
      ])
      setRows(nextRows)
      setRecipes(nextRecipes)
    } catch (err) {
      setRows([])
      setError(err instanceof Error ? err.message : 'Could not load inventory.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, ops])

  const warehouseRows = rows.filter((row) => row.branchId == null)
  const clinicRows = rows.filter((row) => row.branchId != null)
  const lowRows = clinicRows.filter(
    (row) => row.branchQuantity != null && isLowStock(row.branchQuantity, row.reorderLevel),
  )
  const outRows = clinicRows.filter((row) => (row.branchQuantity ?? 0) <= 0)
  const onHandRows = clinicRows.filter((row) => (row.branchQuantity ?? 0) > 0)

  const catalogChoices = useMemo(() => {
    if (recipeKind === 'product') {
      return getCatalogProducts().map((item) => ({ id: item.id, label: item.name }))
    }
    if (recipeKind === 'package') {
      return getPackagesCatalog().map((item) => ({ id: item.id, label: item.name }))
    }
    return getServices().map((item) => ({ id: item.id, label: item.name }))
  }, [recipeKind, rows])

  const itemRecipes = recipes.filter((recipe) => recipe.warehouseItemId === recipeItem)

  async function addItem() {
    try {
      await saveWarehouseItem({
        name: itemName.trim(),
        itemType,
        unitType,
        quantity: Math.max(0, Number(openingQty) || 0),
      })
      setItemName('')
      setOpeningQty('0')
      toast.success('Item added to the warehouse')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add this item.')
    }
  }

  async function transfer() {
    setTransferring(true)
    try {
      const result = await transferWarehouseStock({
        warehouseItemId: transferItem,
        branchId: transferBranch,
        quantity: Math.max(1, Number(transferQty) || 0),
      })
      toast.success(
        `${result.quantity} ${result.itemName} sent to ${result.branchName}. Warehouse now has ${result.warehouseLeft}. ${result.branchName} has ${result.branchOnHand}.`,
      )
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not transfer this item.')
    } finally {
      setTransferring(false)
    }
  }

  async function linkRecipe() {
    const choice = catalogChoices.find((item) => item.id === recipeCatalogId)
    if (!recipeItem || !choice) return
    try {
      await saveStockRecipe({
        warehouseItemId: recipeItem,
        catalogKind: recipeKind,
        catalogId: choice.id,
        catalogLabel: choice.label,
        quantity: Math.max(1, Number(recipeQty) || 1),
      })
      toast.success(`${choice.label} will use this item on each sale`)
      setRecipes(await listStockRecipes())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save that link.')
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        eyebrow="Inventory"
        title={ops ? 'Warehouse and clinic stock' : 'Clinic inventory'}
        description={
          ops
            ? 'Central stock for HQ and Operations. Transfer into a clinic, then the POS deducts what each service, product, or package uses.'
            : 'Stock on hand at this clinic. A sale deducts the supplies linked to that service, product, or package.'
        }
      />

      {loading ? <p className="text-sm text-slate-ui">Loading inventory…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!ops ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">On hand</p>
              <p className="mt-1 font-metric text-3xl text-[#073D2C]">{onHandRows.length}</p>
              <p className="text-xs text-slate-ui">Items tracked at this clinic</p>
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
          <StockTable rows={clinicRows} mode="clinic" />
        </>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h2 className="font-display text-xl text-[#073D2C]">Add warehouse item</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-ui sm:col-span-2">
                  Name
                  <input className={field} value={itemName} onChange={(e) => setItemName(e.target.value)} />
                </label>
                <label className="text-xs font-medium text-slate-ui">
                  Type
                  <select className={field} value={itemType} onChange={(e) => setItemType(e.target.value as 'product' | 'consumable')}>
                    <option value="consumable">Consumable</option>
                    <option value="product">Product</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-ui">
                  Unit
                  <input className={field} value={unitType} onChange={(e) => setUnitType(e.target.value)} />
                </label>
                <label className="text-xs font-medium text-slate-ui">
                  Opening quantity
                  <input className={field} inputMode="numeric" value={openingQty} onChange={(e) => setOpeningQty(e.target.value)} />
                </label>
              </div>
              <Button className="mt-3" type="button" onClick={() => void addItem()} disabled={!itemName.trim()}>
                Add item
              </Button>
            </Card>

            <Card className="p-4">
              <h2 className="font-display text-xl text-[#073D2C]">Transfer to a clinic</h2>
              <p className="mt-1 text-sm text-slate-ui">
                The quantity leaves the warehouse and is added to that branch or franchise.
              </p>
              <div className="mt-3 grid gap-3">
                <label className="text-xs font-medium text-slate-ui">
                  Item
                  <select className={field} value={transferItem} onChange={(e) => setTransferItem(e.target.value)}>
                    <option value="">Select item</option>
                    {warehouseRows.map((row) => (
                      <option key={row.warehouseItemId} value={row.warehouseItemId}>
                        {row.itemName} ({row.warehouseStock ?? 0} in warehouse)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-ui">
                  Clinic
                  <select className={field} value={transferBranch} onChange={(e) => setTransferBranch(e.target.value)}>
                    <option value="">Select clinic</option>
                    {clinics.map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-ui">
                  Quantity
                  <input className={field} inputMode="numeric" value={transferQty} onChange={(e) => setTransferQty(e.target.value)} />
                </label>
              </div>
              <Button
                className="mt-3"
                type="button"
                disabled={transferring || !transferItem || !transferBranch}
                onClick={() => void transfer()}
              >
                {transferring ? 'Transferring…' : 'Transfer'}
              </Button>
            </Card>
          </div>

          <section className="space-y-2">
            <h2 className="font-display text-2xl text-[#073D2C]">Warehouse</h2>
            <StockTable rows={warehouseRows} mode="warehouse" />
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-2xl text-[#073D2C]">Clinics with low stock</h2>
            <StockTable rows={lowRows} mode="clinic" empty="No clinic is at or under its reorder level." />
          </section>

          <Card className="p-4">
            <h2 className="font-display text-xl text-[#073D2C]">Used by</h2>
            <p className="mt-1 text-sm text-slate-ui">
              One sale of the service, product, or package deducts this many units from the clinic that sold it.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <label className="text-xs font-medium text-slate-ui">
                Warehouse item
                <select className={field} value={recipeItem} onChange={(e) => setRecipeItem(e.target.value)}>
                  <option value="">Select item</option>
                  {warehouseRows.map((row) => (
                    <option key={row.warehouseItemId} value={row.warehouseItemId}>
                      {row.itemName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-ui">
                Kind
                <select
                  className={field}
                  value={recipeKind}
                  onChange={(e) => {
                    setRecipeKind(e.target.value as StockRecipe['catalogKind'])
                    setRecipeCatalogId('')
                  }}
                >
                  <option value="service">Service</option>
                  <option value="product">Product</option>
                  <option value="package">Package</option>
                </select>
              </label>
              <label className="text-xs font-medium text-slate-ui">
                Catalog
                <select className={field} value={recipeCatalogId} onChange={(e) => setRecipeCatalogId(e.target.value)}>
                  <option value="">Select</option>
                  {catalogChoices.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-ui">
                Qty per sale
                <input className={field} inputMode="numeric" value={recipeQty} onChange={(e) => setRecipeQty(e.target.value)} />
              </label>
            </div>
            <Button className="mt-3" type="button" disabled={!recipeItem || !recipeCatalogId} onClick={() => void linkRecipe()}>
              Save link
            </Button>
            {recipeItem ? (
              <ul className="mt-4 divide-y divide-border text-sm">
                {itemRecipes.length === 0 ? (
                  <li className="py-2 text-slate-ui">Nothing is linked to this item yet.</li>
                ) : (
                  itemRecipes.map((recipe) => (
                    <li key={recipe.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-[#073D2C]">
                        {recipe.catalogLabel}{' '}
                        <span className="text-slate-ui">
                          · {recipe.catalogKind} · {recipe.quantityPerSale} per sale
                        </span>
                      </span>
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-700"
                        onClick={() =>
                          void deleteStockRecipe(recipe.id)
                            .then(() => listStockRecipes())
                            .then(setRecipes)
                            .catch((err) => toast.error(err instanceof Error ? err.message : 'Could not remove that link.'))
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </Card>
        </>
      )}
    </div>
  )
}

function StockTable({
  rows,
  mode,
  empty = 'No items yet.',
}: {
  rows: InventoryRow[]
  mode: 'warehouse' | 'clinic'
  empty?: string
}) {
  if (rows.length === 0) {
    return <p className="rounded-[12px] border border-dashed border-border px-4 py-8 text-center text-sm text-slate-ui">{empty}</p>
  }
  return (
    <div className="overflow-x-auto rounded-[12px] border border-border bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-[#FBF7F0] text-[11px] font-bold uppercase tracking-wide text-[#8a6d2f]">
          <tr>
            <th className="px-4 py-2.5">Item</th>
            {mode === 'clinic' ? <th className="px-4 py-2.5">Clinic</th> : null}
            <th className="px-4 py-2.5 text-right">{mode === 'warehouse' ? 'Warehouse' : 'On hand'}</th>
            <th className="px-4 py-2.5 text-right">Reorder</th>
            <th className="px-4 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const qty = mode === 'warehouse' ? row.warehouseStock ?? 0 : row.branchQuantity ?? 0
            const low = isLowStock(qty, row.reorderLevel)
            return (
              <tr key={`${row.warehouseItemId}-${row.branchId ?? 'wh'}`} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#073D2C]">{row.itemName}</p>
                  <p className="text-xs capitalize text-slate-ui">
                    {row.itemType}
                    {row.unitType ? ` · ${row.unitType}` : ''}
                  </p>
                </td>
                {mode === 'clinic' ? <td className="px-4 py-3 text-charcoal">{row.branchName}</td> : null}
                <td className="px-4 py-3 text-right font-metric text-lg text-[#073D2C]">{qty}</td>
                <td className="px-4 py-3 text-right text-slate-ui">{row.reorderLevel}</td>
                <td className="px-4 py-3">
                  <span className={low ? 'font-semibold text-red-700' : 'text-emerald-800'}>
                    {qty <= 0 ? 'Out' : low ? 'Low' : 'OK'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
