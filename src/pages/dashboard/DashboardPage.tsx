import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CalendarCheck2,
  Cake,
  CreditCard,
  Gift,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import {
  listAppointments,
  subscribeAppointments,
  toDateKey,
} from '@/services/appointmentService'
import { getClients, subscribeClients } from '@/services/clientService'
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

function cashStorageKey(scope: string, dateKey: string) {
  return `imajica_cash_confirm_${scope}_${dateKey}`
}

function readConfirmedCash(scope: string, dateKey: string): number | null {
  try {
    const raw = localStorage.getItem(cashStorageKey(scope, dateKey))
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function writeConfirmedCash(scope: string, dateKey: string, amount: number) {
  localStorage.setItem(cashStorageKey(scope, dateKey), String(amount))
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
}: {
  title: string
  value: string
  hint?: string
  tag?: string
  tagTone?: 'amber' | 'sky' | 'rose' | 'emerald'
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const tagClass = {
    amber: 'bg-amber-100 text-amber-800',
    sky: 'bg-sky-100 text-sky-800',
    rose: 'bg-rose-100 text-rose-700',
    emerald: 'bg-emerald-100 text-emerald-800',
  }[tagTone]

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]',
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
        {hint ? <p className="text-xs leading-snug text-slate-500">{hint}</p> : <span />}
        {action}
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
  const scopeBranchId = forcedBranchId ?? (selectedBranchId === 'all' ? undefined : selectedBranchId)

  const [sales, setSales] = useState<Sale[]>(() => getSales())
  const [clients, setClients] = useState<Client[]>(() => getClients())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [expenses, setExpenses] = useState<OperationalExpense[]>(() => getExpenses())
  const [cashTick, setCashTick] = useState(0)

  useEffect(() => {
    const refreshSales = () => setSales(getSales())
    const refreshClients = () => setClients(getClients())
    const refreshExpenses = () => setExpenses(getExpenses())
    const refreshAppts = () => {
      void listAppointments().then(setAppointments)
    }
    void preloadSalesData().then(refreshSales)
    refreshSales()
    refreshClients()
    refreshExpenses()
    refreshAppts()
    const unsubs = [
      subscribeSalesData(refreshSales),
      subscribeClients(refreshClients),
      subscribeExpenses(refreshExpenses),
      subscribeAppointments(refreshAppts),
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

  const cashScope = scopeBranchId ?? 'all'
  const todayKey = todayDateKey()
  const now = useMemo(() => new Date(), [todayKey])
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

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

  const metrics = useMemo(() => {
    const todaySales = scopedSales.filter((s) => todayDateKey(new Date(s.createdAt)) === todayKey)
    const monthSales = scopedSales.filter((s) => s.createdAt.slice(0, 7) === monthPrefix)
    const dailySales = todaySales.reduce((n, s) => n + (s.totalAmount || 0), 0)
    const monthlySales = monthSales.reduce((n, s) => n + (s.totalAmount || 0), 0)
    const todayExpenseTotal = scopedExpenses
      .filter((e) => e.expenseDate === todayKey && e.status === 'active')
      .reduce((n, e) => n + (e.amount || 0), 0)

    const bookingRows = getBookingRows({ branchId: scopeBranchId })
    const totalAppointments = Math.max(scopedAppts.length, bookingRows.length)
    const todayApptCount = scopedAppts.filter(
      (a) => toDateKey(new Date(a.startAt)) === todayKey,
    ).length
    const todayPaymentsCount = todaySales.length
    const commissions = monthlySales * COMMISSION_RATE

    return {
      totalAppointments,
      todayPaymentsCount: todayPaymentsCount || todayApptCount,
      paymentSummary: dailySales,
      dailySales,
      monthlySales,
      commissions,
      todayExpenses: todayExpenseTotal,
    }
  }, [scopedSales, scopedAppts, scopedExpenses, scopeBranchId, todayKey, monthPrefix])

  const cash = useMemo(() => {
    void cashTick
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yKey = todayDateKey(yesterday)
    const beginning = readConfirmedCash(cashScope, yKey) ?? 0
    const ending = beginning + metrics.dailySales - metrics.todayExpenses
    const confirmedToday = readConfirmedCash(cashScope, todayKey)
    return { beginning, ending, confirmedToday }
  }, [cashScope, todayKey, metrics.dailySales, metrics.todayExpenses, cashTick])

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

  return (
    <div className="-mx-1 space-y-6 sm:mx-0">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-2xl bg-[#05281F] text-white shadow-[0_16px_40px_rgba(5,40,31,0.28)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.28)_0%,transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C5A059]/50 to-transparent"
        />
        <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C5A059]">
              Daily operations
            </p>
            <h1 className="mt-1.5 text-[1.65rem] font-semibold leading-tight tracking-tight text-white sm:text-[1.9rem]">
              Welcome back, {user?.fullName ?? 'Team'}!
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Here is your daily summary, branch performance metrics, and operational highlights.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C5A059]">
                Branch
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">{branchLabel}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics row 1 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Appointments"
          value={metrics.totalAppointments.toLocaleString()}
          hint="Bookings closed and ready for review."
          tag="Booking"
          tagTone="amber"
          icon={<CalendarCheck2 className="h-4 w-4" />}
        />
        <StatCard
          title="Today's Payments"
          value={String(metrics.todayPaymentsCount)}
          hint="Payment transactions recorded today."
          tag="Today"
          tagTone="sky"
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatCard
          title="Payment Summary"
          value={formatPesoExact(metrics.paymentSummary)}
          hint="Current payment balance summary."
          icon={<Wallet className="h-4 w-4" />}
          action={
            <Link
              to="/admin/payments"
              className="text-xs font-semibold text-emerald-800 hover:underline"
            >
              View All
            </Link>
          }
        />
        <StatCard
          title="Daily Sales"
          value={formatPesoExact(metrics.dailySales)}
          hint="Today's total service sales."
          tag="Revenue"
          tagTone="amber"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Metrics row 2 */}
      <div className="grid gap-3 lg:grid-cols-3">
        <StatCard
          title="Monthly Sales"
          value={formatPesoExact(metrics.monthlySales)}
          hint="Total revenue for the current month."
          icon={<Receipt className="h-4 w-4" />}
        />
        <StatCard
          title="Total Commissions"
          value={formatPesoExact(metrics.commissions)}
          hint={`Estimated staff fees (${Math.round(COMMISSION_RATE * 100)}% of monthly sales).`}
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
        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-[#0A2E26] ring-1 ring-slate-200/80">
              <Wallet className="h-4 w-4" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Cash Drawer Summary
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
            Ending = beginning + daily sales − today&apos;s expenses
            {cash.confirmedToday != null ? ' · confirmed' : ''}.
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
            <Button type="button" variant="gold" className="rounded-xl" onClick={confirmCash}>
              Confirm Cash
            </Button>
            <Link
              to="/admin/operations/expenses"
              className="text-xs font-semibold text-slate-500 hover:text-emerald-800"
            >
              Log expense
            </Link>
          </div>
        </div>
      </div>

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
