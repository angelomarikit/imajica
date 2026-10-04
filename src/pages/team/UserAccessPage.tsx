import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSpreadsheet, Pencil, Search } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { exportCsv } from '@/services/analyticsService'
import {
  listAccessUsers,
  saveAccessUser,
  setAccessUserActive,
  subscribeAccessUsers,
} from '@/services/userAccessService'
import { getBranches } from '@/services/branchService'
import type { AccessUser } from '@/types'
import { cn } from '@/utils/cn'
import { formatRoleLabel } from '@/utils/roleLabels'

const ROLE_OPTIONS = [
  'SUPER_ADMIN',
  'HQ_ADMIN',
  'BRANCH_ADMIN',
  'DOCTOR',
  'NURSE',
  'AESTHETICIAN',
  'RECEPTIONIST',
  'STAFF',
] as const

export function UserAccessPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<AccessUser[]>([])
  const branches = useMemo(() => getBranches(), [])
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AccessUser | null>(null)

  async function refresh() {
    try {
      setUsers(await listAccessUsers())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users')
    }
  }

  useEffect(() => {
    void refresh()
    return subscribeAccessUsers(() => {
      void refresh()
    })
  }, [])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return users.filter(
      (u) =>
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.branchName ?? '').toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        formatRoleLabel(u.role).toLowerCase().includes(q),
    )
  }, [users, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handleExport() {
    exportCsv(
      'imajica-user-accounts.csv',
      ['Full Name', 'Email', 'Role', 'Branch', 'Status'],
      filtered.map((u) => [
        u.fullName,
        u.email,
        formatRoleLabel(u.role),
        u.branchName || 'No Branch',
        u.status,
      ]),
    )
    toast.success('Exported user directory')
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
    const branch = branches.find((b) => b.id === editing.branchId)
    void saveAccessUser({
      ...editing,
      branchName: editing.branchId ? branch?.name ?? editing.branchName : null,
    })
      .then(() => {
        toast.success('User updated')
        setEditing(null)
        return refresh()
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Save failed'))
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="User Accounts Directory"
        description="Manage login credentials, user access levels, branch permissions, and account status."
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">User Directory</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={handleExport} className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button type="button" onClick={() => navigate('/admin/team/user-access/new')}>
              Add New User
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
            Show Entries
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="mt-1 block rounded-[8px] border border-border bg-white px-2 py-2 text-sm font-normal normal-case text-[#073D2C]"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n} entries
                </option>
              ))}
            </select>
          </label>

          <div className="w-full sm:w-auto">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
              Search User
            </p>
            <div className="flex gap-2">
              <div className="relative min-w-[220px] flex-1 sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
                <input
                  value={queryDraft}
                  onChange={(e) => setQueryDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setQuery(queryDraft.trim())
                      setPage(1)
                    }
                  }}
                  placeholder="Search user name..."
                  className="w-full rounded-[10px] border border-border bg-white py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <Button
                type="button"
                onClick={() => {
                  setQuery(queryDraft.trim())
                  setPage(1)
                }}
              >
                Search
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Full Name</th>
                <th className="px-2 py-3">Email Address</th>
                <th className="px-2 py-3">Branch</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((u) => (
                <tr key={u.id} className="border-t border-border/70 hover:bg-ivory-100">
                  <td className="px-2 py-3 font-medium text-[#0a0a0a]">{u.fullName}</td>
                  <td className="px-2 py-3 text-slate-ui">{u.email}</td>
                  <td className="px-2 py-3">
                    <span className="font-medium text-emerald-700">
                      {u.branchName || 'No Branch'}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-red-50 text-red-700',
                      )}
                    >
                      {u.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Edit user"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                        onClick={() => setEditing({ ...u })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={u.status === 'active'}
                        aria-label={`Toggle ${u.fullName} active`}
                        onClick={() => toggleActive(u)}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition-colors',
                          u.status === 'active' ? 'bg-emerald-600' : 'bg-slate-300',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                            u.status === 'active' ? 'left-5' : 'left-0.5',
                          )}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-slate-ui">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-ui">
          <span>
            Showing {(page - 1) * pageSize + (pageRows.length ? 1 : 0)} to{' '}
            {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 min-w-8 rounded-[6px] border border-border px-2 disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={cn(
                  'h-8 min-w-8 rounded-[6px] border px-2 font-medium',
                  n === page
                    ? 'border-emerald-900 bg-emerald-900 text-white'
                    : 'border-border bg-white',
                )}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 min-w-8 rounded-[6px] border border-border px-2 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </Card>

      <Drawer open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit User">
        {editing ? (
          <div className="space-y-3">
            <Input
              label="Full Name"
              value={editing.fullName}
              onChange={(e) => setEditing({ ...editing, fullName: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              value={editing.email}
              onChange={(e) => setEditing({ ...editing, email: e.target.value })}
            />
            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-ui">Role</span>
              <select
                value={editing.role}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                className="w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {formatRoleLabel(r)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-ui">Branch</span>
              <select
                value={editing.branchId ?? ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    branchId: e.target.value || null,
                    branchName: e.target.value
                      ? branches.find((b) => b.id === e.target.value)?.name ?? null
                      : null,
                  })
                }
                className="w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
              >
                <option value="">No Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2 pt-2">
              <Button type="button" onClick={saveEdit}>
                Save
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}
