/**
 * Cash on Hand daily drawer — Supabase `cash_drawer_days` is source of truth.
 * localStorage is only a one-time migrate + offline mirror.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { isUuid } from '@/utils/uuid'

const CHANGE = 'imajica:cash-drawer-changed'
const MIGRATED_FLAG = 'imajica_cash_drawer_migrated_v1'

/** Legacy HQ Cash Flow Snapshot / Cash on Hand combined scope. */
export const HQ_CASH_SCOPE = 'all'

type CashDrawerRow = {
  scope: string
  branchId: string | null
  dateKey: string
  confirmedEnding: number
  manualDeducted: number
}

/** In-memory index: `${scope}|${dateKey}` → row */
const cache = new Map<string, CashDrawerRow>()

function cacheKey(scope: string, dateKey: string) {
  return `${scope}|${dateKey}`
}

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

export function cashConfirmKey(scope: string, dateKey: string) {
  return `imajica_cash_confirm_${scope}_${dateKey}`
}

export function cashDeductKey(scope: string, dateKey: string) {
  return `imajica_cash_deduct_${scope}_${dateKey}`
}

function readLocalConfirmed(scope: string, dateKey: string): number | null {
  try {
    const raw = localStorage.getItem(cashConfirmKey(scope, dateKey))
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function writeLocalConfirmed(scope: string, dateKey: string, amount: number) {
  try {
    localStorage.setItem(cashConfirmKey(scope, dateKey), String(amount))
  } catch {
    /* quota */
  }
}

function readLocalManual(scope: string, dateKey: string): number {
  try {
    const n = Number(localStorage.getItem(cashDeductKey(scope, dateKey)) ?? 0)
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

function writeLocalManual(scope: string, dateKey: string, amount: number) {
  try {
    localStorage.setItem(cashDeductKey(scope, dateKey), String(Math.max(0, amount)))
  } catch {
    /* quota */
  }
}

function putCache(row: CashDrawerRow) {
  cache.set(cacheKey(row.scope, row.dateKey), row)
}

function mapDbRow(row: {
  scope: string
  branch_id: string | null
  date_key: string
  confirmed_ending: number | string
  manual_deducted: number | string
}): CashDrawerRow {
  return {
    scope: row.scope,
    branchId: row.branch_id,
    dateKey: String(row.date_key).slice(0, 10),
    confirmedEnding: Number(row.confirmed_ending) || 0,
    manualDeducted: Number(row.manual_deducted) || 0,
  }
}

/** Scope id for drawer keys — branch id or org-wide `all`. */
export function cashScopeForBranch(branchId?: string | null): string {
  return branchId || HQ_CASH_SCOPE
}

function branchIdForScope(scope: string): string | null {
  if (scope === HQ_CASH_SCOPE) return null
  return isUuid(scope) ? scope : null
}

export function readConfirmedCash(scope: string, dateKey: string): number | null {
  const hit = cache.get(cacheKey(scope, dateKey))
  if (hit) return hit.confirmedEnding
  return readLocalConfirmed(scope, dateKey)
}

export function readManualCashDeducted(scope: string, dateKey: string): number {
  const hit = cache.get(cacheKey(scope, dateKey))
  if (hit) return hit.manualDeducted
  return readLocalManual(scope, dateKey)
}

export function sumConfirmedCash(scopes: readonly string[], dateKey: string): number {
  return scopes.reduce((sum, scope) => sum + (readConfirmedCash(scope, dateKey) ?? 0), 0)
}

export function sumManualCashDeducted(scopes: readonly string[], dateKey: string): number {
  return scopes.reduce((sum, scope) => sum + readManualCashDeducted(scope, dateKey), 0)
}

/**
 * Company Cash on Hand beginning: use the stronger of
 * (sum of clinic confirms) and HQ `all` so a partial clinic set never zeros out
 * the combined drawer.
 */
export function readCompanyCashBeginning(
  scopes: readonly string[],
  dateKey: string,
): number {
  const hasClinicConfirm = scopes.some((scope) => readConfirmedCash(scope, dateKey) != null)
  const clinicSum = hasClinicConfirm ? sumConfirmedCash(scopes, dateKey) : 0
  const hqAll = readConfirmedCash(HQ_CASH_SCOPE, dateKey)
  if (hqAll != null && hasClinicConfirm) return Math.max(hqAll, clinicSum)
  if (hasClinicConfirm) return clinicSum
  return hqAll ?? 0
}

export function readCompanyManualCashDeducted(
  scopes: readonly string[],
  dateKey: string,
): number {
  const clinicTotal = sumManualCashDeducted(scopes, dateKey)
  if (clinicTotal > 0) return clinicTotal
  return readManualCashDeducted(HQ_CASH_SCOPE, dateKey)
}

export function readCompanyConfirmedToday(
  scopes: readonly string[],
  dateKey: string,
  ending: number,
): number | null {
  if (scopes.every((scope) => readConfirmedCash(scope, dateKey) != null)) return ending
  return readConfirmedCash(HQ_CASH_SCOPE, dateKey)
}

async function upsertRemote(input: {
  scope: string
  dateKey: string
  confirmedEnding?: number
  manualDeducted?: number
}): Promise<CashDrawerRow | null> {
  const prev = cache.get(cacheKey(input.scope, input.dateKey))
  const confirmedEnding =
    input.confirmedEnding != null
      ? input.confirmedEnding
      : (prev?.confirmedEnding ?? readLocalConfirmed(input.scope, input.dateKey) ?? 0)
  const manualDeducted =
    input.manualDeducted != null
      ? Math.max(0, input.manualDeducted)
      : (prev?.manualDeducted ?? readLocalManual(input.scope, input.dateKey))

  const row: CashDrawerRow = {
    scope: input.scope,
    branchId: branchIdForScope(input.scope),
    dateKey: input.dateKey,
    confirmedEnding,
    manualDeducted,
  }
  putCache(row)
  writeLocalConfirmed(input.scope, input.dateKey, confirmedEnding)
  writeLocalManual(input.scope, input.dateKey, manualDeducted)

  if (!isSupabaseConfigured || !supabase) {
    emit()
    return row
  }

  let userId: string | null = null
  try {
    const { data } = await supabase.auth.getUser()
    userId = data.user?.id ?? null
  } catch {
    userId = null
  }

  const payload = {
    scope: input.scope,
    branch_id: row.branchId,
    date_key: input.dateKey,
    confirmed_ending: confirmedEnding,
    manual_deducted: manualDeducted,
    confirmed_by: userId,
    confirmed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('cash_drawer_days')
    .upsert(payload, { onConflict: 'scope,date_key' })
    .select('scope, branch_id, date_key, confirmed_ending, manual_deducted')
    .maybeSingle()

  if (error) {
    console.warn('[cash-drawer] upsert failed', error.message)
    emit()
    return row
  }
  if (data) {
    const mapped = mapDbRow(data)
    putCache(mapped)
    writeLocalConfirmed(mapped.scope, mapped.dateKey, mapped.confirmedEnding)
    writeLocalManual(mapped.scope, mapped.dateKey, mapped.manualDeducted)
    emit()
    return mapped
  }
  emit()
  return row
}

export async function writeConfirmedCash(
  scope: string,
  dateKey: string,
  amount: number,
): Promise<void> {
  await upsertRemote({ scope, dateKey, confirmedEnding: amount })
}

export async function writeManualCashDeducted(
  scope: string,
  dateKey: string,
  amount: number,
): Promise<void> {
  await upsertRemote({ scope, dateKey, manualDeducted: Math.max(0, amount) })
}

/**
 * Push every localStorage cash confirm on this browser into Supabase.
 * Safe to call repeatedly — only upserts when local is higher than remote/cache.
 * Branch PCs must open the dashboard once while online to recover their drawer.
 */
export async function migrateLocalCashDrawerToSupabase(): Promise<{
  uploaded: number
  scopes: string[]
}> {
  if (!isSupabaseConfigured || !supabase) return { uploaded: 0, scopes: [] }

  const jobs: Array<Promise<unknown>> = []
  const touched = new Set<string>()

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      const confirmMatch = /^imajica_cash_confirm_(.+)_(20\d{2}-\d{2}-\d{2})$/.exec(key)
      if (!confirmMatch) continue
      const scope = confirmMatch[1]!
      const dateKey = confirmMatch[2]!
      if (scope !== HQ_CASH_SCOPE && !isUuid(scope)) continue
      const ending = readLocalConfirmed(scope, dateKey)
      const manual = readLocalManual(scope, dateKey)
      if (ending == null && manual <= 0) continue
      const existing = cache.get(cacheKey(scope, dateKey))
      const nextEnding = Math.max(ending ?? 0, existing?.confirmedEnding ?? 0)
      const nextManual = Math.max(manual, existing?.manualDeducted ?? 0)
      if (
        existing &&
        existing.confirmedEnding >= nextEnding &&
        existing.manualDeducted >= nextManual
      ) {
        continue
      }
      touched.add(scope)
      jobs.push(
        upsertRemote({
          scope,
          dateKey,
          confirmedEnding: nextEnding,
          manualDeducted: nextManual,
        }),
      )
    }
  } catch {
    /* ignore */
  }

  if (jobs.length) await Promise.all(jobs)
  try {
    localStorage.setItem(MIGRATED_FLAG, '1')
  } catch {
    /* quota */
  }
  return { uploaded: jobs.length, scopes: [...touched] }
}

/**
 * HQ recovery: save each clinic’s last known ending for a date (usually yesterday)
 * so Beginning on HQ All Branches can show the combined Cash on Hand.
 */
export async function recoverCompanyCashOnHand(input: {
  dateKey: string
  clinics: Array<{ branchId: string; confirmedEnding: number }>
}): Promise<number> {
  let total = 0
  for (const clinic of input.clinics) {
    const amount = Math.max(0, Number(clinic.confirmedEnding) || 0)
    total += amount
    await upsertRemote({
      scope: clinic.branchId,
      dateKey: input.dateKey,
      confirmedEnding: amount,
    })
  }
  await upsertRemote({
    scope: HQ_CASH_SCOPE,
    dateKey: input.dateKey,
    confirmedEnding: total,
  })
  return total
}

/**
 * Load drawer rows for the given scopes between from/to (inclusive YYYY-MM-DD).
 * Also one-time migrates localStorage confirms into Supabase.
 */
export async function preloadCashDrawer(input: {
  scopes: readonly string[]
  from: string
  to: string
}): Promise<void> {
  const scopes = [...new Set([HQ_CASH_SCOPE, ...input.scopes])]

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('cash_drawer_days')
      .select('scope, branch_id, date_key, confirmed_ending, manual_deducted')
      .in('scope', scopes)
      .gte('date_key', input.from)
      .lte('date_key', input.to)

    if (error) {
      console.warn('[cash-drawer] preload failed', error.message)
    } else if (data) {
      for (const row of data) putCache(mapDbRow(row))
    }
  }

  // Seed cache from localStorage for any missing keys in range (offline / pre-migrate)
  for (const scope of scopes) {
    for (const dateKey of [input.from, input.to]) {
      if (cache.has(cacheKey(scope, dateKey))) continue
      const ending = readLocalConfirmed(scope, dateKey)
      const manual = readLocalManual(scope, dateKey)
      if (ending == null && manual <= 0) continue
      putCache({
        scope,
        branchId: branchIdForScope(scope),
        dateKey,
        confirmedEnding: ending ?? 0,
        manualDeducted: manual,
      })
    }
  }

  await migrateLocalCashDrawerToSupabase()
  emit()
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
