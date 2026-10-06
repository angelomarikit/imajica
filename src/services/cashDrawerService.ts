/** Shared cash drawer keys — Dashboard + Log Expense (deduct cash). */

const CHANGE = 'imajica:cash-drawer-changed'

export function cashConfirmKey(scope: string, dateKey: string) {
  return `imajica_cash_confirm_${scope}_${dateKey}`
}

export function cashDeductKey(scope: string, dateKey: string) {
  return `imajica_cash_deduct_${scope}_${dateKey}`
}

export function readConfirmedCash(scope: string, dateKey: string): number | null {
  try {
    const raw = localStorage.getItem(cashConfirmKey(scope, dateKey))
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function writeConfirmedCash(scope: string, dateKey: string, amount: number) {
  localStorage.setItem(cashConfirmKey(scope, dateKey), String(amount))
  window.dispatchEvent(new Event(CHANGE))
}

/** Manual “Deduct Cash” button amounts (not expense-linked). */
export function readManualCashDeducted(scope: string, dateKey: string): number {
  try {
    const n = Number(localStorage.getItem(cashDeductKey(scope, dateKey)) ?? 0)
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

export function writeManualCashDeducted(scope: string, dateKey: string, amount: number) {
  localStorage.setItem(cashDeductKey(scope, dateKey), String(Math.max(0, amount)))
  window.dispatchEvent(new Event(CHANGE))
}

export function subscribeCashDrawer(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (
      e.key?.startsWith('imajica_cash_confirm_') ||
      e.key?.startsWith('imajica_cash_deduct_')
    ) {
      listener()
    }
  }
  window.addEventListener(CHANGE, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE, listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Scope id for drawer keys — branch id or org-wide `all`. */
export function cashScopeForBranch(branchId?: string | null): string {
  return branchId || 'all'
}
