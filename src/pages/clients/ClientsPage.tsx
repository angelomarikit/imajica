import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { normalizeClientName } from '@/constants/clientProfileSeed'
import {
  compareClientsByRecentAvail,
  applyKnownClientProfiles,
  deleteClient,
  getClients,
  preloadClientsFromSupabase,
  subscribeClients,
} from '@/services/clientService'
import {
  applyCustomerMigrationImport,
  parseMigrationCustomerSheet,
  planCustomerMigrationImport,
  type MigrationImportSummary,
} from '@/services/customerMigrationImportService'
import { recomputeClientSalesProfile } from '@/services/clientSalesProfileService'
import {
  ensureBranchRemoteSales,
  getSales,
  isSalesDataLoaded,
  preloadSalesData,
  syncClientsFromSalesRegistry,
} from '@/services/salesService'
import { subscribeAnalytics } from '@/services/analyticsService'
import type { Client } from '@/types'
import { cn } from '@/utils/cn'
import { useEffectiveBranchId, useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { resolveClinicBranchId } from '@/services/branchService'
import { isBranchOwner, isHqRole } from '@/utils/franchiseAccess'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || '—'
}

function genderLabel(g: Client['gender']) {
  if (g === 'female') return 'Female'
  if (g === 'male') return 'Male'
  return '—'
}

const PAGE_SIZE = 6

function paginationItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 12) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  if (current <= 10) {
    return [...Array.from({ length: 10 }, (_, i) => i + 1), 'ellipsis', total - 1, total]
  }
  if (current >= total - 9) {
    return [1, 2, 'ellipsis', ...Array.from({ length: 10 }, (_, i) => total - 9 + i)]
  }
  return [1, 2, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total - 1, total]
}

