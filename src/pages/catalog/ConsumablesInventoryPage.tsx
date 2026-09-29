import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Search } from 'lucide-react'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Pager } from '@/pages/catalog/ProductInventoryPage'
import { getBranches } from '@/services/branchService'
import { getConsumables, subscribeProducts } from '@/services/productCatalogService'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'

function formatCreated(iso: string) {
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Screenshot: low/zero use orange; healthy stock (>= 5) uses green. */
function stockBadgeClass(stock: number) {
  return stock >= 5
    ? 'bg-emerald-100 text-emerald-800'
    : 'bg-amber-100 text-amber-700'
}

export function ConsumablesInventoryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState(() => getConsumables())
  const branches = useMemo(() => getBranches().filter((b) => b.status === 'active'), [items])
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [pageSize] = useState(15)
  const [page, setPage] = useState(1)

  useEffect(() => subscribeProducts(() => setItems(getConsumables())), [])

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (branchFilter !== 'all') {
        if (branchFilter === 'Global') {
          if (i.branchName !== 'Global') return false
        } else if (i.branchId !== branchFilter && i.branchName !== branchFilter) {
          return false
        }
      }
      if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [items, branchFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const rows = filtered.slice(start, start + pageSize)

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Imajica Consumables Inventory"
        description="Manage clinic consumables, monitor branch supplies, and review scoped stock levels with audit history."
        stat={{ value: items.length, label: 'Total Items' }}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[160px]">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-ui">
              Filter by Branch
            </span>
            <select
              className="h-10 w-full rounded-[10px] border border-border bg-white px-3 text-sm"
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">All Branches</option>
              <option value="Global">Global</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name.replace(/ Branch$/, '')}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex min-w-[240px] flex-1 flex-col gap-1 sm:max-w-lg">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-ui">
              Search Consumable
            </span>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
                <input
                  className="h-10 w-full rounded-[10px] border border-border pl-9 pr-3 text-sm"
                  placeholder="Search consumable name..."
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
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Consumable Name</th>
                <th className="px-2 py-3 text-center">Stock</th>
                <th className="px-2 py-3 text-center">Price</th>
                <th className="px-2 py-3 text-center">Branch</th>
                <th className="px-2 py-3 text-center">Date Created</th>
                <th className="px-2 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="border-t border-border/70 hover:bg-ivory-100">
                  <td className="px-2 py-3 font-semibold uppercase text-[#073D2C]">{i.name}</td>
                  <td className="px-2 py-3 text-center">
                    <span
                      className={cn(
                        'inline-flex min-w-10 items-center justify-center rounded-md px-2 py-1 text-xs font-bold',
                        stockBadgeClass(i.stock),
                      )}
                    >
                      {i.stock}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">{formatPeso(i.price)}</td>
                  <td className="px-2 py-3 text-center text-slate-ui">{i.branchName}</td>
                  <td className="px-2 py-3 text-center text-slate-ui">
                    {formatCreated(i.createdAt)}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <button
                      type="button"
                      aria-label="View"
                      title="View"
                      onClick={() => navigate(`/admin/catalog/consumables/${i.id}`)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-sky-50 text-sky-600"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-10 text-center text-slate-ui">
                    No consumables found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <Pager
          start={start}
          pageSize={pageSize}
          total={filtered.length}
          page={safePage}
          totalPages={totalPages}
          onPage={setPage}
        />
      </Card>
    </div>
  )
}
