import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseAuthStorage } from '@/utils/safeLocalStorage'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(
  url &&
    anonKey &&
    !url.includes('your-project') &&
    anonKey !== 'your-anon-key',
)

/**
 * Single browser client. Auth tokens persist in localStorage with a storage
 * adapter that frees form-cache keys if the device hits storage quota — so
 * booking / sales keep a valid JWT instead of a stale UI-only session.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: createSupabaseAuthStorage(),
      },
    })
  : null
