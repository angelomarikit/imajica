import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSpreadsheet, Pencil, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { exportXlsx } from '@/services/analyticsService'
import { getBranches } from '@/services/branchService'
import {
  deleteBranchAccount,
  listBranchAccounts,
  saveAccessUser,
  saveEmployeeCode,
  setAccessUserActive,
  subscribeAccessUsers,
} from '@/services/userAccessService'
import type { AccessUser } from '@/types'
import { cn } from '@/utils/cn'
import { formatRoleLabel } from '@/utils/roleLabels'

/** All system roles (HQ may reassign any account role from this page) */
const ROLE_OPTIONS = [
  'SUPER_ADMIN',
  'HQ_ADMIN',
  'HR',
  'MARKETING',
  'BRANCH_ADMIN',
  'DOCTOR',
  'NURSE',
  'AESTHETICIAN',
  'RECEPTIONIST',
  'STAFF',
  'CLIENT',
] as const

/** Org-wide roles use HQ sentinel — HR / Marketing = All Branches across clinics */
const ORG_ROLES = new Set<string>(['SUPER_ADMIN', 'HQ_ADMIN', 'HR', 'MARKETING', 'CLIENT'])

export function BranchAccountsPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<AccessUser[]>([])
  const [loading, setLoading] = useState(true)
  const [branches] = useState(() => getBranches().filter((b) => b.branchType !== 'warehouse'))
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AccessUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AccessUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function refresh() {
    try {
      setUsers(await listBranchAccounts())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load branch accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    return subscribeAccessUsers(() => {
      void refresh()
    })
  }, [])

  const branchAccounts = users

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return branchAccounts.filter((u) => {
      if (branchFilter !== 'all' && u.branchId !== branchFilter) return false
      if (!q) return true
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.branchName ?? '').toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        formatRoleLabel(u.role).toLowerCase().includes(q) ||
        (u.employeeCode ?? '').includes(q)
      )
    })
  }, [branchAccounts, query, branchFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handleExport() {
    void exportXlsx(
      'imajica-branch-accounts.xlsx',
      ['Full Name', 'Email', 'Employee #', 'Role', 'Branch', 'Status'],
      filtered.map((u) => [
        u.fullName,
        u.email,
        u.employeeCode || '',
        formatRoleLabel(u.role),
        u.branchName || '',
        u.status,
      ]),
    )
      .then(() => toast.success('Exported branch accounts'))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Export failed'),
      )
  }

  function toggleActive(u: AccessUser) {
    const next = u.status !== 'active'
    void setAccessUserActive(u.id, next)
      .then(() => {
        toast.success(`${u.fullName} ${next ? 'activated' : 'deactivated'}`)
        return refresh()
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Update failed'))
  }

  function saveEdit() {
    if (!editing) return
    if (!editing.fullName.trim() || !editing.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    const isOrgRole = ORG_ROLES.has(editing.role)
    if (!isOrgRole && !editing.branchId) {
      toast.error('Clinic staff roles must be tagged to a branch')
      return
    }
    const branch = branches.find((b) => b.id === editing.branchId)
    void saveAccessUser({
      ...editing,
      branchId: isOrgRole ? null : editing.branchId,
      branchName: isOrgRole ? null : (branch?.name ?? editing.branchName),
    })
      .then(() => {
        toast.success('Branch account updated')
        setEditing(null)
        return refresh()
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Save failed'))
  }

  function saveEmployeeNumber(u: AccessUser, code: string) {
    void saveEmployeeCode(u.id, code)
      .then(() => {
        toast.success(
          code.trim()
            ? `Employee # saved for ${u.fullName}`
            : `Employee # cleared for ${u.fullName}`,
        )
        return refresh()
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Save failed'))
  }

  function saveRoleOnly(u: AccessUser, role: string) {
    const isOrgRole = ORG_ROLES.has(role)
    if (!isOrgRole && !u.branchId) {
      toast.error('Clinic staff roles must be tagged to a branch')
      return
    }
    void saveAccessUser({
      ...u,
      role,
      branchId: isOrgRole ? null : u.branchId,
      branchName: isOrgRole ? null : u.branchName,
    })
      .then(() => {
        toast.success(`Role updated to ${role}`)
        return refresh()
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Save failed'))
  }

  async function confirmDeleteAccount() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteBranchAccount(deleteTarget.id)
      toast.success(`Deleted ${deleteTarget.fullName}`)
      setDeleteTarget(null)
      if (editing?.id === deleteTarget.id) setEditing(null)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Branches Accounts"
        description="Create login accounts for clinic and franchise branches, then tag each account to a branch in the directory."
        stat={{ value: branchAccounts.length, label: 'Branch Accounts' }}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">Branch Account Directory</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={handleExport} className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button type="button" onClick={() => navigate('/admin/team/branches/accounts/new')}>
              Add Branch Account
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
              Show Entries
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="mt-1 block h-10 rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
              Branch
              <select
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value)
                  setPage(1)
                }}
                className="mt-1 block h-10 min-w-[180px] rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.branchType === 'franchise' ? ' (Franchise)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex min-w-[240px] flex-1 items-end gap-2 sm:max-w-md">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
              <input
                className="h-10 w-full rounded-[10px] border border-border bg-white pl-9 pr-3 text-sm"
                placeholder="Search name, email, branch…"
                value={queryDraft}
                onChange={(e) => setQueryDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setQuery(queryDraft.trim())
                    setPage(1)
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setQuery(queryDraft.trim())
                setPage(1)
              }}
            >
              Search
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Full Name</th>
                <th className="px-2 py-3">Email</th>
                <th className="px-2 py-3">Employee #</th>
                <th className="px-2 py-3">Role</th>
                <th className="px-2 py-3">Branch</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-2 py-10 text-center text-slate-ui">
                    Loading branch accounts…
                  </td>
                </tr>
              ) : null}
              {!loading &&
                pageRows.map((u) => {
                const branch = branches.find((b) => b.id === u.branchId)
                return (
                  <tr key={u.id} className="border-t border-border/70 hover:bg-ivory-100">
                    <td className="px-2 py-3 font-medium text-[#073D2C]">{u.fullName}</td>
                    <td className="px-2 py-3 text-slate-ui">{u.email}</td>
                    <td className="px-2 py-3">
                      <EmployeeCodeSaveControl user={u} onSave={saveEmployeeNumber} />
                    </td>
                    <td className="px-2 py-3">
                      <RoleSaveControl user={u} onSave={saveRoleOnly} />
                    </td>
                    <td className="px-2 py-3">
                      <span className="font-medium text-[#073D2C]">{u.branchName ?? '—'}</span>
                      {branch?.branchType === 'franchise' ? (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#C5A059]">
                          Franchise
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(u)}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-semibold',
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing({ ...u })}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#E8D9B8] text-[#073D2C]"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(u)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          aria-label={`Delete ${u.fullName}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {pageRows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-2 py-10 text-center text-slate-ui">
                    No branch accounts yet. Create one and tag it to a branch from the directory.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-ui">
          <p>
            Showing page {Math.min(page, pageCount)} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit Branch Account"
      >
        {editing ? (
          <div className="space-y-3 p-1">
            <Input
              label="Full name"
              value={editing.fullName}
              onChange={(e) => setEditing({ ...editing, fullName: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={editing.email}
              onChange={(e) => setEditing({ ...editing, email: e.target.value })}
            />
            <label className="block text-sm">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-ui">
                Role
              </span>
              <select
                className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm"
                value={editing.role}
                onChange={(e) => {
                  const role = e.target.value
                  const isOrgRole = ORG_ROLES.has(role)
                  setEditing({
                    ...editing,
                    role,
                    ...(isOrgRole ? { branchId: null, branchName: null } : {}),
                  })
                }}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {formatRoleLabel(r)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-ui">
                Branch
              </span>
              <select
                className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm disabled:bg-slate-50"
                value={editing.branchId ?? ''}
                disabled={ORG_ROLES.has(editing.role)}
                onChange={(e) => {
                  const b = branches.find((x) => x.id === e.target.value)
                  setEditing({
                    ...editing,
                    branchId: e.target.value || null,
                    branchName: b?.name ?? null,
                  })
                }}
              >
                <option value="">
                  {ORG_ROLES.has(editing.role)
                    ? editing.role === 'HR' || editing.role === 'MARKETING'
                      ? 'All Branches (organization)'
                      : 'No Branch (HQ / org role)'
                    : 'Select branch'}
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.branchType === 'franchise' ? ' (Franchise)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setDeleteTarget(editing)
                  setEditing(null)
                }}
              >
                Delete account
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={saveEdit}>
                Save
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        title="Delete branch account?"
        description={
          deleteTarget
            ? `Permanently delete ${deleteTarget.fullName} (${deleteTarget.email}). They will no longer be able to sign in. This cannot be undone.`
            : undefined
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete account'}
        destructive
        onConfirm={() => {
          if (!deleting) void confirmDeleteAccount()
        }}
      />
    </div>
  )
}

function RoleSaveControl({
  user,
  onSave,
}: {
  user: AccessUser
  onSave: (u: AccessUser, role: string) => void
}) {
  const [role, setRole] = useState(user.role)
  const dirty = role !== user.role

  useEffect(() => {
    setRole(user.role)
  }, [user.id, user.role])

  return (
    <div className="flex min-w-[160px] max-w-[220px] items-center gap-1.5 sm:min-w-[200px] sm:gap-2">
      <select
        className="h-9 min-w-0 flex-1 rounded-[8px] border border-border bg-white px-1.5 text-[10px] font-medium text-[#073D2C] sm:px-2 sm:text-xs"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        aria-label={`Role for ${user.fullName}`}
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {formatRoleLabel(r)}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        disabled={!dirty}
        onClick={() => onSave(user, role)}
        className="h-9 shrink-0 px-2.5 text-xs"
      >
        Save
      </Button>
    </div>
  )
}

function EmployeeCodeSaveControl({
  user,
  onSave,
}: {
  user: AccessUser
  onSave: (u: AccessUser, code: string) => void
}) {
  const saved = user.employeeCode ?? ''
  const [code, setCode] = useState(saved)
  const dirty = code.replace(/\D/g, '') !== saved.replace(/\D/g, '')

  useEffect(() => {
    setCode(user.employeeCode ?? '')
  }, [user.id, user.employeeCode])

  return (
    <div className="flex min-w-[140px] max-w-[180px] items-center gap-1.5">
      <input
        type="text"
        inputMode="numeric"
        maxLength={3}
        placeholder="e.g. 023"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
        aria-label={`Employee number for ${user.fullName}`}
        className="h-9 w-[4.5rem] rounded-[8px] border border-border bg-white px-2 text-center font-mono text-sm font-semibold text-[#073D2C] tabular-nums"
      />
      <Button
        type="button"
        size="sm"
        disabled={!dirty}
        onClick={() => onSave(user, code)}
        className="h-9 shrink-0 px-2.5 text-xs"
      >
        Save
      </Button>
    </div>
  )
}
