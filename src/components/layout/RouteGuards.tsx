import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, isStaffRole } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'

export function RequireAuth({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-ui">Loading…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children ? <>{children}</> : <Outlet />
}

export function PublicOnly({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth()
  if (user) {
    return <Navigate to={isStaffRole(user.role) ? '/admin/dashboard' : '/client/dashboard'} replace />
  }
  return children ? <>{children}</> : <Outlet />
}

export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[]
  children?: React.ReactNode
}) {
  const { user, hasRole } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!hasRole(...roles)) {
    return <Navigate to={isStaffRole(user.role) ? '/admin/dashboard' : '/client/dashboard'} replace />
  }
  return children ? <>{children}</> : <Outlet />
}

export function RequireStaff({ children }: { children?: React.ReactNode }) {
  const staffRoles: UserRole[] = [
    'SUPER_ADMIN',
    'HQ_ADMIN',
    'BRANCH_ADMIN',
    'DOCTOR',
    'NURSE',
    'AESTHETICIAN',
    'RECEPTIONIST',
    'STAFF',
  ]
  return <RequireRole roles={staffRoles}>{children}</RequireRole>
}

/** Client portal only — staff are sent to the admin dashboard. */
export function RequireClient({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (isStaffRole(user.role)) {
    return <Navigate to="/admin/dashboard" replace />
  }
  return children ? <>{children}</> : <Outlet />
}
