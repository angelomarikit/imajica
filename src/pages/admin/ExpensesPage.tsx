import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  FileSpreadsheet,
  Filter,
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
import { Drawer } from '@/components/ui/Drawer'
import {
  createExpense,
  deleteExpense,
  getExpenses,
  saveExpense,
  subscribeExpenses,
} from '@/services/expenseService'
import type { ExpenseScope, OperationalExpense } from '@/types'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'

type TabId = 'all' | 'branch' | 'ops'

const CATEGORIES = [
  'Payroll',
  'Clinic Supplies',
  'Utilities',
  'Repairs & Maintenance',
  'Other Expenses',
]

function categoryVariant(category: string): 'info' | 'orange' | 'purple' | 'success' | 'neutral' {
  if (category === 'Clinic Supplies') return 'info'
  if (category === 'Other Expenses') return 'orange'
  if (category === 'Utilities') return 'purple'
  if (category === 'Repairs & Maintenance') return 'success'
  return 'neutral'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ExpensesPage() {
  const [expenses, setExpenses] = useState(() => getExpenses())
  const [tab, setTab] = useState<TabId>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<OperationalExpense | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [department, setDepartment] = useState('')
  const [amount, setAmount] = useState('0')
  const [scope, setScope] = useState<ExpenseScope>('branch')
  const [deductCash, setDeductCash] = useState(false)
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<'active' | 'inactive'>('active')

  useEffect(() => subscribeExpenses(() => setExpenses(getExpenses())), [])

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (tab === 'branch' && e.scope !== 'branch') return false
      if (tab === 'ops' && e.scope !== 'ops') return false
      if (dateFrom && e.expenseDate < dateFrom) return false
      if (dateTo && e.expenseDate > dateTo) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${e.name} ${e.category} ${e.department ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [expenses, tab, dateFrom, dateTo, search])

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0)

  function openAdd() {
    setEditing(null)
    setName('')
    setCategory(CATEGORIES[0])
    setDepartment('')
    setAmount('0')
    setScope(tab === 'ops' ? 'ops' : 'branch')
    setDeductCash(false)
    setExpenseDate(new Date().toISOString().slice(0, 10))
    setStatus('active')
    setDrawerOpen(true)
  }

  function openEdit(exp: OperationalExpense) {
    setEditing(exp)
    setName(exp.name)
    setCategory(exp.category)
    setDepartment(exp.department ?? '')
    setAmount(String(exp.amount))
    setScope(exp.scope)
    setDeductCash(exp.deductCash)
    setExpenseDate(exp.expenseDate)
    setStatus(exp.status === 'active' ? 'active' : 'inactive')
    setDrawerOpen(true)
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error('Expense name is required')
      return
    }
    if (editing) {
      saveExpense({
        ...editing,
        name: name.trim(),
        category,
        department: department.trim() || undefined,
        amount: Number(amount) || 0,
        scope,
        deductCash,
        expenseDate,
        status,
      })
      toast.success('Expense updated')
    } else {
      createExpense({
        name,
        category,
        department,
        amount: Number(amount) || 0,
        scope,
        deductCash,
        expenseDate,
        status,
      })
      toast.success('Expense added')
    }
    setDrawerOpen(false)
  }

  function exportCsv() {
    const header = [
      'Name',
      'Category',
      'Department',
      'Amount',
      'Type',
      'Deduct Cash',
      'Status',
      'Scope',
      'Expense Date',
      'Created',
    ]
    const lines = filtered.map((e) =>
      [
        e.name,
        e.category,
        e.department ?? '',
        e.amount,
        e.type,
        e.deductCash ? 'Yes' : 'No',
        e.status,
        e.scope,
        e.expenseDate,
        e.createdAt,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'imajica-expenses.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported Excel-compatible CSV')
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Operational Expenses"
        description="Track, log, and manage branch and company expenses. Review transaction histories, automatic monthly deductions, and export spreadsheets."
        stat={{ value: formatPeso(totalAmount), label: 'Total Expenses' }}
      />

      <div className="flex gap-6 border-b border-border text-sm font-semibold">
        {(
          [
            ['all', 'All Expenses'],
            ['branch', 'Branch Expenses'],
            ['ops', 'Ops Expenses'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'border-b-2 pb-2.5 transition',
              tab === id
                ? 'border-[#C5A059] text-[#073D2C]'
                : 'border-transparent text-slate-ui hover:text-[#073D2C]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl text-[#0d5c45]">Operational Expenses Log</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="gold" onClick={exportCsv}>
              <FileSpreadsheet className="h-4 w-4" /> Export
            </Button>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Expenses
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wide text-slate-ui">
              From Date
            </span>
            <input
              type="date"
              className="h-10 rounded-[10px] border border-border px-3 text-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wide text-slate-ui">
              To Date
            </span>
            <input
              type="date"
              className="h-10 rounded-[10px] border border-border px-3 text-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          <Button
            variant="secondary"
            onClick={() => {
              setDateFrom(fromDate)
              setDateTo(toDate)
            }}
          >
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <div className="ml-auto flex min-w-[240px] flex-1 items-center gap-2 sm:max-w-md">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
              <input
                className="h-10 w-full rounded-[10px] border border-border pl-9 pr-3 text-sm"
                placeholder="Search name, category, department..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSearch(query)
                }}
              />
            </div>
            <Button onClick={() => setSearch(query)}>Search</Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Expense Name</th>
                <th className="px-2 py-3">Category</th>
                <th className="px-2 py-3">Department</th>
                <th className="px-2 py-3">Amount</th>
                <th className="px-2 py-3">Type</th>
                <th className="px-2 py-3">Deduct Cash</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Expense Date</th>
                <th className="px-2 py-3">Created</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-border/70 hover:bg-ivory-100">
                  <td className="px-2 py-3 font-medium text-[#073D2C]">{e.name}</td>
                  <td className="px-2 py-3">
                    <Badge variant={categoryVariant(e.category)}>{e.category}</Badge>
                  </td>
                  <td className="px-2 py-3 text-slate-ui">{e.department || '—'}</td>
                  <td className="px-2 py-3 font-medium">{formatPeso(e.amount)}</td>
                  <td className="px-2 py-3">
                    <Badge variant="neutral">{e.type === 'manual' ? 'Manual' : 'Automatic'}</Badge>
                  </td>
                  <td className="px-2 py-3">
                    <Badge variant={e.deductCash ? 'orange' : 'neutral'}>
                      {e.deductCash ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-2 py-3">
                    <Badge variant={e.status === 'active' ? 'info' : 'neutral'}>
                      {e.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-2 py-3 text-slate-ui">{formatDate(e.expenseDate)}</td>
                  <td className="px-2 py-3 text-slate-ui">{formatDate(e.createdAt)}</td>
                  <td className="px-2 py-3">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        aria-label="Edit"
                        onClick={() => openEdit(e)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#E8D9B8] text-[#073D2C]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete"
                        onClick={() => {
                          if (confirm(`Delete expense “${e.name}”?`)) {
                            deleteExpense(e.id)
                            toast.message('Expense removed')
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-2 py-10 text-center text-slate-ui">
                    No expenses found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? 'Edit Expense' : 'Add Expenses'}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              Save Expense
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Expense Name">
            <input
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AC CLEANING"
            />
          </Field>
          <Field label="Category">
            <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Department">
            <input
              className={field}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field label="Amount">
            <input
              type="number"
              min={0}
              className={field}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Scope">
            <select
              className={field}
              value={scope}
              onChange={(e) => setScope(e.target.value as ExpenseScope)}
            >
              <option value="branch">Branch Expenses</option>
              <option value="ops">Ops Expenses</option>
            </select>
          </Field>
          <Field label="Expense Date">
            <input
              type="date"
              className={field}
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </Field>
          <Field label="Status">
            <select
              className={field}
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={deductCash}
              onChange={(e) => setDeductCash(e.target.checked)}
              className="h-4 w-4 accent-emerald-900"
            />
            Deduct cash
          </label>
        </div>
      </Drawer>
    </div>
  )
}

const field =
  'h-11 w-full rounded-[10px] border border-border px-3 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}
