import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { AuthSessionUser, UserRole } from '@/types'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

interface AuthContextValue {
  user: AuthSessionUser | null
  loading: boolean
  isDemoMode: boolean
  login: (email: string, password: string, roleHint?: UserRole) => Promise<AuthSessionUser>
  register: (payload: {
    email: string
    password: string
    fullName: string
    phone?: string
  }) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  hasRole: (...roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DEMO_USERS: Record<string, AuthSessionUser & { password: string }> = {
  'admin@imajica.ph': {
    id: 'user-admin',
    email: 'admin@imajica.ph',
    fullName: 'Maria Santos',
    role: 'HQ_ADMIN',
    password: 'password123',
    avatarUrl: undefined,
  },
  'staff@imajica.ph': {
    id: 'user-staff',
    email: 'staff@imajica.ph',
    fullName: 'Paolo Garcia',
    role: 'RECEPTIONIST',
    password: 'password123',
    branchId: 'br-pasig',
  },
  'client@imajica.ph': {
    id: 'user-client',
    email: 'client@imajica.ph',
    fullName: 'Maria Santos',
    role: 'CLIENT',
    password: 'password123',
  },
}

const STAFF_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'HQ_ADMIN',
  'BRANCH_ADMIN',
  'DOCTOR',
  'NURSE',
  'AESTHETICIAN',
  'RECEPTIONIST',
  'STAFF',
]

const ROLE_PRIORITY: UserRole[] = [
  'SUPER_ADMIN',
  'HQ_ADMIN',
  'BRANCH_ADMIN',
  'DOCTOR',
  'NURSE',
  'AESTHETICIAN',
  'RECEPTIONIST',
  'STAFF',
  'CLIENT',
]

export function isStaffRole(role: UserRole) {
  return STAFF_ROLES.includes(role)
}

function pickHighestRole(roleIds: string[]): UserRole {
  for (const role of ROLE_PRIORITY) {
    if (roleIds.includes(role)) return role
  }
  return 'CLIENT'
}

/** Resolve app session from Supabase auth user + profiles / user_roles (DB is source of truth). */
async function resolveSupabaseSessionUser(authUser: SupabaseUser): Promise<AuthSessionUser> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const meta = authUser.user_metadata as { full_name?: string; role?: UserRole }

  const [{ data: roleRows, error: roleError }, { data: profile }] = await Promise.all([
    supabase.from('user_roles').select('role_id, branch_id').eq('user_id', authUser.id),
    supabase.from('profiles').select('full_name, email').eq('id', authUser.id).maybeSingle(),
  ])

  if (roleError) {
    console.error('[auth] failed to load user_roles', roleError)
  }

  const roleIds = (roleRows ?? []).map((r) => String(r.role_id))
  const role = roleIds.length > 0 ? pickHighestRole(roleIds) : meta.role ?? 'CLIENT'
  const staffBranch = (roleRows ?? []).find(
    (r) => r.branch_id && r.branch_id !== '00000000-0000-0000-0000-000000000001',
  )

  return {
    id: authUser.id,
    email: profile?.email || authUser.email || '',
    fullName: profile?.full_name || meta.full_name || authUser.email || '',
    role,
    branchId: staffBranch?.branch_id ? String(staffBranch.branch_id) : undefined,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSessionUser | null>(() => {
    const raw = localStorage.getItem('imajica_auth_user')
    return raw ? (JSON.parse(raw) as AuthSessionUser) : null
  })
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const persist = useCallback((next: AuthSessionUser | null) => {
    setUser(next)
    if (next) localStorage.setItem('imajica_auth_user', JSON.stringify(next))
    else localStorage.removeItem('imajica_auth_user')
  }, [])

  // Refresh role from DB when a Supabase session already exists (fixes stale CLIENT in localStorage)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        if (data.session?.user) {
          const sessionUser = await resolveSupabaseSessionUser(data.session.user)
          if (!cancelled) persist(sessionUser)
        }
      } catch (err) {
        console.error('[auth] session restore failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Avoid querying Supabase inside the auth callback (can deadlock the client).
      window.setTimeout(() => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          persist(null)
          return
        }
        void resolveSupabaseSessionUser(session.user)
          .then(persist)
          .catch((err) => console.error('[auth] role refresh failed', err))
      }, 0)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [persist])

  const login = useCallback(
    async (email: string, password: string, roleHint?: UserRole) => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (!data.user) throw new Error('Sign in failed')
        const sessionUser = await resolveSupabaseSessionUser(data.user)
        // Keep Auth metadata in sync so older builds / JWT claims also see the staff role
        if (sessionUser.role !== 'CLIENT') {
          void supabase.auth.updateUser({
            data: { role: sessionUser.role, full_name: sessionUser.fullName },
          })
        }
        persist(sessionUser)
        return sessionUser
      }

      const demo = DEMO_USERS[email.toLowerCase()]
      if (demo && demo.password === password) {
        const { password: _pw, ...sessionUser } = demo
        void _pw
        const next = roleHint ? { ...sessionUser, role: roleHint } : sessionUser
        persist(next)
        return next
      }

      if (roleHint) {
        const next: AuthSessionUser = {
          id: `demo-${roleHint.toLowerCase()}`,
          email,
          fullName: 'Maria Santos',
          role: roleHint,
        }
        persist(next)
        return next
      }

      throw new Error(
        isSupabaseConfigured
          ? 'Invalid email or password'
          : 'Invalid email or password. Offline demo: admin@imajica.ph / password123',
      )
    },
    [persist],
  )

  const register = useCallback(
    async (payload: { email: string; password: string; fullName: string; phone?: string }) => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: payload.email,
          password: payload.password,
          options: {
            data: { full_name: payload.fullName, phone: payload.phone, role: 'CLIENT' },
          },
        })
        if (error) throw error
        if (data.user) {
          persist({
            id: data.user.id,
            email: payload.email,
            fullName: payload.fullName,
            role: 'CLIENT',
          })
        }
        return
      }

      persist({
        id: `client-${Date.now()}`,
        email: payload.email,
        fullName: payload.fullName,
        role: 'CLIENT',
      })
    },
    [persist],
  )

  const logout = useCallback(async () => {
    if (isSupabaseConfigured && supabase) await supabase.auth.signOut()
    persist(null)
  }, [persist])

  const resetPassword = useCallback(async (email: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      return
    }
    void email
  }, [])

  const hasRole = useCallback(
    (...roles: UserRole[]) => (user ? roles.includes(user.role) : false),
    [user],
  )

  const value = useMemo(
    () => ({
      user,
      loading,
      isDemoMode: !isSupabaseConfigured,
      login,
      register,
      logout,
      resetPassword,
      hasRole,
    }),
    [user, loading, login, register, logout, resetPassword, hasRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
