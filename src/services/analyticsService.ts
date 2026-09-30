import { enrichFirstClientFlags } from '@/services/clientSalesProfileService'
import { getExpenses } from '@/services/expenseService'
import { getSales, subscribeSalesData } from '@/services/salesService'
import type {
  NewClientSaleRow,
  PaymentMethod,
  ProductSalesRow,
  Sale,
  TreatmentSalesRow,
} from '@/types'

export function getAnalyticsSales(): Sale[] {
  return enrichFirstClientFlags(getSales())
}

export function subscribeAnalytics(listener: () => void) {
  return subscribeSalesData(listener)
}

export function filterSalesByDate(sales: Sale[], from: string, to: string) {
  return sales.filter((s) => {
    const d = s.createdAt.slice(0, 10)
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })
}

/** Credit card 3%; GCash / PayMaya / PayMongo treated as QRPH ₱15 flat */
export function transactionFee(sale: Sale): number {
  const method = sale.paymentMethod
  if (method === 'credit_card') return Math.round(sale.totalAmount * 0.03 * 100) / 100
  if (method === 'gcash' || method === 'paymaya' || method === 'paymongo') return 15
  return 0
}

export function sumBranchExpenses(from: string, to: string) {
  return getExpenses()
    .filter((e) => {
      if (e.scope !== 'branch' || e.status !== 'active') return false
      if (from && e.expenseDate < from) return false
      if (to && e.expenseDate > to) return false
      return true
    })
    .reduce((s, e) => s + e.amount, 0)
}

export function salesSummary(sales: Sale[], from: string, to: string) {
  const inRange = filterSalesByDate(sales, from, to)
  const productSales = inRange
    .filter((s) => s.itemType === 'product')
    .reduce((s, x) => s + x.totalAmount, 0)
  const serviceSales = inRange
    .filter((s) => s.itemType === 'service' || s.itemType === 'package')
    .reduce((s, x) => s + x.totalAmount, 0)
  const grossSales = inRange.reduce((s, x) => s + x.totalAmount, 0)
  const fees = inRange.reduce((s, x) => s + transactionFee(x), 0)
  const branchExpenses = sumBranchExpenses(from, to)
  const netSales = grossSales - branchExpenses - fees
  return {
    bookings: inRange.length,
    grossSales,
    productSales,
    serviceSales,
    grossCommission: 0,
    branchExpenses,
    fees,
    netSales,
    rows: inRange,
  }
}

export function productSalesReport(sales: Sale[], from: string, to: string): ProductSalesRow[] {
  const products = filterSalesByDate(sales, from, to).filter((s) => s.itemType === 'product')
  const map = new Map<string, ProductSalesRow>()
  for (const s of products) {
    const key = s.sku || s.treatmentOrPackage
    const qty = s.quantity ?? 1
    const base = s.unitBaseCost ?? s.totalAmount / qty
    const retail = s.unitRetailPrice ?? s.totalAmount / qty
    const existing = map.get(key)
    if (existing) {
      existing.unitsSold += qty
      existing.totalRevenue += retail * qty
      existing.totalCost += base * qty
      existing.totalProfit = existing.totalRevenue - existing.totalCost
      existing.profitMargin =
        existing.totalRevenue > 0 ? (existing.totalProfit / existing.totalRevenue) * 100 : 0
    } else {
      const totalRevenue = retail * qty
      const totalCost = base * qty
      const totalProfit = totalRevenue - totalCost
      map.set(key, {
        productName: s.treatmentOrPackage,
        sku: s.sku || 'N/A',
        unitsSold: qty,
        baseCost: base,
        retailPrice: retail,
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.unitsSold - a.unitsSold)
}

export function bestSellingTreatments(
  sales: Sale[],
  from: string,
  to: string,
  branchName?: string,
): TreatmentSalesRow[] {
  const rows = filterSalesByDate(sales, from, to).filter(
    (s) =>
      (s.itemType === 'service' || s.itemType === 'package') &&
      (!branchName || branchName === 'all' || s.branchName === branchName),
  )
  const map = new Map<string, TreatmentSalesRow>()
  for (const s of rows) {
    const key = s.treatmentOrPackage
    const existing = map.get(key)
    if (existing) {
      existing.totalBooked += 1
      existing.totalRevenue += s.totalAmount
    } else {
      map.set(key, {
        rank: 0,
        treatmentName: s.treatmentOrPackage,
        type: s.itemType === 'package' ? 'Package' : 'Service',
        totalBooked: 1,
        totalRevenue: s.totalAmount,
      })
    }
  }
  return [...map.values()]
    .sort((a, b) => b.totalBooked - a.totalBooked || b.totalRevenue - a.totalRevenue)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

export function getNewClientSalesRows(
  sales: Sale[],
  from: string,
  to: string,
  leadChannel?: string,
): NewClientSaleRow[] {
  return filterSalesByDate(sales, from, to)
    .filter((s) => s.isFirstClientSale)
    .filter(
      (s) =>
        !leadChannel ||
        leadChannel === 'all' ||
        (s.leadSource || 'Walk-In') === leadChannel,
    )
    .map((s) => ({
      firstBookingDate: s.createdAt.slice(0, 10),
      customerName: s.clientName,
      bookingRef: s.bookingRef || s.invoiceNumber,
      availed: `${s.treatmentOrPackage}, (x${s.quantity ?? 1})`,
      leadSource: s.leadSource || 'Walk-In',
      staffName: s.staffName || '—',
      amountPaid: s.totalAmount,
      paymentType: s.paymentType || 'Full Payment',
      status: s.status === 'paid' ? 'Paid' : s.status === 'pending' ? 'Pending' : s.status,
      branchName: s.branchName,
    }))
}

export function exportCsv(filename: string, header: string[], rows: string[][]) {
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Download a real Excel workbook (.xlsx). */
export async function exportXlsx(filename: string, header: string[], rows: string[][]) {
  const XLSX = await import('xlsx')
  const sheetName = 'Sheet1'
  const aoa = [header, ...rows]
  const worksheet = XLSX.utils.aoa_to_sheet(aoa)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  const name = filename.toLowerCase().endsWith('.xlsx')
    ? filename
    : `${filename.replace(/\.csv$/i, '').replace(/\.xlxs$/i, '')}.xlsx`
  XLSX.writeFile(workbook, name)
}

export function feeLabelForMethod(method: PaymentMethod) {
  if (method === 'credit_card' || method === 'debit_card') return 'Card (3%)'
  if (
    method === 'gcash' ||
    method === 'paymaya' ||
    method === 'paymongo' ||
    method === 'qr_ph'
  ) {
    return 'QRPH (₱15)'
  }
  return '—'
}

export function defaultAnalyticsRange() {
  return { from: '2025-09-01', to: '2026-09-30' }
}
