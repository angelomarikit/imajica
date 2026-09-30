import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getBranches } from '@/services/branchService'
import {
  deleteService,
  getServices,
  isServiceLiveAtBranch,
  serviceBranchLabel,
  subscribeCatalog,
  toggleServiceLiveForBranch,
} from '@/services/catalogService'
import type { Treatment } from '@/types'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'
import { useAuth } from '@/contexts/AuthContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { isFranchiseBranchOwner } from '@/utils/franchiseAccess'

function serviceMatchesBranch(s: Treatment, branchId: string): boolean {
  if (branchId === 'all') return true
  if (s.availableGlobally) return true
  if (s.availableBranchIds?.includes(branchId)) return true
  return s.branchId === branchId
}

export function ServiceListPage() {
  const { user } = useAuth()
  const franchiseOwner = isFranchiseBranchOwner(user)
  const forcedBranchId = useForcedBranchId()
  const [services, setServices] = useState<Treatment[]>(() => getServices())
  const branches = useMemo(() => getBranches(), [services])
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [sessionFilter, setSessionFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState(forcedBranchId ?? 'all')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => subscribeCatalog(() => setServices(getServices())), [])

  useEffect(() => {
    if (forcedBranchId) setBranchFilter(forcedBranchId)
  }, [forcedBranchId])

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (sessionFilter !== 'all' && String(s.sessions ?? 1) !== sessionFilter) return false
      // Franchise owners see full catalog so they can toggle live for their branch
      if (!franchiseOwner && !serviceMatchesBranch(s, branchFilter)) return false
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [services, sessionFilter, branchFilter, search, franchiseOwner])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const pageRows = filtered.slice(start, start + pageSize)

  const sessionOptions = useMemo(() => {
    const set = new Set(services.map((s) => s.sessions ?? 1))
    return Array.from(set).sort((a, b) => a - b)
  }, [services])

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(pageRows.map((r) => r.id)))
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Remove service “${name}”?`)) return
    deleteService(id)
    toast.message('Service removed')
  }

  function exportCsv() {
    const header = ['Service Name', 'Sessions', 'Branch', 'Status', 'Service Cost']
    const lines = filtered.map((s) =>
      [
        s.name,
        String(s.sessions ?? 1),
        serviceBranchLabel(s),
        s.status,
        String(s.price),
      ]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'imajica-services.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported Excel-compatible CSV')
  }

  const pageNumbers = useMemo(() => {
    const max = totalPages
    if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1)
    const set = new Set([1, 2, 3, 4, 5, max, safePage, safePage - 1, safePage + 1].filter(
      (n) => n >= 1 && n <= max,
    ))
    return Array.from(set).sort((a, b) => a - b)
  }, [totalPages, safePage])

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Imajica Service Catalog"
        description="Elevating beauty and confidence. Manage and view clinic service portfolios, price structures, and active branch availabilities dynamically across the brand network."
        stat={{ value: services.length, label: 'Total Services' }}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl text-[#073D2C]">Service List</h2>
          <div className="flex flex-wrap gap-2">
            {!franchiseOwner ? (
              <>
                <Button variant="secondary" onClick={exportCsv}>
                  <FileSpreadsheet className="h-4 w-4" /> Export Excel
                </Button>
                <Link to="/admin/catalog/services/new">
                  <Button>
                    <Plus className="h-4 w-4" /> Add Service
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-sm text-slate-ui">
                Toggle services live for {user?.branchName ?? 'your branch'} only.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm"
            value={sessionFilter}
            onChange={(e) => {
              setSessionFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">All Sessions</option>
            {sessionOptions.map((n) => (
              <option key={n} value={String(n)}>
                {n} Session{n === 1 ? '' : 's'}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm"
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value)
              setPage(1)
            }}
            disabled={Boolean(forcedBranchId)}
          >
            {!forcedBranchId ? <option value="all">All Branches</option> : null}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name.replace(/ Branch$/, '')}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n} entries
              </option>
            ))}
          </select>
          <div className="ml-auto flex min-w-[240px] flex-1 items-center gap-2 sm:max-w-md">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
              <input
                className="h-10 w-full rounded-[10px] border border-border bg-white pl-9 pr-3 text-sm"
                placeholder="Search service name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearch(query)
                    setPage(1)
                  }
                }}
              />
            </div>
            <Button
              onClick={() => {
                setSearch(query)
                setPage(1)
              }}
            >
              Search
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th className="px-2 py-3">Service Name</th>
                <th className="px-2 py-3">Sessions</th>
                <th className="px-2 py-3">Branch Name</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Service Cost</th>
                <th className="px-2 py-3">{franchiseOwner ? 'Live at Branch' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((s) => {
                const live =
                  forcedBranchId != null ? isServiceLiveAtBranch(s, forcedBranchId) : false
                return (
                  <tr key={s.id} className="border-t border-border/70 hover:bg-ivory-100">
                    <td className="px-2 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={(e) => toggleOne(s.id, e.target.checked)}
                      />
                    </td>
                    <td className="px-2 py-3 font-medium text-[#073D2C]">{s.name}</td>
                    <td className="px-2 py-3">{s.sessions ?? 1}</td>
                    <td className="px-2 py-3 text-slate-ui">{serviceBranchLabel(s)}</td>
                    <td className="px-2 py-3">
                      <Badge variant={s.status === 'active' ? 'gold' : 'neutral'}>
                        {s.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 font-medium">{formatPeso(s.price)}</td>
                    <td className="px-2 py-3">
                      {franchiseOwner && forcedBranchId ? (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={live}
                          onClick={() => {
                            toggleServiceLiveForBranch(s.id, forcedBranchId, !live)
                            toast.success(
                              !live
                                ? `${s.name} is now live at your branch`
                                : `${s.name} turned off for your branch`,
                            )
                          }}
                          className={cn(
                            'relative h-7 w-12 rounded-full transition',
                            live ? 'bg-emerald-700' : 'bg-slate-300',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
                              live ? 'left-5' : 'left-0.5',
                            )}
                          />
                        </button>
                      ) : (
                        <div className="flex gap-1.5">
                          <Link
                            to={`/admin/catalog/services/new?edit=${s.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#E8D9B8] text-[#073D2C]"
                            aria-label="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id, s.name)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-red-100 text-red-700"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-10 text-center text-slate-ui">
                    No services found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-ui">
          <p>
            Showing {filtered.length === 0 ? 0 : start + 1} to{' '}
            {Math.min(start + pageSize, filtered.length)} of {filtered.length} entries.
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <PagerBtn disabled={safePage <= 1} onClick={() => setPage(1)} ariaLabel="First">
              <ChevronsLeft className="h-4 w-4" />
            </PagerBtn>
            <PagerBtn
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              ariaLabel="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </PagerBtn>
            {pageNumbers.map((n, i) => {
              const prev = pageNumbers[i - 1]
              const gap = prev != null && n - prev > 1
              return (
                <span key={n} className="contents">
                  {gap ? <span className="px-1">…</span> : null}
                  <button
                    type="button"
                    onClick={() => setPage(n)}
                    className={cn(
                      'inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] px-2 text-sm font-semibold',
                      n === safePage
                        ? 'bg-[#073D2C] text-white'
                        : 'border border-border bg-white text-[#073D2C] hover:bg-ivory-100',
                    )}
                  >
                    {n}
                  </button>
                </span>
              )
            })}
            <PagerBtn
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              ariaLabel="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </PagerBtn>
            <PagerBtn
              disabled={safePage >= totalPages}
              onClick={() => setPage(totalPages)}
              ariaLabel="Last"
            >
              <ChevronsRight className="h-4 w-4" />
            </PagerBtn>
          </div>
        </div>
      </Card>
    </div>
  )
}

function PagerBtn({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-border bg-white text-[#073D2C] disabled:opacity-40"
    >
      {children}
    </button>
  )
}
