import { isSupabaseConfigured, supabase } from '@/lib/supabase'

/**
 * Ensure a real Supabase Auth JWT is present before RLS / RPC calls.
 * The UI can still show a profile from `imajica_auth_user` while the JWT is
 * missing (expired refresh, or localStorage quota wiped the sb-*-auth-token).
 */
export async function requireSupabaseSession(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return

  // 1) Fast path — in-memory / stored session
  const { data: first } = await supabase.auth.getSession()
  if (first.session?.access_token) {
    // Proactively refresh if token is near expiry (< 2 min left)
    const expiresAt = first.session.expires_at
    if (expiresAt && expiresAt * 1000 - Date.now() < 120_000) {
      const { data: soft } = await supabase.auth.refreshSession()
      if (soft.session?.access_token) return
    } else {
      return
    }
  }

  // 2) Refresh using stored refresh_token
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshed.session?.access_token) return

  // 3) Network validation — sometimes getSession is empty but cookie/storage recovers via getUser
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userData.user) {
    const { data: again } = await supabase.auth.getSession()
    if (again.session?.access_token) return
    const { data: afterUser } = await supabase.auth.refreshSession()
    if (afterUser.session?.access_token) return
  }

  const detail = refreshError?.message || userError?.message || ''
  const expired =
    /session|refresh|expired|invalid.*jwt|not authenticated/i.test(detail) ||
    !first.session

  throw new Error(
    expired
      ? 'Session expired. Sign out and sign in again, then place the order.'
      : 'Not signed in to the database. Sign out and sign in again with your branch account (Cainta / San Mateo / Lipa / …), then retry Place Order.',
  )
}

/** Quiet keepalive for long-open clinic tablets (booking desk left open for hours). */
export async function softRefreshSupabaseSession(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false
  try {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      const { data: refreshed } = await supabase.auth.refreshSession()
      return Boolean(refreshed.session?.access_token)
    }
    const expiresAt = data.session.expires_at
    if (expiresAt && expiresAt * 1000 - Date.now() < 10 * 60_000) {
      const { data: refreshed } = await supabase.auth.refreshSession()
      return Boolean(refreshed.session?.access_token)
    }
    return true
  } catch {
    return false
  }
}

export function mapBookingAuthError(message: string): string {
  if (/session expired/i.test(message)) {
    return 'Session expired. Sign out and sign in again, then place the order.'
  }
  if (/not signed in/i.test(message)) {
    return 'Not signed in to the database. Sign out and sign in again with your branch account, then retry Place Order.'
  }
  return message
}
