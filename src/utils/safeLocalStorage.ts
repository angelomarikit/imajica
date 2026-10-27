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

export function safeLocalSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch (err) {
    if (!isQuotaError(err)) throw err
    reclaimNonAuthSpace()
    localStorage.setItem(key, value)
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
