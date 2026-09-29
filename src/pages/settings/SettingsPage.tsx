import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { demoBranches, demoSystemSettings } from '@/constants/demoData'
import type { Branch } from '@/types'
import { cn } from '@/utils/cn'

const tabs = [
  { to: '/admin/settings', end: true, label: 'General' },
  { to: '/admin/team/branches', label: 'Branches' },
  { to: '/admin/team/user-access', label: 'User Access' },
  { to: '/admin/settings/payments', label: 'Payments' },
  { to: '/admin/settings/notifications', label: 'Notifications' },
  { to: '/admin/settings/security', label: 'Security' },
]

export function SettingsRoutes() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">System Settings</h1>
        <p className="text-sm text-slate-ui">Manage clinic information, branches, services, staff access, and system preferences.</p>
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
        <Route index element={<GeneralSettings />} />
        <Route path="branches" element={<BranchesSettings />} />
        <Route path="users" element={<UsersSettings />} />
        <Route path="payments" element={<PaymentsSettings />} />
        <Route path="notifications" element={<NotificationsSettings />} />
        <Route path="security" element={<SecuritySettings />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
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
  const [branches, setBranches] = useState(demoBranches)
  const [selectedId, setSelectedId] = useState(demoBranches[0].id)
  const selected = branches.find((b) => b.id === selectedId)!

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
                  {b.isMain ? <Badge variant="gold">Main Branch</Badge> : <Badge variant="success">Active</Badge>}
                </div>
                <p className="mt-1 text-xs text-slate-ui">{b.address}</p>
                <p className="mt-1 text-xs text-slate-ui">
                  {b.staffCount} Staff · {b.treatmentRooms} Rooms
                </p>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl">{selected.name}</h2>
          <Button size="sm" onClick={() => toast.success('Branch changes saved (demo)')}>
            Save Changes
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Branch Name" value={selected.name} onChange={(e) => updateSelected({ name: e.target.value })} />
          <Input label="Branch Code" value={selected.code} onChange={(e) => updateSelected({ code: e.target.value })} />
          <Input
            label="Address"
            className="sm:col-span-2"
            value={selected.address}
            onChange={(e) => updateSelected({ address: e.target.value })}
          />
          <Input label="Contact Number" value={selected.phone} onChange={(e) => updateSelected({ phone: e.target.value })} />
          <Input label="Email Address" value={selected.email} onChange={(e) => updateSelected({ email: e.target.value })} />
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.status === 'active'}
              onChange={(e) => updateSelected({ status: e.target.checked ? 'active' : 'inactive' })}
            />
            Active Branch
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.isMain}
              onChange={(e) => updateSelected({ isMain: e.target.checked })}
            />
            Set as Main Branch
          </label>
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
        Manage user roles: SUPER_ADMIN, HQ_ADMIN, BRANCH_ADMIN, clinical staff, and CLIENT.
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
  return (
    <Card className="p-5">
      <CardHeader title="Security" />
      <p className="text-sm text-slate-ui">
        Audit logging enabled for client changes, payments, payroll, inventory adjustments, and role changes.
      </p>
    </Card>
  )
}
