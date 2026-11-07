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

/** Legacy HQ Cash Flow Snapshot / Cash on Hand drawer (All Branches). */
export const HQ_CASH_SCOPE = 'all'

/** Sum confirmed / deducted drawer amounts across several clinic scopes (e.g. company-owned). */
export function sumConfirmedCash(scopes: readonly string[], dateKey: string): number {
  return scopes.reduce((sum, scope) => sum + (readConfirmedCash(scope, dateKey) ?? 0), 0)
}

export function sumManualCashDeducted(scopes: readonly string[], dateKey: string): number {
  return scopes.reduce((sum, scope) => sum + readManualCashDeducted(scope, dateKey), 0)
}

/**
 * Company Cash on Hand beginning.
 * Prefer the legacy HQ `all` drawer (same key as Cash Flow Snapshot) so renaming
 * the card never resets an already-confirmed balance to ₱0. Fall back to summing
 * the four clinic drawers only when `all` has never been confirmed.
 */
export function readCompanyCashBeginning(
  scopes: readonly string[],
  dateKey: string,
): number {
  const hqAll = readConfirmedCash(HQ_CASH_SCOPE, dateKey)
  if (hqAll != null) return hqAll
  return sumConfirmedCash(scopes, dateKey)
}

export function readCompanyManualCashDeducted(
  scopes: readonly string[],
  dateKey: string,
): number {
  const hqAll = readManualCashDeducted(HQ_CASH_SCOPE, dateKey)
  if (hqAll > 0) return hqAll
  return sumManualCashDeducted(scopes, dateKey)
}

export function readCompanyConfirmedToday(
  _scopes: readonly string[],
  dateKey: string,
  _ending: number,
): number | null {
  return readConfirmedCash(HQ_CASH_SCOPE, dateKey)
}
