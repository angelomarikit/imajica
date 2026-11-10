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

/** Heavy clinic caches — trim/remove under quota so auth + saves keep working on every branch. */
const HEAVY_CACHE_KEYS = [
  'imajica_clients',
  'imajica_sales',
  'imajica_remote_live_sales',
  'imajica_appointments',
  'imajica_analytics_sales',
  'imajica_expenses',
  'imajica_cash_drawer_migrated_v1',
] as const

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
 * Free tablet storage so Supabase can write the JWT again.
 * Call before login persist and before session refresh retries.
 */
export function reclaimClinicStorageForAuth(): void {
  reclaimNonAuthSpace()
  reclaimHeavyCaches()
  reclaimCashMirrorKeys()
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
        console.warn('[storage] quota still exceeded for', key)
        return false
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
        reclaimClinicStorageForAuth()
        safeLocalSetItem(key, value)
      }
    },
    removeItem: (key) => safeLocalRemoveItem(key),
  }
}
