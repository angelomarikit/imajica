import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { exportCsv } from '@/services/analyticsService'
import {
  DEPARTMENTS,
  createPosition,
  deletePosition,
  getPositions,
  savePosition,
  subscribePositions,
} from '@/services/staffPositionsService'
import type { StaffPosition } from '@/types'
import { cn } from '@/utils/cn'

export function StaffPositionsPage() {
  const [positions, setPositions] = useState(() => getPositions())
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<StaffPosition | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0])
  const [description, setDescription] = useState('')
  const [defaultCommission, setDefaultCommission] = useState('0')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')

  useEffect(() => subscribePositions(() => setPositions(getPositions())), [])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return positions.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q),
    )
  }, [positions, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  function openAdd() {
    setEditing(null)
    setName('')
    setCode('')
    setDepartment(DEPARTMENTS[0])
    setDescription('')
    setDefaultCommission('0')
    setStatus('active')
    setDrawerOpen(true)
  }

  function openEdit(p: StaffPosition) {
    setEditing(p)
    setName(p.name)
    setCode(p.code)
    setDepartment(p.department)
    setDescription(p.description ?? '')
    setDefaultCommission(String(p.defaultCommissionRate * 100))
    setStatus(p.status)
    setDrawerOpen(true)
  }

  function handleSave() {
    if (!name.trim() || !code.trim()) {
      toast.error('Position title and code are required')
      return
    }
    const rate = Math.max(0, Number(defaultCommission) || 0) / 100
    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      department,
      description: description.trim() || undefined,
      defaultCommissionRate: rate,
      status,
    }
    if (editing) {
      savePosition({ ...editing, ...payload })
      toast.success('Position updated')
    } else {
      createPosition(payload)
      toast.success('Position created')
    }
    setDrawerOpen(false)
  }

  function handleExport() {
    exportCsv(
      'imajica-staff-positions.csv',
      ['Position', 'Department', 'Description', 'Commission %', 'Status'],
      filtered.map((p) => [
        p.name,
        p.department,
        p.description || 'N/A',
        String(p.defaultCommissionRate * 100),
        p.status,
      ]),
    )
    toast.success('Exported positions')
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title={<span className="text-[#C5A059]">Staff Positions &amp; Departments</span>}
        description="Configure and manage job roles, permission groups, and staff departments across clinic locations."
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-[#073D2C]">Position Directory</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={handleExport} className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button type="button" onClick={openAdd} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add New Position
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
            Show Entries
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="ml-2 rounded-[8px] border border-border bg-white px-2 py-2 text-sm font-normal normal-case"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n} entries
                </option>
              ))}
            </select>
          </label>
          <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-sm">
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
              placeholder="Search Position"
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

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Position Title</th>
                <th className="px-2 py-3">Department</th>
                <th className="px-2 py-3">Description</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => (
                <tr key={p.id} className="border-t border-border/70 hover:bg-ivory-100">
                  <td className="px-2 py-3 font-semibold text-[#073D2C]">{p.name}</td>
                  <td className="px-2 py-3">{p.department}</td>
                  <td className="px-2 py-3 text-slate-ui">{p.description || 'N/A'}</td>
                  <td className="px-2 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        p.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {p.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label="Edit"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-orange-50 text-orange-700 hover:bg-orange-100"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-red-50 text-red-700 hover:bg-red-100"
                        onClick={() => {
                          deletePosition(p.id)
                          toast.success('Position removed')
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-slate-ui">
                    No positions found.
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
            {Array.from({ length: pageCount }, (_, i) => i + 1)
              .slice(0, 5)
              .map((n) => (
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

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? 'Edit Position' : 'Add New Position'}
      >
        <div className="space-y-3">
          <Input label="Position Title" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} />
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-ui">Department</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
          <Input
            label="Default Commission %"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={defaultCommission}
            onChange={(e) => setDefaultCommission(e.target.value)}
          />
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-ui">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              className="w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <div className="flex gap-2 pt-2">
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  )
}
