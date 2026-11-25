import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { toUserMessage } from '@/utils/userFacingError'

export type InventoryRow = {
  warehouseItemId: string
  itemName: string
  unitType: string
  itemType: string
  warehouseStock: number | null
  branchId: string | null
  branchName: string | null
  branchQuantity: number | null
  reorderLevel: number
}

export type StockRecipe = {
  id: string
  warehouseItemId: string
  catalogKind: 'product' | 'service' | 'package'
  catalogId: string
  catalogLabel: string
  quantityPerSale: number
}

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('The clinic database isn’t connected on this device.')
  }
  return supabase
}

function inventoryError(message: string, fallback: string) {
  if (/schema cache|could not find the function|does not exist|stock_recipes|branch_stock/i.test(message)) {
    return new Error('Inventory isn’t in the database yet. Apply the latest clinic inventory update, then refresh.')
  }
  return new Error(toUserMessage(message, fallback))
}

export async function listInventory(branchId?: string | null): Promise<InventoryRow[]> {
  const client = requireClient()
  const { data, error } = await client.rpc('list_inventory', {
    p_branch_id: branchId || null,
  })
  if (error) throw inventoryError(error.message, 'Could not load inventory.')
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    warehouseItemId: String(row.warehouse_item_id),
    itemName: String(row.item_name ?? ''),
    unitType: String(row.unit_type ?? ''),
    itemType: String(row.item_type ?? ''),
    warehouseStock: row.warehouse_stock == null ? null : Number(row.warehouse_stock),
    branchId: row.branch_id ? String(row.branch_id) : null,
    branchName: row.branch_name ? String(row.branch_name) : null,
    branchQuantity: row.branch_quantity == null ? null : Number(row.branch_quantity),
    reorderLevel: Number(row.reorder_level ?? 5),
  }))
}

export function isLowStock(quantity: number, reorderLevel: number) {
  return quantity <= reorderLevel
}

export async function saveWarehouseItem(input: {
  name: string
  itemType: 'product' | 'consumable'
  unitType: string
  quantity: number
}): Promise<void> {
  const client = requireClient()
  const { error } = await client.rpc('save_warehouse_item', {
    p_name: input.name,
    p_item_type: input.itemType,
    p_unit_type: input.unitType,
    p_quantity: input.quantity,
    p_acquisition_price: 0,
  })
  if (error) throw inventoryError(error.message, 'Could not add this item.')
}

export async function transferWarehouseStock(input: {
  warehouseItemId: string
  branchId: string
  quantity: number
}): Promise<{ itemName: string; branchName: string; quantity: number; warehouseLeft: number; branchOnHand: number }> {
  const client = requireClient()
  const { data, error } = await client.rpc('transfer_warehouse_stock', {
    p_warehouse_item_id: input.warehouseItemId,
    p_branch_id: input.branchId,
    p_quantity: input.quantity,
  })
  if (error) throw inventoryError(error.message, 'Could not transfer this item.')
  const row = (data ?? {}) as Record<string, unknown>
  return {
    itemName: String(row.item_name ?? 'Item'),
    branchName: String(row.branch_name ?? 'clinic'),
    quantity: Number(row.quantity ?? input.quantity),
    warehouseLeft: Number(row.warehouse_left ?? 0),
    branchOnHand: Number(row.branch_on_hand ?? 0),
  }
}

export async function listStockRecipes(): Promise<StockRecipe[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('stock_recipes')
    .select('id, warehouse_item_id, catalog_kind, catalog_id, catalog_label, quantity_per_sale')
    .order('catalog_label')
  if (error) throw inventoryError(error.message, 'Could not load what each item is used for.')
  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    warehouseItemId: String(row.warehouse_item_id),
    catalogKind: String(row.catalog_kind) as StockRecipe['catalogKind'],
    catalogId: String(row.catalog_id),
    catalogLabel: String(row.catalog_label ?? ''),
    quantityPerSale: Number(row.quantity_per_sale ?? 1),
  }))
}

export async function saveStockRecipe(input: {
  warehouseItemId: string
  catalogKind: StockRecipe['catalogKind']
  catalogId: string
  catalogLabel: string
  quantity: number
}): Promise<void> {
  const client = requireClient()
  const { error } = await client.rpc('save_stock_recipe', {
    p_warehouse_item_id: input.warehouseItemId,
    p_catalog_kind: input.catalogKind,
    p_catalog_id: input.catalogId,
    p_catalog_label: input.catalogLabel,
    p_quantity: input.quantity,
  })
  if (error) throw inventoryError(error.message, 'Could not save what this item is used for.')
}

export async function deleteStockRecipe(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.rpc('delete_stock_recipe', { p_id: id })
  if (error) throw inventoryError(error.message, 'Could not remove that link.')
}

export async function applySaleStock(saleId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const { error } = await supabase.rpc('apply_sale_stock', { p_sale_id: saleId })
  if (error && !/does not exist|schema cache|could not find/i.test(error.message)) {
    console.warn('[inventory] sale stock deduction', error.message)
  }
}

export async function reverseSaleStock(saleId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const { error } = await supabase.rpc('reverse_sale_stock', { p_sale_id: saleId })
  if (error && !/does not exist|schema cache|could not find/i.test(error.message)) {
    console.warn('[inventory] sale stock reversal', error.message)
  }
}
