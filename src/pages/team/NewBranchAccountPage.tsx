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

const BRANCH_ROLE_OPTIONS = [
  'HR',
  'MARKETING',
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

export function NewBranchAccountPage() {
  const navigate = useNavigate()
  const branches = useMemo(
    () => getBranches().filter((b) => b.status === 'active' && b.branchType !== 'warehouse'),
    [],
  )

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>('BRANCH_ADMIN')
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
    const orgWide = isOrgWideRole(role)
    if (!orgWide && !branchId) {
      toast.error('Select a branch from the directory')
      return
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    const branch = branches.find((b) => b.id === branchId)
    if (!orgWide && !branch) {
      toast.error('Selected branch was not found')
      return
    }

    setSaving(true)
    try {
      await createAccessUser({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        branchId: orgWide ? HQ_SENTINEL_BRANCH_ID : branch!.id,
        branchName: orgWide ? 'All Branches (organization)' : branch!.name,
        status: 'active',
      })
      toast.success(
        isSupabaseConfigured
          ? 'Account created — they can sign in with this email and password'
          : 'Saved locally only (Supabase not configured in .env)',
      )
      navigate('/admin/team/branches/accounts')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title={<span className="text-[#C5A059]">Create Branch Account</span>}
        description="Register the account in the app. Auth + profile + branch role are created together via the Edge Function."
        actions={
          <Link to="/admin/team/branches/accounts">
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
        <div className="mb-6 space-y-2">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">Branch Account Credentials</h2>
          <p className="text-sm text-slate-ui">
            You create accounts <strong>here in the web app</strong> — not in the Supabase Authentication
            UI. Under the hood the app calls the <code className="text-xs">create-branch-account</code>{' '}
            Edge Function, which safely uses the service role on the server.
          </p>
          {!isSupabaseConfigured ? (
            <p className="rounded-[10px] bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Add <code className="text-xs">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to <code className="text-xs">.env</code>,
              apply migration 30, deploy the Edge Function, then sign in as HQ admin.
            </p>
          ) : (
            <p className="rounded-[10px] bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Requirements: migration <code className="text-xs">20260929000030</code> applied, Edge Function
              deployed, and you signed in with a real HQ Auth user (not offline demo).
            </p>
          )}
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
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
                placeholder="Password (min 6 characters)"
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
                  // HR is org-wide — lock branch to All Branches
                  if (isOrgWideRole(next)) {
                    setBranchId(HQ_SENTINEL_BRANCH_ID)
                  } else if (branchId === HQ_SENTINEL_BRANCH_ID) {
                    setBranchId('')
                  }
                }}
                required
              >
                {BRANCH_ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r} className="text-[#073D2C]">
                    {formatRoleLabel(r)}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-ui">
                For system-wide access, choose <strong>HR</strong> or <strong>Marketing</strong> —
                Branch becomes All Branches.
              </p>
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>
                Branch <span className="text-red-500">*</span>
              </span>
              <select
                className={cn(
                  fieldClass,
                  !branchId && !isOrgWideRole(role) && 'text-slate-400',
                )}
                value={isOrgWideRole(role) ? HQ_SENTINEL_BRANCH_ID : branchId}
                onChange={(e) => {
                  const next = e.target.value
                  setBranchId(next)
                  // Picking All Branches implies an org-wide role (default HR if clinic role)
                  if (next === HQ_SENTINEL_BRANCH_ID && !isOrgWideRole(role)) {
                    setRole('HR')
                  }
                }}
                required
              >
                <option value="" disabled>
                  Select branch from directory
                </option>
                <option value={HQ_SENTINEL_BRANCH_ID} className="text-[#073D2C]">
                  All Branches (organization) — HR / Marketing
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="text-[#073D2C]">
                    {b.code} — {b.name}
                    {b.branchType === 'franchise' ? ' (Franchise)' : ''}
                  </option>
                ))}
              </select>
              {isOrgWideRole(role) || branchId === HQ_SENTINEL_BRANCH_ID ? (
                <p className="mt-1.5 text-xs text-emerald-800">
                  This account can see data across every clinic (not tied to one branch).
                </p>
              ) : null}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/admin/team/branches/accounts')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create Account'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
