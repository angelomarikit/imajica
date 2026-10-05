import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { demoBranches, demoSystemSettings } from '@/constants/demoData'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Branch } from '@/types'
import { cn } from '@/utils/cn'
import { isFranchiseBranchOwner, isHrRole, isTimeclockStaff } from '@/utils/franchiseAccess'
import { formatRoleLabel } from '@/utils/roleLabels'

const hqTabs = [
  { to: '/admin/settings', end: true, label: 'General' },
  { to: '/admin/team/branches', label: 'Branches' },
  { to: '/admin/team/user-access', label: 'User Access' },
  { to: '/admin/settings/payments', label: 'Payments' },
  { to: '/admin/settings/notifications', label: 'Notifications' },
  { to: '/admin/settings/security', label: 'Security' },
]

const franchiseTabs = [
  { to: '/admin/settings', end: true, label: 'Profile' },
  { to: '/admin/settings/security', label: 'Password' },
]

export function SettingsRoutes() {
  const { user } = useAuth()
  const staffSettings =
    isFranchiseBranchOwner(user) || isTimeclockStaff(user) || isHrRole(user?.role)
  const tabs = staffSettings ? franchiseTabs : hqTabs

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">
          {staffSettings ? 'Account Settings' : 'System Settings'}
        </h1>
        <p className="text-sm text-slate-ui">
          {staffSettings
            ? 'Update your profile details and password for this branch account.'
            : 'Manage clinic information, branches, services, staff access, and system preferences.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                'rounded-[10px] border px-3.5 py-2 text-sm font-medium',
                isActive ? 'border-emerald-900 bg-emerald-900 text-white' : 'border-border bg-white',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <Routes>
        <Route index element={staffSettings ? <ProfileSettings /> : <GeneralSettings />} />
        {!staffSettings ? (
          <>
            <Route path="branches" element={<BranchesSettings />} />
            <Route path="users" element={<UsersSettings />} />
            <Route path="payments" element={<PaymentsSettings />} />
            <Route path="notifications" element={<NotificationsSettings />} />
          </>
        ) : null}
        <Route path="security" element={<SecuritySettings />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  )
}

function ProfileSettings() {
  const { user } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [email] = useState(user?.email ?? '')

  async function saveProfile() {
    if (!fullName.trim()) {
      toast.error('Full name is required')
      return
    }
    if (isSupabaseConfigured && supabase && user?.id) {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (error) {
        toast.error(error.message)
        return
      }
    }
    toast.success('Profile saved')
  }

  return (
    <Card className="p-5">
      <CardHeader
        title="Profile"
        description={
          user?.branchName
            ? `Clinic: ${user.branchName}`
            : 'Your account details'
        }
      />
      <div className="mt-4 grid max-w-lg gap-3">
        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="Email" value={email} disabled />
        <p className="text-xs text-slate-ui">
          Role: <strong>{formatRoleLabel(user?.role)}</strong>
          {user?.branchName ? ` · ${user.branchName}` : ''}
        </p>
        <div>
          <Button type="button" onClick={() => void saveProfile()}>
            Save profile
          </Button>
        </div>
      </div>
    </Card>
  )
}

function GeneralSettings() {
  return (
    <Card className="p-5">
      <CardHeader title="General" description="Organization defaults" />
      <p className="text-sm">
        Default commission rate: <strong>{(demoSystemSettings.defaultCommissionRate * 100).toFixed(0)}%</strong>
      </p>
      <p className="mt-2 text-sm text-slate-ui">Stored in system_settings and editable by HQ admins.</p>
    </Card>
  )
}

function BranchesSettings() {
  const initial = demoBranches.length > 0 ? demoBranches : []
  const [branches, setBranches] = useState(initial)
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? '')
  const selected = branches.find((b) => b.id === selectedId)

  if (!selected) {
    return (
      <Card className="p-5">
        <CardHeader title="Branches" description="No branches loaded yet." />
        <p className="text-sm text-slate-ui">Add clinic branches from Team → Branches.</p>
      </Card>
    )
  }

  function updateSelected(patch: Partial<Branch>) {
    setBranches((prev) => prev.map((b) => (b.id === selectedId ? { ...b, ...patch } : b)))
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.3fr]">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl">Branches</h2>
          <Button size="sm" onClick={() => toast.message('Add branch form available when connected to Supabase')}>
            + Add Branch
          </Button>
        </div>
        <ul className="space-y-2">
          {branches.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => setSelectedId(b.id)}
                className={cn(
                  'w-full rounded-[12px] border p-3 text-left',
                  selectedId === b.id ? 'border-emerald-900 bg-emerald-50' : 'border-border bg-white',
                )}
              >
                <div className="flex items-center gap-2">
                  <p className="font-medium">{b.name}</p>
                  {b.isMain ? <Badge variant="gold">Main</Badge> : null}
                </div>
                <p className="text-xs text-slate-ui">{b.address}</p>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-5">
        <CardHeader title={selected.name} description={selected.code} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input
            label="Phone"
            value={selected.phone}
            onChange={(e) => updateSelected({ phone: e.target.value })}
          />
          <Input
            label="Email"
            value={selected.email}
            onChange={(e) => updateSelected({ email: e.target.value })}
          />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Facility label="Treatment Rooms" value={selected.treatmentRooms} />
          <Facility label="Consultation Rooms" value={selected.consultationRooms} />
          <Facility label="Waiting Areas" value={selected.waitingAreas} />
          <Facility label="Parking" value={selected.parkingAvailable ? 'Yes' : 'No'} />
        </div>
      </Card>
    </div>
  )
}

