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
  BRANCH_TYPES,
  getBranches,
  saveBranch,
  setBranchActive,
  subscribeBranches,
} from '@/services/branchService'
import type { Branch } from '@/types'
import { cn } from '@/utils/cn'

export function TeamBranchesPage() {
  const navigate = useNavigate()
  const [branches, setBranches] = useState(() => getBranches())
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Branch | null>(null)

  useEffect(() => subscribeBranches(() => setBranches(getBranches())), [])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return branches.filter(
      (b) =>
        !q ||
        b.code.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q),
    )
  }, [branches, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handleExport() {
    exportCsv(
      'imajica-branch-directory.csv',
      ['Branch Code', 'Branch Name', 'Type', 'Address', 'Status'],
      filtered.map((b) => [
        b.code,
        b.name,
        b.branchType ?? 'company_owned',
        b.address,
        b.status,
      ]),
    )
    toast.success('Exported branch directory')
  }

  function toggleActive(b: Branch) {
    const next = b.status !== 'active'
    setBranchActive(b.id, next)
    toast.success(`${b.name} ${next ? 'activated' : 'deactivated'} (demo)`)
  }

  function saveEdit() {
    if (!editing) return
    if (!editing.code.trim() || !editing.name.trim()) {
      toast.error('Code and name are required')
      return
    }
    saveBranch(editing)
    toast.success('Branch updated (demo)')
    setEditing(null)
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Branch Directory"
        description="Manage clinic branch locations, addresses, and download details."
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">Branch Directory</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={handleExport} className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button type="button" onClick={() => navigate('/admin/team/branches/new')}>
              Add New Branch
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
              Search Branch
            </p>
            <div className="flex gap-2">
              <div className="relative min-w-[220px] flex-1 sm:w-80">
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
                  placeholder="Search branch code or name..."
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
                <th className="px-2 py-3">Branch Code</th>
                <th className="px-2 py-3">Branch Name</th>
                <th className="px-2 py-3">Address</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((b) => (
                <tr key={b.id} className="border-t border-border/70 hover:bg-ivory-100">
                  <td className="px-2 py-3 font-medium text-[#0a0a0a]">{b.code}</td>
                  <td className="px-2 py-3 text-[#0a0a0a]">{b.name}</td>
                  <td className="max-w-md px-2 py-3 text-slate-ui">{b.address}</td>
                  <td className="px-2 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        b.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-red-50 text-red-700',
                      )}
                    >
                      {b.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Edit branch"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                        onClick={() => setEditing({ ...b })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={b.status === 'active'}
                        aria-label={`Toggle ${b.name} active`}
                        onClick={() => toggleActive(b)}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition-colors',
                          b.status === 'active' ? 'bg-emerald-600' : 'bg-slate-300',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                            b.status === 'active' ? 'left-5' : 'left-0.5',
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
                    No branches found.
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

      <Drawer open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit Branch">
        {editing ? (
          <div className="space-y-3">
            <Input
              label="Branch Code"
              value={editing.code}
              onChange={(e) => setEditing({ ...editing, code: e.target.value })}
            />
            <Input
              label="Branch Name"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-ui">Branch Type</span>
              <select
                value={editing.branchType ?? 'company_owned'}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    branchType: e.target.value as Branch['branchType'],
                  })
                }
                className="w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
              >
                {BRANCH_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-ui">Address</span>
              <textarea
                value={editing.address}
                onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                className="mt-1.5 min-h-[90px] w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
              />
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