export function ClientsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<Client[]>(() => getClients())
  const [loading, setLoading] = useState(() => getClients().length === 0)
  const [page, setPage] = useState(1)
  const [importing, setImporting] = useState(false)
  const [importPlan, setImportPlan] = useState<MigrationImportSummary | null>(null)
  const [salesTick, setSalesTick] = useState(0)
  const [salesReady, setSalesReady] = useState(() => isSalesDataLoaded())
  const importFileRef = useRef<HTMLInputElement>(null)
  const pendingImportRows = useRef<ReturnType<typeof parseMigrationCustomerSheet> | null>(null)
  const forcedBranchId = useForcedBranchId()
  const effectiveBranchId = useEffectiveBranchId()
  const branchScoped = isBranchOwner(user) || Boolean(forcedBranchId)
  const hqView = isHqRole(user?.role)

  useEffect(() => {
    const refresh = () => {
      setClients(getClients())
      setLoading(false)
      setSalesReady(isSalesDataLoaded())
      setSalesTick((n) => n + 1)
    }
    setLoading(true)
    applyKnownClientProfiles()
    // 1) Supabase registry first (migrated profiles)
    // 2) Branch sales first (fast Sessions counts), then full org sales
    void (async () => {
      try {
        await preloadClientsFromSupabase()
        refresh()
        const branchForSales =
          forcedBranchId ||
          (!hqView ? resolveClinicBranchId(user?.branchId) || user?.branchId : undefined) ||
          (hqView && effectiveBranchId !== 'all'
            ? resolveClinicBranchId(effectiveBranchId) || effectiveBranchId
            : undefined)
        if (branchForSales) {
          await ensureBranchRemoteSales(branchForSales)
          refresh()
        }
        await preloadSalesData()
        syncClientsFromSalesRegistry()
        applyKnownClientProfiles()
      } finally {
        refresh()
      }
    })()
    const unsubClients = subscribeClients(refresh)
    const unsubSales = subscribeAnalytics(refresh)
    return () => {
      unsubClients()
      unsubSales()
    }
  }, [forcedBranchId, effectiveBranchId, hqView, user?.branchId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = clients
    // Clinic managers: locked to their branch. HQ: honor header branch (incl. franchise).
    const filterBranchId =
      forcedBranchId ||
      (hqView && effectiveBranchId !== 'all' ? effectiveBranchId : undefined)
    if (filterBranchId || (!hqView && (branchScoped || forcedBranchId))) {
      const branchId = filterBranchId ?? forcedBranchId ?? user?.branchId
      const branchName = user?.branchName?.toLowerCase()
      const clinicId =
        resolveClinicBranchId(branchId) || resolveClinicBranchId(user?.branchName) || branchId
      const nameToken = branchName?.split(',')[0]?.trim() || ''
      list = list.filter((c) => {
        const clientClinicId =
          resolveClinicBranchId(c.preferredBranchId) ||
          resolveClinicBranchId(c.preferredBranchName) ||
          c.preferredBranchId
        if (clinicId && clientClinicId === clinicId) return true
        if (branchId && c.preferredBranchId === branchId) return true
        if (!hqView && branchName && c.preferredBranchName?.toLowerCase() === branchName) return true
        if (!hqView && nameToken && c.preferredBranchName?.toLowerCase().includes(nameToken))
          return true
        return false
      })
    }
    if (q) {
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.preferredBranchName || '').toLowerCase().includes(q),
      )
    }
    // Always newest → oldest (latest booking/registration first)
    return [...list].sort(compareClientsByRecentAvail)
  }, [
    clients,
    query,
    forcedBranchId,
    effectiveBranchId,
    hqView,
    branchScoped,
    user?.branchId,
    user?.branchName,
  ])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  )
  const pageNumbers = useMemo(() => paginationItems(page, pageCount), [page, pageCount])

  /** Live session totals from sales (not stale client.sessionsCount from before sales finish loading). */
  const sessionsByClient = useMemo(() => {
    void salesTick
    const map = new Map<string, number>()
    const byId = new Map<string, { name: string; rows: ReturnType<typeof getSales> }>()
    for (const s of getSales()) {
      if (!s.clientId) continue
      let bucket = byId.get(s.clientId)
      if (!bucket) {
        bucket = { name: s.clientName, rows: [] }
        byId.set(s.clientId, bucket)
      }
      bucket.rows.push(s)
    }
    for (const [id, { name, rows }] of byId) {
      const n = recomputeClientSalesProfile(id, rows, name).sessionsCount
      map.set(id, n)
      const nameKey = normalizeClientName(name)
      if (nameKey) map.set(`n:${nameKey}`, Math.max(map.get(`n:${nameKey}`) ?? 0, n))
    }
    return map
  }, [salesTick])

  function sessionsLabel(c: Client): string {
    if (!salesReady) return '…'
    const live =
      sessionsByClient.get(c.id) ??
      sessionsByClient.get(`n:${normalizeClientName(c.fullName)}`)
    return String(live ?? c.sessionsCount ?? 0)
  }

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  function applySearch() {
    setQuery(queryDraft.trim())
    setPage(1)
  }

  function handleDelete(c: Client) {
    if (!window.confirm(`Delete customer ${c.fullName}?`)) return
    deleteClient(c.id)
    toast.success('Customer removed')
  }

  async function handleMigrationFile(file: File) {
    setImporting(true)
    setImportPlan(null)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet =
        wb.Sheets.Customers ||
        wb.Sheets.Patients ||
        wb.Sheets[wb.SheetNames[0]!]
      if (!sheet) throw new Error('No Customers/Patients sheet found')
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null })
      const rows = parseMigrationCustomerSheet(raw)
      const plan = planCustomerMigrationImport(rows, getClients())
      pendingImportRows.current = rows
      setImportPlan(plan)
      toast.message(
        `Preview: ${plan.toUpdate} update · ${plan.toInsert} insert · ${plan.skipped} skip (no duplicates)`,
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read migration file')
      pendingImportRows.current = null
    } finally {
      setImporting(false)
    }
  }

  async function confirmMigrationImport() {
    const rows = pendingImportRows.current
    const plan = importPlan
    if (!rows || !plan) return
    const ok = window.confirm(
      `Apply customer migration?\n\n` +
        `Update (fill missing only): ${plan.toUpdate}\n` +
        `Insert (new unique): ${plan.toInsert}\n` +
        `Skip: ${plan.skipped}\n\n` +
        `Existing profile values will NOT be overwritten.`,
    )
    if (!ok) return
    setImporting(true)
    try {
      const result = await applyCustomerMigrationImport(rows, { syncRemote: true })
      setClients(getClients())
      setImportPlan(null)
      pendingImportRows.current = null
      toast.success(
        `Migration done — updated ${result.updated}, inserted ${result.inserted}, skipped ${result.skipped}` +
          (result.syncedRemote ? ` · synced ${result.syncedRemote} to database` : ''),
      )
      if (result.errors.length) {
        toast.error(`${result.errors.length} sync warning(s) — check console`)
        console.warn('[customer migration]', result.errors.slice(0, 20))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Migration failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Customer Registry"
        description={
          hqView
            ? 'Manage customer metadata profile files, search identities, and view detailed consultation history across all branches.'
            : `Customers assigned to ${user?.branchName ?? 'your branch'} only.`
        }
        stat={{ value: filtered.length, label: hqView ? 'Total Customers' : 'Branch Customers' }}
      />

      <Card className="p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#073D2C]">Customer Profile Management</h2>
          <div className="flex flex-wrap gap-2">
            {hqView ? (
              <>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) void handleMigrationFile(file)
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={importing}
                  onClick={() => importFileRef.current?.click()}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {importing ? 'Reading…' : 'Import migration'}
                </Button>
                <a href="/templates/customer_migration_import.xlsx" download>
                  <Button type="button" variant="secondary">
                    Download import template
                  </Button>
                </a>
              </>
            ) : null}
            <Link to="/admin/clients/new">
              <Button>
                <Plus className="h-4 w-4" /> Add Customer
              </Button>
            </Link>
          </div>
        </div>

        {hqView && importPlan ? (
          <div className="mb-5 rounded-[12px] border border-[#C5A059]/40 bg-amber-50/60 px-4 py-3 text-sm text-[#073D2C]">
            <p className="font-semibold">Migration preview (no changes applied yet)</p>
            <p className="mt-1 text-slate-ui">
              {importPlan.totalRows} rows →{' '}
              <span className="font-medium text-[#073D2C]">{importPlan.toUpdate} fill missing</span>
              {' · '}
              <span className="font-medium text-[#073D2C]">{importPlan.toInsert} new</span>
              {' · '}
              {importPlan.skipped} skip
            </p>
            <p className="mt-1 text-xs text-slate-ui">
              Match order: phone → email → unique full name. Existing values are never overwritten.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" disabled={importing} onClick={() => void confirmMigrationImport()}>
                {importing ? 'Applying…' : 'Confirm import'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={importing}
                onClick={() => {
                  setImportPlan(null)
                  pendingImportRows.current = null
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mb-6 flex flex-wrap gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
            <input
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearch()
              }}
              placeholder="Search name, email, contact number..."
              className="h-10 w-full rounded-[10px] border border-border bg-white pl-10 pr-3 text-sm outline-none focus:border-emerald-700"
            />
          </div>
          <Button
            variant="secondary"
            className="bg-[#111] text-white hover:bg-black"
            onClick={applySearch}
          >
            Search
          </Button>
        </div>

        {loading && clients.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-ui">Loading customers from sales…</p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-ui">No customers match your search.</p>
        ) : (
          <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pageRows.map((c) => (
              <article
                key={c.id}
                className="flex flex-col rounded-[14px] border border-border bg-white p-5 shadow-sm"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#073D2C] text-xl font-bold text-white">
                  {initials(c.fullName)}
                </div>
                <h3 className="mt-4 text-center text-sm font-bold uppercase tracking-wide text-[#0f172a]">
                  {c.fullName}
                </h3>
                {c.preferredBranchName?.trim() ? (
                  <p className="mt-1.5 flex justify-center">
                    <span className="inline-flex rounded-full bg-[#073D2C]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#073D2C]">
                      {c.preferredBranchName.replace(/ Branch$/i, '')}
                    </span>
                  </p>
                ) : null}
                <p className="mt-1 text-center text-xs text-slate-ui">
                  {c.email?.trim() && !c.email.toLowerCase().endsWith('@imajica.local')
                    ? c.email
                    : '—'}
                </p>

                <ul className="mt-4 space-y-2.5 text-sm text-slate-ui">
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-[#C5A059]" />
                    <span>{c.phone?.trim() ? c.phone : '—'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <User className="h-4 w-4 shrink-0 text-[#C5A059]" />
                    <span>{genderLabel(c.gender)}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0 text-[#C5A059]" />
                    <span>{c.dateOfBirth?.trim() ? c.dateOfBirth : '—'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[11px] font-bold text-[#C5A059]">
                      #
                    </span>
                    <span>Sessions: {sessionsLabel(c)}</span>
                  </li>
                </ul>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/clients/${c.id}`)}
                    className={cn(
                      'inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-[#C5A059]/50',
                      'bg-white text-sm font-semibold text-[#B45309] hover:bg-amber-50',
                    )}
                  >
                    <Eye className="h-4 w-4" /> View Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-[#F87171] text-sm font-semibold text-white hover:bg-red-500"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </article>
            ))}
          </div>

          {pageCount > 1 ? (
            <nav
              className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
              aria-label="Customer list pagination"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-[#073D2C]',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {pageNumbers.map((item, idx) =>
                item === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="inline-flex h-9 w-9 items-center justify-center text-slate-ui"
                    aria-hidden
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={cn(
                      'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-medium',
                      page === item
                        ? 'border-[#111] bg-[#111] text-white'
                        : 'border-border bg-white text-[#073D2C] hover:bg-ivory-100',
                    )}
                    aria-current={page === item ? 'page' : undefined}
                  >
                    {item}
                  </button>
                ),
              )}

              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-[#073D2C]',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          ) : null}
          </>
        )}
      </Card>
    </div>
  )
}
