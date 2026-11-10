/**
 * localStorage helpers that never let non-auth data (forms, caches) wipe the
 * Supabase JWT. Tablets hit QuotaExceededError after saving many signatures;
 * that used to leave the UI “signed in” while Place Order / Add Patient failed
 * with “Session expired” (often reported from busy clinics like Lipa).
 */

const RECLAIM_KEYS = [
  'imajica_generated_forms',
  'imajica_generated_forms_deleted',
] as const

/** Heavy clinic caches — trim/remove under quota so auth + saves keep working on every branch/franchise/OM desk. */
const HEAVY_CACHE_KEYS = [
  'imajica_clients',
  'imajica_sales',
  'imajica_remote_live_sales',
  'imajica_appointments',
  'imajica_analytics_sales',
  'imajica_expenses',
  'imajica_cash_drawer_migrated_v1',
  'imajica_catalog_services',
  'imajica_catalog_packages',
  'imajica_catalog_products',
  'imajica_catalog_price_overrides',
  'imajica_catalog_services_deleted',
  'imajica_catalog_packages_deleted',
  'imajica_catalog_products_deleted',
] as const

/** Never reclaim these — JWT + signed-in profile must survive. */
const AUTH_KEEP_PREFIXES = ['sb-', 'imajica_auth_'] as const

function reclaimOtherImajicaCaches(keepKey?: string) {
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || key === keepKey) continue
      if (!key.startsWith('imajica_')) continue
      if (AUTH_KEEP_PREFIXES.some((p) => key.startsWith(p))) continue
      if (
        key.startsWith('imajica_cash_confirm_') ||
        key.startsWith('imajica_cash_deduct_')
      ) {
        continue // handled by reclaimCashMirrorKeys
      }
      toRemove.push(key)
    }
    for (const key of toRemove) {
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22)
  )
}

function reclaimNonAuthSpace() {
  for (const key of RECLAIM_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}

function reclaimHeavyCaches(keepKey?: string) {
  for (const key of HEAVY_CACHE_KEYS) {
    if (keepKey && key === keepKey) continue
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}

/** Drop cash confirm/deduct mirrors (large on busy clinic PCs) — DB remains source of truth. */
function reclaimCashMirrorKeys() {
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (
        key.startsWith('imajica_cash_confirm_') ||
        key.startsWith('imajica_cash_deduct_')
      ) {
        toRemove.push(key)
      }
    }
    for (const key of toRemove) {
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Free browser storage so Supabase can write the JWT again (PC Chrome + Android + iOS).
 * Call before login persist and before session refresh retries.
 */
export function reclaimClinicStorageForAuth(): void {
  reclaimNonAuthSpace()
  reclaimHeavyCaches()
  reclaimCashMirrorKeys()
}

/** Last-resort reclaim when even auth token writes fail after heavy-cache trim. */
export function reclaimAggressivelyForAuthWrite(keepKey?: string): void {
  reclaimClinicStorageForAuth()
  reclaimOtherImajicaCaches(keepKey)
}

/** Remove broken sb-*-auth-token entries so a fresh sign-in can stick. */
export function clearSupabaseAuthStorageKeys(): void {
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith('sb-') && key.includes('auth-token')) {
        toRemove.push(key)
      }
    }
    for (const key of toRemove) {
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Write localStorage without letting QuotaExceeded wipe clinic tablets.
 * Returns false if the write still could not be completed after reclaim.
 */
export function safeLocalSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (err) {
    if (!isQuotaError(err)) throw err
    reclaimNonAuthSpace()
    try {
      localStorage.setItem(key, value)
      return true
    } catch (err2) {
      if (!isQuotaError(err2)) throw err2
      reclaimHeavyCaches(key)
      reclaimCashMirrorKeys()
      try {
        localStorage.setItem(key, value)
        return true
      } catch (err3) {
        if (!isQuotaError(err3)) throw err3
        reclaimOtherImajicaCaches(key)
        try {
          localStorage.setItem(key, value)
          return true
        } catch (err4) {
          if (!isQuotaError(err4)) throw err4
          console.warn('[storage] quota still exceeded for', key)
          return false
        }
      }
    }
  }
}

export function safeLocalGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeLocalRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** Storage adapter for @supabase/supabase-js — protects auth tokens under quota pressure. */
export function createSupabaseAuthStorage(): {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
} {
  return {
    getItem: (key) => safeLocalGetItem(key),
    setItem: (key, value) => {
      const ok = safeLocalSetItem(key, value)
      if (!ok) {
        // Last resort: wipe clinic caches again and try once more for auth only
        reclaimAggressivelyForAuthWrite(key)
        const retry = safeLocalSetItem(key, value)
        if (!retry) {
          console.warn('[storage] auth token write still failed for', key)
        }
      }
    },
    removeItem: (key) => safeLocalRemoveItem(key),
  }
}