function Facility({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[10px] bg-beige p-3 text-center">
      <p className="text-xs text-slate-ui">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}

function UsersSettings() {
  return (
    <Card className="p-5">
      <CardHeader title="Staff & Roles" description="Role assignments are enforced via Supabase RLS." />
      <p className="text-sm text-slate-ui">
        Manage user roles: Super Admin, HQ Admin, HR (all clinics), Clinic Manager (BRANCH_ADMIN),
        clinical staff, and Client.
      </p>
    </Card>
  )
}

function PaymentsSettings() {
  return (
    <Card className="p-5">
      <CardHeader title="Payments" description="PayMongo secrets stay in Edge Functions / server env only." />
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-ui">
        <li>Enabled methods: Cash, GCash, PayMaya, Credit Card, Bank Transfer, PayMongo</li>
        <li>Invoices are marked paid only after server-side verification</li>
      </ul>
    </Card>
  )
}

function NotificationsSettings() {
  return (
    <Card className="p-5">
      <CardHeader title="Notifications" description="Template-driven SMS, email, and push." />
      <p className="text-sm text-slate-ui">
        Events: confirmation, reminder, reschedule, cancellation, follow-up, package expiry, VIP promo, payment
        confirmation.
      </p>
    </Card>
  )
}

function SecuritySettings() {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  async function changePassword() {
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setSaving(true)
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) {
          toast.error(error.message)
          return
        }
        toast.success('Password updated')
      } else {
        toast.message(
          user?.email?.includes('franchise@') || user?.email?.includes('admin@')
            ? 'Demo mode: password change is simulated. Connect Supabase to persist it.'
            : 'Connect Supabase to change password.',
        )
      }
      setPassword('')
      setConfirm('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5">
      <CardHeader title="Security" description="Change your account password." />
      <div className="mt-4 grid max-w-lg gap-3">
        <Input
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Input
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
        <div>
          <Button type="button" disabled={saving} onClick={() => void changePassword()}>
            {saving ? 'Saving…' : 'Update password'}
          </Button>
        </div>
      </div>
      {!isFranchiseBranchOwner(user) ? (
        <p className="mt-4 text-sm text-slate-ui">
          Audit logging enabled for client changes, payments, payroll, inventory adjustments, and role changes.
        </p>
      ) : null}
    </Card>
  )
}
