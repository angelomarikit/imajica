import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import {
  clearSupabaseAuthStorageKeys,
  reclaimClinicStorageForAuth,
} from '@/utils/safeLocalStorage'

const RETRY_HINT =
  'Refresh this page once, sign in again if asked, then retry Add Patient / Place Order.'

/**
 * Ensure a real Supabase Auth JWT is present before RLS / RPC calls.
 * The UI can still show a profile from `imajica_auth_user` while the JWT is
 * missing (expired refresh, or localStorage quota wiped the sb-*-auth-token).
 * Busy clinics (e.g. Lipa) hit this often when Add Patient / Place Order runs.
 */
export async function requireSupabaseSession(): Promise<void> {
  const client = supabase
  if (!isSupabaseConfigured || !client) return

  const tryOnce = async (): Promise<boolean> => {
    const { data: first } = await client.auth.getSession()
    if (first.session?.access_token) {
      const expiresAt = first.session.expires_at
      if (expiresAt && expiresAt * 1000 - Date.now() < 120_000) {
        const { data: soft } = await client.auth.refreshSession()
        if (soft.session?.access_token) return true
      } else {
        return true
      }
    }

    const { data: refreshed } = await client.auth.refreshSession()
    if (refreshed.session?.access_token) return true

    const { data: userData } = await client.auth.getUser()
    if (userData.user) {
      const { data: again } = await client.auth.getSession()
      if (again.session?.access_token) return true
      const { data: afterUser } = await client.auth.refreshSession()
      if (afterUser.session?.access_token) return true
    }
    return false
  }

  if (await tryOnce()) return

  // Tablet storage often wiped the refresh token while the green UI profile stayed.
  reclaimClinicStorageForAuth()
  if (await tryOnce()) return

  throw new Error(`Session expired. ${RETRY_HINT}`)
}

/**
 * Quiet keepalive for long-open clinic/franchise/OM desks (PC Chrome + tablets).
 * Returns false only when no access token remains — callers must not hard-logout on false alone.
 */
export async function softRefreshSupabaseSession(): Promise<boolean> {
  const client = supabase
  if (!isSupabaseConfigured || !client) return false
  try {
    const { data } = await client.auth.getSession()
    if (!data.session) {
      reclaimClinicStorageForAuth()
      const { data: refreshed } = await client.auth.refreshSession()
      if (refreshed.session?.access_token) return true
      const { data: again } = await client.auth.getSession()
      return Boolean(again.session?.access_token)
    }
    const accessBefore = data.session.access_token
    const expiresAt = data.session.expires_at
    if (expiresAt && expiresAt * 1000 - Date.now() < 10 * 60_000) {
      const { data: refreshed } = await client.auth.refreshSession()
      if (refreshed.session?.access_token) return true
      reclaimClinicStorageForAuth()
      const { data: again } = await client.auth.refreshSession()
      if (again.session?.access_token) return true
      // Refresh failed (network/quota) but prior token may still work briefly — keep session.
      const { data: still } = await client.auth.getSession()
      return Boolean(still.session?.access_token || accessBefore)
    }
    return true
  } catch {
    try {
      const { data } = await client.auth.getSession()
      return Boolean(data.session?.access_token)
    } catch {
      return false
    }
  }
}

/**
 * After password sign-in: free space and confirm the JWT actually persisted.
 * Prevents “looks signed in” UI without a usable token (common on Lipa tablets).
 */
export async function ensureSessionPersistedAfterLogin(tokens?: {
  access_token: string
  refresh_token: string
}): Promise<void> {
  const client = supabase
  if (!isSupabaseConfigured || !client) return

  reclaimClinicStorageForAuth()

  const access =
    tokens?.access_token ||
    (await client.auth.getSession()).data.session?.access_token
  const refresh =
    tokens?.refresh_token ||
    (await client.auth.getSession()).data.session?.refresh_token

  if (!access || !refresh) {
    throw new Error(`Could not finish sign-in. ${RETRY_HINT}`)
  }

  const { error } = await client.auth.setSession({
    access_token: access,
    refresh_token: refresh,
  })
  if (error) {
    reclaimClinicStorageForAuth()
    clearSupabaseAuthStorageKeys()
    const retry = await client.auth.setSession({
      access_token: access,
      refresh_token: refresh,
    })
    if (retry.error) throw new Error(`Could not finish sign-in. ${RETRY_HINT}`)
  }

  const { data: check } = await client.auth.getSession()
  if (!check.session?.access_token) {
    throw new Error(`Could not finish sign-in. ${RETRY_HINT}`)
  }
}

export function mapBookingAuthError(message: string): string {
  if (/failed to fetch dynamically imported module|loading chunk|importing a module script failed/i.test(message)) {
    return 'App updated on the server. Refresh this page once, sign in again if asked, then place the order.'
  }
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return 'Network error while saving. Check internet, refresh once, then retry Place Order.'
  }
  if (/session expired|could not finish sign-in/i.test(message)) {
    return message.includes('Refresh this page')
      ? message
      : `Session expired. ${RETRY_HINT}`
  }
  if (/not signed in/i.test(message)) {
    return `Not signed in. ${RETRY_HINT}`
  }
  return message
}
