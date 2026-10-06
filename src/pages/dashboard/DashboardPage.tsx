import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CalendarCheck2,
  CalendarDays,
  Cake,
  CreditCard,
  Gift,
  Minus,
  Package,
  Percent,
  Plus,
  Receipt,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { BRAND } from '@/constants/brand'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import {
  listAppointments,
  subscribeAppointments,
  toDateKey,
} from '@/services/appointmentService'
import { getClients, preloadClientsFromSupabase, subscribeClients } from '@/services/clientService'
import {
  readConfirmedCash,
  readManualCashDeducted,
  subscribeCashDrawer,
  writeConfirmedCash,
  writeManualCashDeducted,
} from '@/services/cashDrawerService'
import { getExpenses, subscribeExpenses } from '@/services/expenseService'
import {
  getBookingRows,
  getSales,
  preloadSalesData,
  subscribeSalesData,
  todayDateKey,
} from '@/services/salesService'
import { getDirectoryStaff } from '@/services/staffDirectoryService'
import type { Appointment, Client, OperationalExpense, Sale, Staff } from '@/types'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'
import { isBranchOwner, isHqRole } from '@/utils/franchiseAccess'

const COMMISSION_RATE = 0.05
/** Clinic manager take on their clinic’s total sales (clinic-manager dashboard only). */
const BRANCH_MANAGER_COMMISSION_RATE = 0.01

type BirthdayCard = {
  id: string
  name: string
  initials: string
  label: string
  sub: string
  daysUntil: number
  role?: string
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || '—'
}

function parseDob(raw?: string): Date | null {
  if (!raw?.trim()) return null
  const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function birthdayMeta(dob: Date, from: Date) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
  if (next < today) next = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate())
  const daysUntil = Math.round((next.getTime() - today.getTime()) / 86_400_000)
  let age = today.getFullYear() - dob.getFullYear()
  const hadBirthday =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate())
  if (!hadBirthday) age -= 1
  const displayDate = dob.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return { daysUntil, age: Math.max(0, age), displayDate }
}

function monthBounds(d = new Date()): { from: string; to: string } {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const last = new Date(y, d.getMonth() + 1, 0).getDate()
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(last).padStart(2, '0')}`,
  }
}

function defaultDashboardRange(): { from: string; to: string } {
  const today = todayDateKey()
  const { from } = monthBounds()
  return { from, to: today }
}

function inDateRange(dateKey: string, from: string, to: string) {
  if (!dateKey) return false
  return dateKey >= from && dateKey <= to
}

function saleDateKey(sale: Sale) {
  return todayDateKey(new Date(sale.createdAt))
}

function formatRangeLabel(from: string, to: string) {
  const fmt = (key: string) =>
    new Date(`${key}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  if (from === to) return fmt(from)
  return `${fmt(from)} – ${fmt(to)}`
}

function daysInclusive(from: string, to: string) {
  const a = new Date(`${from}T12:00:00`).getTime()
  const b = new Date(`${to}T12:00:00`).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1)
}

function StatCard({
  title,
  value,
  hint,
  tag,
  tagTone = 'amber',
  icon,
  action,
  className,
  onClick,
}: {
  title: string
  value: string
  hint?: string
  tag?: string
  tagTone?: 'amber' | 'sky' | 'rose' | 'emerald'
  icon?: ReactNode
  action?: ReactNode
  className?: string
  onClick?: () => void
}) {
  const tagClass = {
    amber: 'bg-amber-100 text-amber-800',
    sky: 'bg-sky-100 text-sky-800',
    rose: 'bg-rose-100 text-rose-700',
    emerald: 'bg-emerald-100 text-emerald-800',
  }[tagTone]

  const interactive = Boolean(onClick)

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        'flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]',
        interactive &&
          'cursor-pointer transition hover:-translate-y-0.5 hover:border-[#C5A059]/50 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]/40',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-[#0A2E26] ring-1 ring-slate-200/80">
              {icon}
            </span>
          ) : null}
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
        </div>
        {tag ? (
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              tagClass,
            )}
          >
            {tag}
          </span>
        ) : null}
      </div>
      <p className="mt-4 font-metric text-[1.75rem] font-semibold leading-none tracking-tight text-slate-900">
        {value}
      </p>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        {hint ? (
          <p className="text-xs leading-snug text-slate-500">
            {hint}
            {interactive ? (
              <span className="mt-1 block text-[11px] font-semibold text-[#0A2E26]/70">
                Tap for breakdown
              </span>
            ) : null}
          </p>
        ) : (
          <span />
        )}
        {action}
      </div>
    </div>
  )
}

type SalesBreakdownView = {
  title: string
  subtitle: string
  sales: Sale[]
  branchLabel: string
}

