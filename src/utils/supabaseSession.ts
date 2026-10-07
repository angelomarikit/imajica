import { isSupabaseConfigured, supabase } from '@/lib/supabase'

/**
 * Ensure a real Supabase Auth JWT is present before RLS / RPC calls.
 * Local demo sessions (localStorage only) look signed-in in the UI but fail checkout.
 */
export async function requireSupabaseSession(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return

  const { data: first } = await supabase.auth.getSession()
  if (first.session?.access_token) return

  const { data: refreshed, error } = await supabase.auth.refreshSession()
  if (refreshed.session?.access_token) return

  throw new Error(
    error?.message?.includes('session') || error?.message?.includes('Refresh')
      ? 'Session expired. Sign out and sign in again, then place the order.'
      : 'Not signed in to the database. Sign out and sign in again with your branch account (Cainta / San Mateo / …), then retry Place Order.',
  )
}

export function mapBookingAuthError(message: string): string {
  if (/not signed in/i.test(message)) {
    return 'Not signed in to the database. Sign out and sign in again with your branch account, then retry Place Order.'
  }
  return message
}
