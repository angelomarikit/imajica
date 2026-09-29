import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { Pager } from '@/pages/catalog/ProductInventoryPage'
import {
  categoryStats,
  createProductCategory,
  deleteProductCategory,
  saveProductCategory,
  subscribeProducts,
} from '@/services/productCatalogService'
import { formatPeso } from '@/utils/currency'

export function CategoryInventoryPage() {
  const [rows, setRows] = useState(() => categoryStats())
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [subtitle, setSubtitle] = useState('')

  useEffect(() => subscribeProducts(() => setRows(categoryStats())), [])

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          !search ||
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          (r.subtitle ?? '').toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, search],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const pageRows = filtered.slice(start, start + pageSize)

  function openAdd() {
    setEditId(null)
    setName('')
    setSubtitle('')
    setOpen(true)
  }

  function openEdit(id: string) {
    const row = rows.find((r) => r.id === id)
    if (!row) return
    setEditId(id)
    setName(row.name)
    setSubtitle(row.subtitle ?? '')
    setOpen(true)
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error('Category name is required')
      return
    }
    if (editId) {
      const existing = rows.find((r) => r.id === editId)
      if (existing) {
        saveProductCategory({
          id: editId,
          name: name.trim().toUpperCase(),
          subtitle: subtitle.trim() || 'N/A',
          createdAt: existing.createdAt,
        })
        toast.success('Category updated')
      }
    } else {
      createProductCategory({ name, subtitle })
      toast.success('Category added')
    }
    setOpen(false)
  }

  function exportCsv() {
    const header = ['ID', 'Category', 'Subtitle', 'Total Products', 'Total Earnings']
    const lines = filtered.map((r) =>
      [r.id, r.name, r.subtitle ?? '', r.totalProducts, r.totalEarnings]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'imajica-categories.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Imajica Category Inventory"
        description="Manage product classifications, branch availabilities, product counts, and revenue tracking metrics."
        stat={{ value: rows.length, label: 'Total Categories' }}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl text-[#073D2C] sm:text-3xl">
            Skincare & Skincare Categories
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportCsv}>
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </Button>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Category
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
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
          <div className="ml-auto flex min-w-[240px] flex-1 items-center gap-2 sm:max-w-lg">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
              <input
                className="h-10 w-full rounded-[10px] border border-border pl-9 pr-3 text-sm"
                placeholder="Search category title or branch..."
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
                <th className="px-2 py-3">ID</th>
                <th className="px-2 py-3">Category</th>
                <th className="px-2 py-3">Total Products</th>
                <th className="px-2 py-3">Total Earnings</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, idx) => (
                <tr key={r.id} className="border-t border-border/70 hover:bg-ivory-100">
                  <td className="px-2 py-3 text-slate-ui">#{100 + idx + start}</td>
                  <td className="px-2 py-3">
                    <p className="font-bold uppercase text-[#073D2C]">{r.name}</p>
                    <p className="text-xs text-slate-ui">{r.subtitle || 'N/A'}</p>
                  </td>
                  <td className="px-2 py-3">
                    <span className="inline-flex min-w-8 items-center justify-center rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">
                      {r.totalProducts}
                    </span>
                  </td>
                  <td className="px-2 py-3 font-medium">{formatPeso(r.totalEarnings)}</td>
                  <td className="px-2 py-3">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        aria-label="Edit"
                        onClick={() => openEdit(r.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#E8D9B8] text-[#073D2C]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete"
                        onClick={() => {
                          if (confirm(`Delete category ${r.name}?`)) {
                            deleteProductCategory(r.id)
                            toast.message('Category removed')
                          }
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-red-100 text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-10 text-center text-slate-ui">
                    No categories found.
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

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Edit Category' : 'Add Category'}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              Save Category
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide">
              Category Name
            </span>
            <input
              className="h-11 w-full rounded-[10px] border border-border px-3 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="SKIN CARE SET"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide">Subtitle</span>
            <input
              className="h-11 w-full rounded-[10px] border border-border px-3 text-sm"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Home Care"
            />
          </label>
        </div>
      </Drawer>
    </div>
  )
}