function buildSalesBrief(sales: Sale[]) {
  const total = sales.reduce((n, s) => n + (s.totalAmount || 0), 0)
  const byType = {
    service: 0,
    package: 0,
    product: 0,
  }
  const byPay = new Map<string, number>()
  const byItem = new Map<string, { name: string; amount: number; qty: number }>()
  const clients = new Set<string>()
  const bookings = new Set<string>()

  for (const s of sales) {
    const type = s.itemType === 'package' || s.itemType === 'product' ? s.itemType : 'service'
    byType[type] += s.totalAmount || 0
    const pay = (s.paymentMethod || 'other').replaceAll('_', ' ')
    byPay.set(pay, (byPay.get(pay) || 0) + (s.totalAmount || 0))
    const key = (s.treatmentOrPackage || 'Item').trim() || 'Item'
    const prev = byItem.get(key) ?? { name: key, amount: 0, qty: 0 }
    prev.amount += s.totalAmount || 0
    prev.qty += s.quantity || 1
    byItem.set(key, prev)
    if (s.clientId) clients.add(s.clientId)
    else if (s.clientName) clients.add(s.clientName)
    bookings.add(s.bookingRef || s.invoiceNumber || s.id)
  }

  const topItems = [...byItem.values()].sort((a, b) => b.amount - a.amount).slice(0, 12)
  const payments = [...byPay.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount)

  return {
    total,
    lines: sales.length,
    bookings: bookings.size,
    clients: clients.size,
    byType,
    topItems,
    payments,
  }
}

