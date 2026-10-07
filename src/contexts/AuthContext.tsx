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
import { getBranches } from '@/services/branchService'
import { teamAccountsAsDemoUsers } from '@/constants/teamAccountsSeed'
import { kioskStaffAsDemoUsers } from '@/constants/kioskStaffSeed'

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

/** Demo franchise branch: Dasmariñas, Cavite (FR01) */
const DEMO_FRANCHISE_BRANCH_ID = '22222222-2222-2222-2222-222222222205'

const DEMO_USERS: Record<string, AuthSessionUser & { password: string }> = {
  'admin@imajica.ph': {
    id: 'user-admin',
    email: 'admin@imajica.ph',
    fullName: 'Maria Santos',
    role: 'HQ_ADMIN',
    password: 'password123',
    avatarUrl: undefined,
  },
  'franchise@imajica.ph': {
    id: 'user-franchise',
    email: 'franchise@imajica.ph',
    fullName: 'Clinic Manager',
    role: 'BRANCH_ADMIN',
    password: 'password123',
    branchId: DEMO_FRANCHISE_BRANCH_ID,
    branchType: 'franchise',
    branchName: 'Dasmariñas, Cavite',
  },
  'staff@imajica.ph': {
    id: 'user-staff',
    email: 'staff@imajica.ph',
    fullName: 'Paolo Garcia',
    role: 'RECEPTIONIST',
    password: 'password123',
    branchId: '22222222-2222-2222-2222-222222222203',
    branchType: 'company_owned',
    branchName: 'Pasig City',
  },
  'client@imajica.ph': {
    id: 'user-client',
    email: 'client@imajica.ph',
    fullName: 'Maria Santos',
    role: 'CLIENT',
    password: 'password123',
  },
  ...teamAccountsAsDemoUsers(),
  ...kioskStaffAsDemoUsers(),
}

const STAFF_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'HQ_ADMIN',
  'HR',
  'MARKETING',
  'BRANCH_MARKETING',
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
  'HR',
  'MARKETING',
  'BRANCH_MARKETING',
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

function branchMeta(branchId: string | undefined) {
  if (!branchId) return {}
  const b = getBranches().find((x) => x.id === branchId)
  if (!b) return { branchId }
  return {
    branchId: b.id,
    branchType: b.branchType,
    branchName: b.name,
  }
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
  // Org-wide roles — never attach a clinic branch (e.g. San Mateo) from user_roles.
  const staffBranch =
    role === 'SUPER_ADMIN' || role === 'HQ_ADMIN' || role === 'HR' || role === 'MARKETING'
      ? undefined
      : (roleRows ?? []).find(
          (r) => r.branch_id && r.branch_id !== '00000000-0000-0000-0000-000000000001',
        )
  const branchId = staffBranch?.branch_id ? String(staffBranch.branch_id) : undefined

  let branchType: AuthSessionUser['branchType']
  let branchName: string | undefined
  if (branchId) {
    const local = getBranches().find((b) => b.id === branchId)
    if (local) {
      branchType = local.branchType
      branchName = local.name
    } else {
      const { data: remote, error: branchError } = await supabase
        .from('branches')
        .select('name, branch_type')
        .eq('id', branchId)
        .maybeSingle()
      if (branchError) {
        console.error('[auth] failed to load branch meta', branchError)
      }
      if (remote) {
        branchName = remote.name
        branchType = remote.branch_type as AuthSessionUser['branchType']
      }
    }
  }

  // Franchise owners must carry branchType for nav/guards; warn when missing
  if (role === 'BRANCH_ADMIN' && branchId && !branchType) {
    console.warn(
      '[auth] BRANCH_ADMIN has branch_id but branch_type could not be resolved — check branches.branch_type = franchise',
      branchId,
    )
  }

  return {
    id: authUser.id,
    email: profile?.email || authUser.email || '',
    fullName: profile?.full_name || meta.full_name || authUser.email || '',
    role,
    branchId,
    branchType,
    branchName,
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
      const normalized = email.toLowerCase().trim()

      function buildDemoSession(demoEmail: string, hint?: UserRole): AuthSessionUser | null {
        const demo = DEMO_USERS[demoEmail]
        if (!demo || demo.password !== password) return null
        const { password: _pw, ...sessionUser } = demo
        void _pw
        if (hint === 'BRANCH_ADMIN') {
          return {
            ...sessionUser,
            role: 'BRANCH_ADMIN',
            ...branchMeta(DEMO_FRANCHISE_BRANCH_ID),
            branchId: DEMO_FRANCHISE_BRANCH_ID,
            branchType: 'franchise',
            branchName: 'Dasmariñas, Cavite',
          }
        }
        if (hint) {
          return { ...sessionUser, role: hint, ...branchMeta(sessionUser.branchId) }
        }
        return sessionUser
      }

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalized,
          password,
        })

        if (!error && data.user) {
          const sessionUser = await resolveSupabaseSessionUser(data.user)
          // SQL may assign BRANCH_ADMIN before branch_type is readable — keep franchise hint for known demo email
          if (
            sessionUser.role === 'BRANCH_ADMIN' &&
            sessionUser.branchId &&
            !sessionUser.branchType
          ) {
            const local = getBranches().find((b) => b.id === sessionUser.branchId)
            if (local?.branchType) {
              sessionUser.branchType = local.branchType
              sessionUser.branchName = local.name
            }
          }
          if (sessionUser.role !== 'CLIENT') {
            void supabase.auth.updateUser({
              data: { role: sessionUser.role, full_name: sessionUser.fullName },
            })
          }
          persist(sessionUser)
          return sessionUser
        }

        // Known offline demo accounts still work when the Auth user was never created
        const demoFallback = buildDemoSession(normalized, roleHint)
        if (demoFallback) {
          console.warn(
            '[auth] Supabase sign-in failed; using local demo session for',
            normalized,
            error?.message,
          )
          persist(demoFallback)
          return demoFallback
        }

        throw error ?? new Error('Invalid email or password')
      }

      const demoSession = buildDemoSession(normalized, roleHint)
      if (demoSession) {
        persist(demoSession)
        return demoSession
      }

      if (roleHint) {
        const franchiseMeta =
          roleHint === 'BRANCH_ADMIN'
            ? {
                branchId: DEMO_FRANCHISE_BRANCH_ID,
                branchType: 'franchise' as const,
                branchName: 'Dasmariñas, Cavite',
              }
            : {}
        const next: AuthSessionUser = {
          id: `demo-${roleHint.toLowerCase()}`,
          email: normalized,
          fullName: roleHint === 'BRANCH_ADMIN' ? 'Clinic Manager' : 'Maria Santos',
          role: roleHint,
          ...franchiseMeta,
        }
        persist(next)
        return next
      }

      throw new Error(
        'Invalid email or password. Offline demo: admin@imajica.ph / franchise@imajica.ph / password123 — or any seeded team account / Imajica123 (see docs/TEAM_ACCOUNT_CREDENTIALS.md)',
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
