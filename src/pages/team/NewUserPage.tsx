import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getBranches } from '@/services/branchService'
import { createAccessUser } from '@/services/userAccessService'
import { isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/utils/cn'
import {
  HQ_SENTINEL_BRANCH_ID,
  isOrgWideRole,
} from '@/utils/franchiseAccess'
import { formatRoleLabel } from '@/utils/roleLabels'

const ROLE_OPTIONS = [
  'SUPER_ADMIN',
  'HQ_ADMIN',
  'HR',
  'BRANCH_ADMIN',
  'DOCTOR',
  'NURSE',
  'AESTHETICIAN',
  'RECEPTIONIST',
  'STAFF',
] as const

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-border bg-white px-3.5 py-2.5 text-sm text-[#073D2C] placeholder:text-slate-400 outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10'

const labelClass = 'text-sm font-medium text-[#073D2C]'

export function NewUserPage() {
  const navigate = useNavigate()
  const branches = useMemo(() => getBranches().filter((b) => b.status === 'active'), [])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('')
  const [branchId, setBranchId] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !email.trim()) {
      toast.error('Full name and email are required')
      return
    }
    if (!role) {
      toast.error('Select a role')
      return
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    const orgWide = isOrgWideRole(role)
    if (isSupabaseConfigured && !orgWide && !branchId) {
      toast.error('Select a clinic branch for this role, or choose HR / HQ for All Branches.')
      return
    }
    const branch = branches.find((b) => b.id === branchId)
    setSaving(true)
    try {
      await createAccessUser({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        branchId: orgWide ? HQ_SENTINEL_BRANCH_ID : branchId || null,
        branchName: orgWide ? 'All Branches (organization)' : branch?.name ?? null,
        status: 'active',
      })
      toast.success('User added')
      navigate('/admin/team/user-access')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title={<span className="text-[#C5A059]">Create User Account</span>}
        description="Register new staff credentials, assign access roles, and set branch-specific operations."
        actions={
          <Link to="/admin/team/user-access">
            <Button
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Back to List
            </Button>
          </Link>
        }
      />

      <Card className="mx-auto max-w-4xl p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">Account Credentials</h2>
          <p className="mt-1 text-sm text-slate-ui">
            Establish login details, access levels, and assign account permissions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Full Name</span>
              <input
                className={fieldClass}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
                required
              />
            </label>
            <label className="block">
              <span className={labelClass}>Email Address</span>
              <input
                type="email"
                className={fieldClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                required
              />
            </label>
            <label className="block">
              <span className={labelClass}>Password</span>
              <input
                type="password"
                className={fieldClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Role</span>
              <select
                className={cn(fieldClass, !role && 'text-slate-400')}
                value={role}
                onChange={(e) => {
                  const next = e.target.value
                  setRole(next)
                  if (isOrgWideRole(next)) {
                    setBranchId(HQ_SENTINEL_BRANCH_ID)
                  } else if (branchId === HQ_SENTINEL_BRANCH_ID) {
                    setBranchId('')
                  }
                }}
                required
              >
                <option value="" disabled>
                  Select value
                </option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r} className="text-[#073D2C]">
                    {formatRoleLabel(r)}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-ui">
                For system-wide access, choose <strong>HR</strong> — Branch becomes All Branches.
              </p>
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Branch</span>
              <select
                className={cn(
                  fieldClass,
                  !branchId && !isOrgWideRole(role) && 'text-slate-400',
                )}
                value={isOrgWideRole(role) ? HQ_SENTINEL_BRANCH_ID : branchId}
                onChange={(e) => {
                  const next = e.target.value
                  setBranchId(next)
                  if (next === HQ_SENTINEL_BRANCH_ID && !isOrgWideRole(role)) {
                    setRole('HR')
                  }
                }}
              >
                <option value="">Select clinic branch</option>
                <option value={HQ_SENTINEL_BRANCH_ID} className="text-[#073D2C]">
                  All Branches (organization) — HR system-wide
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="text-[#073D2C]">
                    {b.code} — {b.name}
                    {b.branchType === 'franchise' ? ' (Franchise)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/team/user-access')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add User'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
