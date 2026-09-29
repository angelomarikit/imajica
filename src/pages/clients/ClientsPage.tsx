import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
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
import {
  compareClientsByRecentAvail,
  deleteClient,
  getClients,
  subscribeClients,
} from '@/services/clientService'
import { preloadSalesData } from '@/services/salesService'
import { subscribeAnalytics } from '@/services/analyticsService'
import type { Client } from '@/types'
import { cn } from '@/utils/cn'

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
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<Client[]>(() => getClients())
  const [loading, setLoading] = useState(() => getClients().length === 0)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const refresh = () => {
      setClients(getClients())
      setLoading(false)
    }
    void preloadSalesData().then(refresh)
    const unsubClients = subscribeClients(refresh)
    const unsubSales = subscribeAnalytics(refresh)
    return () => {
      unsubClients()
      unsubSales()
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = !q
      ? clients
      : clients.filter(
          (c) =>
            c.fullName.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q),
        )
    // Always newest avail first — never alphabetical
    return [...list].sort(compareClientsByRecentAvail)
  }, [clients, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  )
  const pageNumbers = useMemo(() => paginationItems(page, pageCount), [page, pageCount])

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

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Customer Registry"
        description="Manage customer metadata profile files, search identities, and view detailed consultation history."
        stat={{ value: clients.length, label: 'Total Customers' }}
      />

      <Card className="p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#073D2C]">Customer Profile Management</h2>
          <Link to="/admin/clients/new">
            <Button>
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </Link>
        </div>

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
                <p className="mt-1 text-center text-xs text-slate-ui">
                  {c.email?.trim() ? c.email : '—'}
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
                    <span>Sessions: {c.sessionsCount ?? 0}</span>
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
