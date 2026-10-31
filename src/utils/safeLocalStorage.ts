/**
 * localStorage helpers that never let non-auth data (forms, caches) wipe the
 * Supabase JWT. Tablets hit QuotaExceededError after saving many signatures;
 * that used to leave the UI “signed in” while Place Order failed with
 * “Session expired”.
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
    setItem: (key, value) => safeLocalSetItem(key, value),
    removeItem: (key) => safeLocalRemoveItem(key),
  }
}
