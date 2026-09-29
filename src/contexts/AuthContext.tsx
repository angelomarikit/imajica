import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthSessionUser, UserRole } from '@/types'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

interface AuthContextValue {
  user: AuthSessionUser | null
  loading: boolean
  isDemoMode: boolean
  login: (email: string, password: string, roleHint?: UserRole) => Promise<void>
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

export function isStaffRole(role: UserRole) {
  return STAFF_ROLES.includes(role)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSessionUser | null>(() => {
    const raw = localStorage.getItem('imajica_auth_user')
    return raw ? (JSON.parse(raw) as AuthSessionUser) : null
  })
  const [loading] = useState(false)

  const persist = useCallback((next: AuthSessionUser | null) => {
    setUser(next)
    if (next) localStorage.setItem('imajica_auth_user', JSON.stringify(next))
    else localStorage.removeItem('imajica_auth_user')
  }, [])

  const login = useCallback(
    async (email: string, password: string, roleHint?: UserRole) => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const meta = data.user.user_metadata as { full_name?: string; role?: UserRole }
        persist({
          id: data.user.id,
          email: data.user.email ?? email,
          fullName: meta.full_name ?? email,
          role: meta.role ?? roleHint ?? 'CLIENT',
        })
        return
      }

      const demo = DEMO_USERS[email.toLowerCase()]
      if (demo && demo.password === password) {
        const { password: _pw, ...sessionUser } = demo
        void _pw
        persist(roleHint ? { ...sessionUser, role: roleHint } : sessionUser)
        return
      }

      if (roleHint) {
        persist({
          id: `demo-${roleHint.toLowerCase()}`,
          email,
          fullName: roleHint === 'CLIENT' ? 'Maria Santos' : 'Maria Santos',
          role: roleHint,
        })
        return
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