function SalesBreakdownModal({
  open,
  view,
  onClose,
}: {
  open: boolean
  view: SalesBreakdownView | null
  onClose: () => void
}) {
  if (!open || !view) return null
  const brief = buildSalesBrief(view.sales)
  const maxType = Math.max(brief.byType.service, brief.byType.package, brief.byType.product, 1)
  const typeRows = [
    { key: 'service', label: 'Services', amount: brief.byType.service, tone: 'from-[#0A2E26] to-[#1a5c4a]' },
    { key: 'package', label: 'Packages', amount: brief.byType.package, tone: 'from-[#C5A059] to-[#e0c58a]' },
    { key: 'product', label: 'Products', amount: brief.byType.product, tone: 'from-rose-400 to-rose-300' },
  ] as const

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#041c18]/55 backdrop-blur-[2px]"
        aria-label="Close breakdown"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92vh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#FBF8F2] shadow-[0_28px_80px_rgba(4,28,24,0.45)]">
        <div className="relative shrink-0 overflow-hidden bg-[#05281F] px-6 py-6 text-white sm:px-8 sm:py-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.35)_0%,transparent_70%)]"
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0 pr-2">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#C5A059]/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#F3E6C8]">
                <Sparkles className="h-3 w-3 text-[#C5A059]" />
                Brief breakdown
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{view.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{view.subtitle}</p>
              <p className="mt-1.5 text-xs font-medium text-[#C5A059]">{view.branchLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-white/15 bg-white/10 p-2.5 text-white hover:bg-white/15"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="relative mt-6 font-metric text-[2.15rem] font-semibold leading-none tracking-tight sm:text-[2.35rem]">
            {formatPesoExact(brief.total)}
          </p>
          <div className="relative mt-4 flex flex-wrap gap-2.5 text-[11px] font-semibold text-white/75">
            <span className="rounded-full bg-white/10 px-3 py-1.5">{brief.bookings} bookings</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">{brief.clients} clients</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">{brief.lines} line items</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8 sm:py-7">
          <div className="space-y-7 pb-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                By category
              </p>
              <div className="mt-5 space-y-5">
                {typeRows.map((row) => (
                  <div key={row.key}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-800">{row.label}</span>
                      <span className="shrink-0 font-metric font-semibold text-slate-900">
                        {formatPesoExact(row.amount)}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r', row.tone)}
                        style={{ width: `${Math.round((row.amount / maxType) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Top items
                </p>
                {brief.topItems.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No sales in this period.</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {brief.topItems.map((item, i) => (
                      <li key={item.name} className="flex items-start gap-3.5">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#05281F] text-[10px] font-bold text-[#F3E6C8]">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold leading-snug text-slate-900">
                            {item.name}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                            Qty {item.qty} · {formatPesoExact(item.amount)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Payments
                </p>
                {brief.payments.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No payment mix yet.</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {brief.payments.map((p) => (
                      <li key={p.label} className="flex items-start justify-between gap-3 text-sm">
                        <span className="break-words capitalize leading-snug text-slate-700">
                          {p.label}
                        </span>
                        <span className="shrink-0 font-metric font-semibold text-slate-900">
                          {formatPesoExact(p.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 -mx-6 border-t border-[#C5A059]/25 bg-[#FBF8F2]/95 px-6 pt-4 backdrop-blur sm:-mx-8 sm:px-8">
              <div className="flex flex-col gap-4 rounded-2xl border border-[#C5A059]/35 bg-gradient-to-r from-[#F7EED8] to-[#FBF8F2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5 text-sm text-[#05281F]">
                  <Package className="h-4 w-4 shrink-0 text-[#C5A059]" />
                  <span className="font-medium leading-snug">Quick snapshot for this selection</span>
                </div>
                <Button type="button" variant="gold" className="shrink-0 rounded-xl" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BirthdayPersonCard({ item }: { item: BirthdayCard }) {
  return (
    <div className="flex min-w-[240px] max-w-[280px] shrink-0 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0A2E26] text-sm font-semibold text-[#F3E6C8]">
        {item.initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
              item.daysUntil === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800',
            )}
          >
            <Cake className="h-3 w-3" />
            {item.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
        {item.role ? <p className="mt-0.5 text-[11px] font-medium text-slate-400">{item.role}</p> : null}
      </div>
    </div>
  )
}

function BirthdayBlock({
  title,
  empty,
  items,
}: {
  title: string
  empty: string
  items: BirthdayCard[]
}) {
  return (
    <div>
      <p className="mb-2.5 text-sm font-semibold text-slate-800">{title}</p>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
          {empty}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">{items.map((b) => (
          <BirthdayPersonCard key={b.id} item={b} />
        ))}</div>
      )}
    </div>
  )
}

export function DashboardPage() {
  return <BranchOpsDashboard />
}

function BranchOpsDashboard() {
  const { user } = useAuth()
  const { branches, selectedBranchId, setSelectedBranchId, branchLocked } = useBranch()
  const forcedBranchId = useForcedBranchId()
  const branchOwner = isBranchOwner(user)
  const hqView = isHqRole(user?.role)
  // HQ aggregates every clinic when All Branches is selected (default after HQ login).
  const scopeBranchId = forcedBranchId ?? (selectedBranchId === 'all' ? undefined : selectedBranchId)

  const initialRange = defaultDashboardRange()
  const [rangeFrom, setRangeFrom] = useState(initialRange.from)
  const [rangeTo, setRangeTo] = useState(initialRange.to)
  const [fromDraft, setFromDraft] = useState(initialRange.from)
  const [toDraft, setToDraft] = useState(initialRange.to)
  const [rangeOpen, setRangeOpen] = useState(false)
  const [rangeBootstrapped, setRangeBootstrapped] = useState(false)

  const [sales, setSales] = useState<Sale[]>(() => getSales())
  const [clients, setClients] = useState<Client[]>(() => getClients())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [expenses, setExpenses] = useState<OperationalExpense[]>(() => getExpenses())
  const [cashTick, setCashTick] = useState(0)
  const [breakdown, setBreakdown] = useState<SalesBreakdownView | null>(null)
  const [deductOpen, setDeductOpen] = useState(false)
  const [deductAmount, setDeductAmount] = useState('')
  const [deductSaving, setDeductSaving] = useState(false)

  useEffect(() => {
    const refreshSales = () => setSales(getSales())
    const refreshClients = () => setClients(getClients())
    const refreshExpenses = () => setExpenses(getExpenses())
    const refreshAppts = () => {
      void listAppointments().then(setAppointments)
    }
    void preloadSalesData().then(refreshSales)
    void preloadClientsFromSupabase().then(refreshClients)
    refreshSales()
    refreshClients()
    refreshExpenses()
    refreshAppts()
    const unsubs = [
      subscribeSalesData(refreshSales),
      subscribeClients(refreshClients),
      subscribeExpenses(refreshExpenses),
      subscribeAppointments(refreshAppts),
      subscribeCashDrawer(() => setCashTick((n) => n + 1)),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const branchLabel = useMemo(() => {
    if (forcedBranchId || branchOwner) return user?.branchName ?? 'My Branch'
    if (scopeBranchId) {
      return branches.find((b) => b.id === scopeBranchId)?.name ?? 'Selected Branch'
    }
    return 'All Branches'
  }, [forcedBranchId, branchOwner, user?.branchName, scopeBranchId, branches])

  function openSalesBreakdown(title: string, subtitle: string, lines: Sale[]) {
    setBreakdown({ title, subtitle, sales: lines, branchLabel })
  }

  const cashScope = scopeBranchId ?? 'all'
  const todayKey = todayDateKey()
  const now = useMemo(() => new Date(), [todayKey])

  const scopedSales = useMemo(
    () => (scopeBranchId ? sales.filter((s) => s.branchId === scopeBranchId) : sales),
    [sales, scopeBranchId],
  )
  const scopedClients = useMemo(() => {
    if (!scopeBranchId) return clients
    return clients.filter((c) => c.preferredBranchId === scopeBranchId)
  }, [clients, scopeBranchId])
  const scopedAppts = useMemo(
    () => (scopeBranchId ? appointments.filter((a) => a.branchId === scopeBranchId) : appointments),
    [appointments, scopeBranchId],
  )
  const scopedExpenses = useMemo(() => {
    if (!scopeBranchId) return expenses
    return expenses.filter((e) => !e.branchId || e.branchId === scopeBranchId)
  }, [expenses, scopeBranchId])

  // If current month has no sales yet (common with Sep import data), snap once to latest sale month.
  useEffect(() => {
    if (rangeBootstrapped || !scopedSales.length) return
    const hasInRange = scopedSales.some((s) =>
      inDateRange(saleDateKey(s), rangeFrom, rangeTo),
    )
    if (hasInRange) {
      setRangeBootstrapped(true)
      return
    }
    const latest = scopedSales.reduce((acc, s) => {
      const k = saleDateKey(s)
      return k > acc ? k : acc
    }, '')
    if (!latest) {
      setRangeBootstrapped(true)
      return
    }
    const bounds = monthBounds(new Date(`${latest}T12:00:00`))
    setRangeFrom(bounds.from)
    setRangeTo(bounds.to)
    setFromDraft(bounds.from)
    setToDraft(bounds.to)
    setRangeBootstrapped(true)
  }, [scopedSales, rangeFrom, rangeTo, rangeBootstrapped])

  const metrics = useMemo(() => {
    const rangeSales = scopedSales.filter((s) => inDateRange(saleDateKey(s), rangeFrom, rangeTo))
    const todaySales = scopedSales.filter((s) => saleDateKey(s) === todayKey)
    const periodSalesTotal = rangeSales.reduce((n, s) => n + (s.totalAmount || 0), 0)
    const dailySales = todaySales.reduce((n, s) => n + (s.totalAmount || 0), 0)

    // Full calendar month of the selected range end (not just the filtered days).
    let monthKey = rangeTo.slice(0, 7)
    let monthSalesLines = scopedSales.filter((s) => saleDateKey(s).startsWith(monthKey))
    let monthlySales = monthSalesLines.reduce((n, s) => n + (s.totalAmount || 0), 0)
    let monthlyLabel = new Date(`${monthKey}-01T12:00:00`).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
    // If that month is empty but branch has older data, fall back to latest month with sales.
    if (monthlySales === 0 && scopedSales.length) {
      const latestMonth = scopedSales.reduce((latest, s) => {
        const m = saleDateKey(s).slice(0, 7)
        return m > latest ? m : latest
      }, '')
      if (latestMonth && latestMonth !== monthKey) {
        monthKey = latestMonth
        monthSalesLines = scopedSales.filter((s) => saleDateKey(s).startsWith(latestMonth))
        monthlySales = monthSalesLines.reduce((n, s) => n + (s.totalAmount || 0), 0)
        monthlyLabel = new Date(`${latestMonth}-01T12:00:00`).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })
      }
    }

    const rangeExpenseTotal = scopedExpenses
      .filter((e) => e.status === 'active' && inDateRange(e.expenseDate, rangeFrom, rangeTo))
      .reduce((n, e) => n + (e.amount || 0), 0)
    const todayExpenseTotal = scopedExpenses
      .filter((e) => e.expenseDate === todayKey && e.status === 'active')
      .reduce((n, e) => n + (e.amount || 0), 0)

    const bookingRows = getBookingRows({ branchId: scopeBranchId })
    const periodBookingRows = bookingRows.filter((r) =>
      inDateRange(todayDateKey(new Date(r.dateIso)), rangeFrom, rangeTo),
    )
    const completedBookings = periodBookingRows.filter(
      (r) => r.status === 'Paid' || r.status === 'paid' || r.status === 'completed',
    ).length
    const rangeAppts = scopedAppts.filter((a) =>
      inDateRange(toDateKey(new Date(a.startAt)), rangeFrom, rangeTo),
    )
    const patientIds = new Set<string>()
    for (const a of rangeAppts) {
      if (a.clientId) patientIds.add(a.clientId)
    }
    for (const s of rangeSales) {
      if (s.clientId) patientIds.add(s.clientId)
    }
    const patientsInRange = patientIds.size || rangeAppts.length
    const commissions = periodSalesTotal * COMMISSION_RATE
    /** Clinic manager 1% follows the same calendar range as staff / range sales. */
    const managerCommission = periodSalesTotal * BRANCH_MANAGER_COMMISSION_RATE
    const isSingleDay = rangeFrom === rangeTo
    const includesToday = inDateRange(todayKey, rangeFrom, rangeTo)

    return {
      completedBookings: completedBookings || periodBookingRows.length,
      todayPatients: patientsInRange,
      totalAppointments: Math.max(rangeAppts.length, periodBookingRows.length),
      todayPaymentsCount: rangeSales.length || rangeAppts.length,
      paymentSummary: periodSalesTotal,
      /** Always calendar-today sales for this branch/scope */
      todaySales: dailySales,
      dailySales: includesToday ? dailySales : periodSalesTotal,
      periodSales: periodSalesTotal,
      monthlySales,
      monthlyLabel,
      rangeSalesLines: rangeSales,
      todaySalesLines: todaySales,
      monthSalesLines,
      managerCommission,
      commissions,
      todayExpenses: includesToday && isSingleDay ? todayExpenseTotal : rangeExpenseTotal,
      rangeExpenseTotal,
      todayExpenseTotal,
      isSingleDay,
      includesToday,
      daySpan: daysInclusive(rangeFrom, rangeTo),
    }
  }, [scopedSales, scopedAppts, scopedExpenses, scopeBranchId, todayKey, rangeFrom, rangeTo])

  /** Per-clinic breakdown for HQ All Branches view — respects selected date range. */
  const salesByBranch = useMemo(() => {
    const clinicBranches = branches.filter(
      (b) => b.branchType !== 'warehouse' && b.status === 'active',
    )
    const rows = clinicBranches.map((b) => {
      const branchSales = sales.filter((s) => s.branchId === b.id)
      const periodSales = branchSales
        .filter((s) => inDateRange(saleDateKey(s), rangeFrom, rangeTo))
        .reduce((n, s) => n + (s.totalAmount || 0), 0)
      const daySales = branchSales
        .filter((s) => saleDateKey(s) === todayKey)
        .reduce((n, s) => n + (s.totalAmount || 0), 0)
      const bookingCount = getBookingRows({ branchId: b.id }).filter((r) =>
        inDateRange(todayDateKey(new Date(r.dateIso)), rangeFrom, rangeTo),
      ).length
      const apptCount = appointments.filter(
        (a) =>
          a.branchId === b.id && inDateRange(toDateKey(new Date(a.startAt)), rangeFrom, rangeTo),
      ).length
      const clientCount = clients.filter((c) => c.preferredBranchId === b.id).length
      return {
        id: b.id,
        name: b.name,
        periodSales,
        dailySales: daySales,
        bookings: Math.max(apptCount, bookingCount),
        clients: clientCount,
      }
    })
    const maxPeriod = Math.max(1, ...rows.map((r) => r.periodSales))
    return {
      periodLabel: formatRangeLabel(rangeFrom, rangeTo),
      rows: rows
        .map((r) => ({ ...r, barPct: Math.round((r.periodSales / maxPeriod) * 100) }))
        .sort((a, b) => b.periodSales - a.periodSales || a.name.localeCompare(b.name)),
    }
  }, [branches, sales, appointments, clients, rangeFrom, rangeTo, todayKey])

  function applyDateRange(nextFrom = fromDraft, nextTo = toDraft) {
    let from = nextFrom || rangeFrom
    let to = nextTo || rangeTo
    if (from > to) {
      const tmp = from
      from = to
      to = tmp
    }
    setFromDraft(from)
    setToDraft(to)
    setRangeFrom(from)
    setRangeTo(to)
    setRangeOpen(false)
    toast.success('Date range updated', {
      description: formatRangeLabel(from, to),
    })
  }

  function applyPreset(kind: 'today' | 'week' | 'month' | 'lastMonth') {
    const today = new Date()
    if (kind === 'today') {
      const key = todayDateKey(today)
      setFromDraft(key)
      setToDraft(key)
      applyDateRange(key, key)
      return
    }
    if (kind === 'week') {
      const start = new Date(today)
      start.setDate(today.getDate() - ((today.getDay() + 6) % 7))
      const from = todayDateKey(start)
      const to = todayDateKey(today)
      setFromDraft(from)
      setToDraft(to)
      applyDateRange(from, to)
      return
    }
    if (kind === 'month') {
      const bounds = monthBounds(today)
      const to = todayDateKey(today)
      setFromDraft(bounds.from)
      setToDraft(to)
      applyDateRange(bounds.from, to)
      return
    }
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const bounds = monthBounds(prev)
    setFromDraft(bounds.from)
    setToDraft(bounds.to)
    applyDateRange(bounds.from, bounds.to)
  }

  const cash = useMemo(() => {
    void cashTick
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yKey = todayDateKey(yesterday)
    const beginning = readConfirmedCash(cashScope, yKey) ?? 0
    const manualDeducted = readManualCashDeducted(cashScope, todayKey)
    // Cash drawer is always today's ops — not the selected reporting range.
    const todaySalesTotal = scopedSales
      .filter((s) => saleDateKey(s) === todayKey)
      .reduce((n, s) => n + (s.totalAmount || 0), 0)
    // Only expenses marked "Deduct cash" reduce the drawer (reporting expenses do not).
    const expenseCashOut = scopedExpenses
      .filter(
        (e) =>
          e.expenseDate === todayKey &&
          e.status === 'active' &&
          e.deductCash,
      )
      .reduce((n, e) => n + (e.amount || 0), 0)
    const deducted = expenseCashOut + manualDeducted
    const ending = beginning + todaySalesTotal - deducted
    const confirmedToday = readConfirmedCash(cashScope, todayKey)
    return {
      beginning,
      ending,
      deducted,
      expenseCashOut,
      manualDeducted,
      confirmedToday,
    }
  }, [cashScope, todayKey, scopedSales, scopedExpenses, cashTick])

  const customerBirthdays = useMemo(() => {
    const todayList: BirthdayCard[] = []
    const upcoming: BirthdayCard[] = []
    for (const c of scopedClients) {
      const dob = parseDob(c.dateOfBirth)
      if (!dob) continue
      const meta = birthdayMeta(dob, now)
      if (meta.daysUntil > 92) continue
      const card: BirthdayCard = {
        id: c.id,
        name: c.fullName,
        initials: initials(c.fullName),
        label: meta.daysUntil === 0 ? 'Today' : `in ${meta.daysUntil} days`,
        sub: `${meta.displayDate} | ${meta.age} years old`,
        daysUntil: meta.daysUntil,
      }
      if (meta.daysUntil === 0) todayList.push(card)
      else upcoming.push(card)
    }
    upcoming.sort((a, b) => a.daysUntil - b.daysUntil)
    return { today: todayList, upcoming: upcoming.slice(0, 12) }
  }, [scopedClients, now])

  const staffBirthdays = useMemo(() => {
    let staff: Staff[] = getDirectoryStaff().filter((s) => s.status === 'active')
    if (scopeBranchId) {
      const scoped = staff.filter((s) => s.branchId === scopeBranchId)
      if (scoped.length) staff = scoped
    }
    const todayList: BirthdayCard[] = []
    const upcoming: BirthdayCard[] = []
    for (const s of staff) {
      const dob = parseDob(s.birthDate)
      if (!dob) continue
      const meta = birthdayMeta(dob, now)
      if (meta.daysUntil > 92) continue
      const card: BirthdayCard = {
        id: s.id,
        name: s.fullName,
        initials: initials(s.fullName),
        label: meta.daysUntil === 0 ? 'Today' : `in ${meta.daysUntil} days`,
        sub: `${meta.displayDate} | ${meta.age} years old`,
        daysUntil: meta.daysUntil,
        role: s.title || s.role,
      }
      if (meta.daysUntil === 0) todayList.push(card)
      else upcoming.push(card)
    }
    upcoming.sort((a, b) => a.daysUntil - b.daysUntil)
    return { today: todayList, upcoming: upcoming.slice(0, 12) }
  }, [scopeBranchId, now])

  function confirmCash() {
    writeConfirmedCash(cashScope, todayKey, cash.ending)
    setCashTick((n) => n + 1)
    toast.success('Cash confirmed', {
      description: `Ending balance ${formatPesoExact(cash.ending)} saved for ${todayKey}.`,
    })
  }

  function openDeductCash() {
    setDeductAmount('')
    setDeductOpen(true)
  }

  function submitDeductCash() {
    const amount = Number(String(deductAmount).replace(/[^\d.]/g, ''))
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter exact cash')
      return
    }
    if (amount > cash.ending) {
      toast.error('Deduction cannot exceed ending cash')
      return
    }
    setDeductSaving(true)
    try {
      writeManualCashDeducted(cashScope, todayKey, cash.manualDeducted + amount)
      writeConfirmedCash(cashScope, todayKey, cash.ending - amount)
      setCashTick((n) => n + 1)
      setDeductOpen(false)
      setDeductAmount('')
      toast.success('Cash deducted', {
        description: `${formatPesoExact(amount)} removed from ${branchLabel} drawer.`,
      })
    } finally {
      setDeductSaving(false)
    }
  }

  const rangeLabel = formatRangeLabel(rangeFrom, rangeTo)
  const periodSalesHint =
    metrics.isSingleDay
      ? `Sales for ${rangeLabel}.`
      : `Sales across ${metrics.daySpan} days (${rangeLabel}).`
  const patientsHint = metrics.isSingleDay
    ? "Clients scheduled for today's services."
    : 'Unique clients with bookings or sales in the selected range.'
  const expensesHint = metrics.isSingleDay
    ? 'Expenses captured for the selected day.'
    : 'Expenses captured in the selected range.'

  return (
    <div className="-mx-1 space-y-6 sm:mx-0">
      <SalesBreakdownModal
        open={Boolean(breakdown)}
        view={breakdown}
        onClose={() => setBreakdown(null)}
      />

      <Dialog
        open={deductOpen}
        onClose={() => {
          if (deductSaving) return
          setDeductOpen(false)
        }}
        title="Deduct Cash"
        description="Please enter exact cash to deduct from today's drawer."
        confirmLabel={deductSaving ? 'Saving…' : 'Deduct Cash'}
        onConfirm={submitDeductCash}
        destructive
      >
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
            Exact cash (₱)
          </span>
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-[#073D2C] outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10"
            placeholder="0.00"
            value={deductAmount}
            onChange={(e) => setDeductAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitDeductCash()
              }
            }}
          />
          <span className="mt-1.5 block text-xs text-slate-500">
            Available ending cash: {formatPesoExact(cash.ending)}
          </span>
        </label>
      </Dialog>

      {/* Welcome */}
      <section className="relative rounded-2xl bg-[#05281F] text-white shadow-[0_16px_40px_rgba(5,40,31,0.28)]">
        {/* Decorative layer only — keep overflow clipped so the date popover can escape */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.28)_0%,transparent_70%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C5A059]/50 to-transparent" />
        </div>
        <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full bg-[#C5A059] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#05281F]">
              {BRAND.name}
            </p>
            <h1 className="mt-3 text-[1.65rem] font-semibold leading-tight tracking-tight text-white sm:text-[1.9rem]">
              Welcome back, {user?.fullName ?? 'Team'}!
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Here is your daily summary, branch performance metrics, and operational highlights.
            </p>
          </div>
          <div className={cn('relative flex flex-wrap items-center gap-2', rangeOpen && 'z-20')}>
            {!branchLocked && !branchOwner && hqView ? (
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none backdrop-blur"
              >
                <option value="all" className="text-slate-900">
                  All Branches
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="text-slate-900">
                    {b.name}
                  </option>
                ))}
              </select>
            ) : null}

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setFromDraft(rangeFrom)
                  setToDraft(rangeTo)
                  setRangeOpen((v) => !v)
                }}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none backdrop-blur hover:bg-white/15"
              >
                <CalendarDays className="h-4 w-4 text-[#C5A059]" />
                <span className="max-w-[14rem] truncate font-medium">{rangeLabel}</span>
              </button>
              {rangeOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="Close date range"
                    className="fixed inset-0 z-10 cursor-default bg-transparent"
                    onClick={() => setRangeOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.28)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Date range
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-medium text-slate-600">
                        From
                        <input
                          type="date"
                          value={fromDraft}
                          max={toDraft || undefined}
                          onChange={(e) => setFromDraft(e.target.value)}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                        />
                      </label>
                      <label className="text-xs font-medium text-slate-600">
                        To
                        <input
                          type="date"
                          value={toDraft}
                          min={fromDraft || undefined}
                          onChange={(e) => setToDraft(e.target.value)}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(
                        [
                          ['today', 'Today'],
                          ['week', 'This week'],
                          ['month', 'This month'],
                          ['lastMonth', 'Last month'],
                        ] as const
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => applyPreset(key)}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-emerald-700/40 hover:bg-emerald-50"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-xl"
                        onClick={() => setRangeOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="gold"
                        className="rounded-xl"
                        onClick={() => applyDateRange()}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C5A059]">
                Branch
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">{branchLabel}</p>
              {branchOwner || forcedBranchId ? (
                <p className="mt-0.5 text-xs text-white/65">{user?.fullName}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Metrics row 1 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={branchOwner ? 'Completed Bookings' : 'Total Appointments'}
          value={(branchOwner ? metrics.completedBookings : metrics.totalAppointments).toLocaleString()}
          hint={`In selected range · ${rangeLabel}`}
          tag="Bookings"
          tagTone="amber"
          icon={<CalendarCheck2 className="h-4 w-4" />}
        />
        <StatCard
          title={branchOwner ? (metrics.isSingleDay ? "Today's Patients" : 'Patients') : 'Payments'}
          value={String(branchOwner ? metrics.todayPatients : metrics.todayPaymentsCount)}
          hint={branchOwner ? patientsHint : `Payment rows in ${rangeLabel}.`}
          tag={metrics.isSingleDay ? 'Today' : 'Range'}
          tagTone="sky"
          icon={branchOwner ? <Users className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
        />
        <StatCard
          title="Payment Summary"
          value={formatPesoExact(metrics.paymentSummary)}
          hint={`Payments in ${rangeLabel}.`}
          tag="View All"
          tagTone="amber"
          icon={<Wallet className="h-4 w-4" />}
          onClick={() =>
            openSalesBreakdown('Payment Summary', `Payments in ${rangeLabel}`, metrics.rangeSalesLines)
          }
          action={
            <Link
              to="/admin/payments"
              className="text-xs font-semibold text-emerald-800 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View All
            </Link>
          }
        />
        <StatCard
          title="Range Sales"
          value={formatPesoExact(metrics.periodSales)}
          hint={periodSalesHint}
          tag="Range"
          tagTone="amber"
          icon={<TrendingUp className="h-4 w-4" />}
          onClick={() =>
            openSalesBreakdown('Range Sales', periodSalesHint, metrics.rangeSalesLines)
          }
        />
      </div>

      {/* Metrics row 2 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={formatPesoExact(metrics.todaySales)}
          hint={`Today's total service sales (${formatRangeLabel(todayKey, todayKey)}).`}
          tag="Today"
          tagTone="amber"
          icon={<TrendingUp className="h-4 w-4" />}
          onClick={() =>
            openSalesBreakdown(
              "Today's Sales",
              `Sales for ${formatRangeLabel(todayKey, todayKey)}`,
              metrics.todaySalesLines,
            )
          }
        />
        <StatCard
          title="Monthly Sales"
          value={formatPesoExact(metrics.monthlySales)}
          hint={`Total revenue for ${metrics.monthlyLabel}.`}
          tag="Month"
          tagTone="amber"
          icon={<Receipt className="h-4 w-4" />}
          onClick={() =>
            openSalesBreakdown(
              'Monthly Sales',
              `Full month · ${metrics.monthlyLabel}`,
              metrics.monthSalesLines,
            )
          }
        />
        {branchOwner ? (
          <StatCard
            title="Clinic Manager Commission"
            value={formatPesoExact(metrics.managerCommission)}
            hint={`Your 1% on clinic sales in ${rangeLabel} (${formatPesoExact(metrics.periodSales)}).`}
            tag="1%"
            tagTone="emerald"
            icon={<Percent className="h-4 w-4" />}
            onClick={() =>
              openSalesBreakdown(
                'Clinic Manager Commission (1%)',
                `1% of clinic sales · ${rangeLabel}`,
                metrics.rangeSalesLines,
              )
            }
          />
        ) : null}
        {branchOwner ? (
          <StatCard
            title={metrics.isSingleDay ? "Today's Expenses" : 'Period Expenses'}
            value={formatPesoExact(metrics.todayExpenses)}
            hint={expensesHint}
            tag="Costs"
            tagTone="rose"
            icon={<Receipt className="h-4 w-4" />}
            action={
              <Link
                to="/admin/operations/expenses"
                className="text-xs font-semibold text-emerald-800 hover:underline"
              >
                Log expense
              </Link>
            }
          />
        ) : (
          <StatCard
            title="Total Commissions"
            value={formatPesoExact(metrics.commissions)}
            hint={`Estimated staff fees (${Math.round(COMMISSION_RATE * 100)}% of range sales).`}
            tag="Fees"
            tagTone="rose"
            action={
              <Link
                to="/admin/staff/sales"
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700"
              >
                <Plus className="h-3 w-3" /> Details
              </Link>
            }
          />
        )}
        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-[#0A2E26] ring-1 ring-slate-200/80">
              <Wallet className="h-4 w-4" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Cash Flow Snapshot
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200/70">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Beginning
              </p>
              <p className="mt-1.5 font-metric text-lg font-semibold text-slate-900">
                {formatPesoExact(cash.beginning)}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3.5 py-3 ring-1 ring-emerald-100">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800/70">
                Ending
              </p>
              <p className="mt-1.5 font-metric text-lg font-semibold text-emerald-950">
                {formatPesoExact(cash.ending)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Ending = beginning + daily sales − cash expenses
            {cash.expenseCashOut > 0
              ? ` (${formatPesoExact(cash.expenseCashOut)})`
              : ''}
            {cash.manualDeducted > 0
              ? ` − manual deductions (${formatPesoExact(cash.manualDeducted)})`
              : ''}
            {cash.confirmedToday != null ? ' · confirmed' : ''}.
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
            {branchOwner ? (
              <Button type="button" variant="gold" className="rounded-xl" onClick={openDeductCash}>
                <Minus className="mr-1.5 h-3.5 w-3.5" />
                Deduct Cash
              </Button>
            ) : (
              <Button type="button" variant="gold" className="rounded-xl" onClick={confirmCash}>
                Confirm Cash
              </Button>
            )}
            <Link
              to="/admin/operations/expenses"
              className="text-xs font-semibold text-slate-500 hover:text-emerald-800"
            >
              Log expense
            </Link>
          </div>
        </div>
      </div>

      {/* HQ: Sales by Branch — all clinics */}
      {hqView && !scopeBranchId ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">Sales by Branch</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                All clinics wired in — San Mateo, Cainta, Pasig, Lipa, and franchises.
              </p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#C5A059]">
              {salesByBranch.periodLabel} · All Branches
            </p>
          </div>
          <div className="mt-5 space-y-3.5">
            {salesByBranch.rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
                No branch sales loaded yet.
              </p>
            ) : (
              salesByBranch.rows.map((row) => (
                <div key={row.id} className="grid gap-2 sm:grid-cols-[11rem_1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {row.bookings.toLocaleString()} bookings · {row.clients.toLocaleString()} clients
                    </p>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0A2E26] to-[#C5A059]"
                      style={{ width: `${row.barPct}%` }}
                    />
                  </div>
                  <div className="text-right sm:min-w-[8.5rem]">
                    <p className="font-metric text-sm font-semibold text-slate-900">
                      {formatPesoExact(row.periodSales)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Today {formatPesoExact(row.dailySales)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {/* Birthday banner */}
      <section className="relative overflow-hidden rounded-2xl bg-[#05281F] px-5 py-5 text-white sm:px-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.35)_0%,transparent_70%)]"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Happy Birthday to Our Valued Clients! 🎂
            </h2>
            <p className="mt-1 text-sm font-medium text-[#C5A059]">{branchLabel}</p>
          </div>
          <Gift className="h-12 w-12 text-[#C5A059]" strokeWidth={1.35} />
        </div>
      </section>

      {/* Customer birthdays */}
      <section className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-6">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Customer Birthdays</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Stay connected with your customers on their special day.
          </p>
        </div>
        <BirthdayBlock
          title="Today's Birthdays"
          empty="No customer birthdays today."
          items={customerBirthdays.today}
        />
        <BirthdayBlock
          title="Upcoming Birthdays"
          empty="No upcoming customer birthdays in the next 3 months."
          items={customerBirthdays.upcoming}
        />
      </section>

      {/* Staff birthdays */}
      <section className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-6">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Staff Birthdays</h3>
          <p className="mt-0.5 text-sm text-slate-500">Celebrate your team members.</p>
        </div>
        <BirthdayBlock
          title="Today's Birthdays"
          empty="No staff birthdays today."
          items={staffBirthdays.today}
        />
        <BirthdayBlock
          title="Upcoming Birthdays"
          empty="No upcoming staff birthdays in the next 3 months."
          items={staffBirthdays.upcoming}
        />
      </section>

      <p className="pb-1 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Imajica Medical Aesthetics
      </p>
    </div>
  )
}
