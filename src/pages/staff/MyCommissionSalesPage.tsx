import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BookingSummaryModal } from '@/components/booking/BookingSummaryModal'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import {
  getBookingRows,
  getSalesForBooking,
  preloadSalesData,
  subscribeSalesData,
  type TodayBookingRow,
} from '@/services/salesService'
import { formatPeso, formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'
import {
  CalendarDays,
  Flag,
  Package,
  Percent,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import { listMyAttendance, subscribeAttendance } from '@/services/attendanceService'
import {
  ATTENDANCE_INCENTIVE_AMOUNT,
  computeMonthlyAttendanceIncentive,
  type MonthlyAttendanceIncentive,
} from '@/services/payrollAttendanceService'
import {
  currentPeriodMonth,
  formatPeriodMonthLabel,
  preloadPlanBIncentives,
  subscribePlanBIncentives,
  sumPlanBForStaff,
} from '@/services/planBIncentiveService'
import { getDirectoryStaff, matchesStaffBranch } from '@/services/staffDirectoryService'
import { getAccessUsers } from '@/services/userAccessService'
import type { AttendancePunch } from '@/types'

/** Staff take-home commission on tagged sales */
const STAFF_COMMISSION_RATE = 0.005
/** Branch sales goal shown on The 2M Milestone card */
const BRANCH_SALES_MILESTONE = 2_000_000
/** After ₱2M is hit, 1% of branch paid sales is split across the whole branch team */
const MILESTONE_SPLIT_RATE = 0.01

/** Active branch teammates (staff + branch manager) who share the 2M split. */
function countBranchTeamShare(branchId: string | undefined): number {
  if (!branchId) return 1
  const ids = new Set<string>()
  for (const s of getDirectoryStaff()) {
    if (s.status !== 'active') continue
    if (!matchesStaffBranch(s, branchId)) continue
    ids.add(s.email?.trim().toLowerCase() || s.id)
  }
  for (const u of getAccessUsers()) {
    if (u.status !== 'active') continue
    if (!u.branchId || !matchesStaffBranch(u, branchId)) continue
    // Clinical / ops staff + branch managers share the pool
    if (
      u.role === 'BRANCH_ADMIN' ||
      u.role === 'DOCTOR' ||
      u.role === 'NURSE' ||
      u.role === 'AESTHETICIAN' ||
      u.role === 'RECEPTIONIST' ||
      u.role === 'STAFF'
    ) {
      ids.add(u.email?.trim().toLowerCase() || u.id)
    }
  }
  return Math.max(1, ids.size)
}

const ALL_PRODUCTS = 'all'

function normalizePersonName(value: string | undefined | null) {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(dr\.?|dra\.?)\s+/i, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Match checkout STAFF tag to the logged-in account (handles middle names / initials). */
function staffNamesMatch(accountName: string, saleStaffName: string) {
  const a = normalizePersonName(accountName)
  const b = normalizePersonName(saleStaffName)
  if (!a || !b || b === '-') return false
  if (a === b) return true
  const aParts = a.split(' ')
  const bParts = b.split(' ')
  const aFirst = aParts[0]
  const aLast = aParts[aParts.length - 1]
  const bFirst = bParts[0]
  const bLast = bParts[bParts.length - 1]
  return Boolean(aFirst && aLast && bFirst && bLast && aFirst === bFirst && aLast === bLast)
}

function localDateKey(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function manilaTodayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Default calendar window: first day of current Manila month → today */
function defaultMonthRange() {
  const to = manilaTodayKey()
  const [y, m] = to.split('-')
  return { from: `${y}-${m}-01`, to }
}

function formatBookingDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatRangeLabel(from: string, to: string) {
  const a = formatShortDate(`${from}T00:00:00`)
  const b = formatShortDate(`${to}T00:00:00`)
  return a === b ? a : `${a} – ${b}`
}

function productKey(name: string) {
  return name.trim().toLowerCase()
}

function bookingHasProduct(bookingKey: string, selectedProduct: string) {
  if (selectedProduct === ALL_PRODUCTS) return true
  const target = productKey(selectedProduct)
  return getSalesForBooking(bookingKey).some(
    (l) => l.itemType === 'product' && productKey(l.treatmentOrPackage || '') === target,
  )
}

/** Amount credited for KPI/graph under current product filter. */
function creditedAmount(row: TodayBookingRow, selectedProduct: string) {
  if (selectedProduct === ALL_PRODUCTS) return row.payment
  const target = productKey(selectedProduct)
  return getSalesForBooking(row.bookingKey)
    .filter((l) => l.itemType === 'product' && productKey(l.treatmentOrPackage || '') === target)
    .reduce((sum, l) => sum + (l.totalAmount || 0), 0)
}

type ProductSoldRow = {
  name: string
  units: number
  revenue: number
  commission: number
}

export function MyCommissionSalesPage() {
  const { user } = useAuth()
  const initialRange = defaultMonthRange()
  const rate = STAFF_COMMISSION_RATE
  const ownerName = user?.fullName?.trim() || 'Your account'
  const [fromDraft, setFromDraft] = useState(initialRange.from)
  const [toDraft, setToDraft] = useState(initialRange.to)
  const [productDraft, setProductDraft] = useState(ALL_PRODUCTS)
  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)
  const [product, setProduct] = useState(ALL_PRODUCTS)
  const [tick, setTick] = useState(0)
  const [loading, setLoading] = useState(true)
  const [viewRow, setViewRow] = useState<TodayBookingRow | null>(null)
  const [attendancePunches, setAttendancePunches] = useState<AttendancePunch[]>([])

  useEffect(() => {
    let cancelled = false
    void preloadSalesData().then(() => {
      if (!cancelled) {
        setTick((n) => n + 1)
        setLoading(false)
      }
    })
    return subscribeSalesData(() => setTick((n) => n + 1))
  }, [])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function loadAttendance() {
      try {
        const rows = await listMyAttendance(user!.id)
        if (!cancelled) setAttendancePunches(rows)
      } catch {
        if (!cancelled) setAttendancePunches([])
      }
    }
    void loadAttendance()
    return subscribeAttendance(() => {
      void loadAttendance()
    })
  }, [user?.id])

  useEffect(() => {
    void preloadPlanBIncentives()
    return subscribePlanBIncentives(() => setTick((n) => n + 1))
  }, [])

  /** All checkout bookings tagged to this staff (no date/product yet). */
  const staffBookings = useMemo(() => {
    void tick
    if (!user?.fullName) return []
    return getBookingRows().filter((row) => staffNamesMatch(user.fullName, row.staffName))
  }, [tick, user])

  /** Product options from this staff's sales (any date). */
  const productOptions = useMemo(() => {
    const names = new Map<string, string>()
    for (const row of staffBookings) {
      for (const line of getSalesForBooking(row.bookingKey)) {
        if (line.itemType !== 'product') continue
        const name = (line.treatmentOrPackage || '').trim()
        if (!name) continue
        names.set(productKey(name), name)
      }
    }
    return [...names.values()].sort((a, b) => a.localeCompare(b))
  }, [staffBookings])

  /** Cards, graph, and tables — calendar range + product selection. */
  const filteredBookings = useMemo(() => {
    return staffBookings.filter((row) => {
      const day = localDateKey(row.dateIso)
      if (from && day < from) return false
      if (to && day > to) return false
      if (!bookingHasProduct(row.bookingKey, product)) return false
      return true
    })
  }, [staffBookings, from, to, product])

  const summary = useMemo(() => {
    const paidRows = filteredBookings.filter((r) => r.status === 'Paid')
    const paidSales = paidRows.reduce((sum, r) => sum + creditedAmount(r, product), 0)
    const commission = Math.round(paidSales * rate * 100) / 100
    const productBookings = filteredBookings.filter((r) => r.products !== 'N/A').length
    return {
      bookings: filteredBookings.length,
      paidSales,
      commission,
      productBookings,
      pendingCount: filteredBookings.filter((r) => r.status === 'Pending').length,
    }
  }, [filteredBookings, product, rate])

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; mySales: number; myCommission: number }>()
    for (const row of filteredBookings) {
      if (row.status !== 'Paid') continue
      const key = localDateKey(row.dateIso)
      if (!key) continue
      if (from && key < from) continue
      if (to && key > to) continue
      const amount = creditedAmount(row, product)
      if (amount <= 0) continue
      const existing = map.get(key)
      if (existing) {
        existing.mySales += amount
        existing.myCommission = Math.round(existing.mySales * rate * 100) / 100
      } else {
        map.set(key, {
          date: key,
          mySales: amount,
          myCommission: Math.round(amount * rate * 100) / 100,
        })
      }
    }
    return [...map.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({
        ...row,
        label: formatShortDate(`${row.date}T00:00:00`),
      }))
  }, [filteredBookings, from, to, product, rate])

  const productsSold = useMemo(() => {
    const map = new Map<string, ProductSoldRow>()
    for (const booking of filteredBookings) {
      const lines = getSalesForBooking(booking.bookingKey).filter((l) => {
        if (l.itemType !== 'product') return false
        if (product === ALL_PRODUCTS) return true
        return productKey(l.treatmentOrPackage || '') === productKey(product)
      })
      for (const line of lines) {
        const name = (line.treatmentOrPackage || 'Product').trim()
        const units = Math.max(1, line.quantity ?? 1)
        const revenue = line.totalAmount || 0
        const existing = map.get(productKey(name))
        if (existing) {
          existing.units += units
          existing.revenue += revenue
          existing.commission = Math.round(existing.revenue * rate * 100) / 100
        } else {
          map.set(productKey(name), {
            name,
            units,
            revenue,
            commission: Math.round(revenue * rate * 100) / 100,
          })
        }
      }
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue)
  }, [filteredBookings, product, rate])

  const totalProductSold = useMemo(
    () => productsSold.reduce((sum, p) => sum + p.units, 0),
    [productsSold],
  )

  /** Monthly incentive uses the month of the applied calendar filter (To date). */
  const attendanceIncentive = useMemo((): MonthlyAttendanceIncentive => {
    return computeMonthlyAttendanceIncentive(attendancePunches, to || from)
  }, [attendancePunches, from, to])

  const planBPeriodMonth = useMemo(() => {
    const anchor = to || from || currentPeriodMonth()
    return anchor.slice(0, 7)
  }, [from, to])

  const planBAmount = useMemo(() => {
    void tick
    if (!user) return 0
    return sumPlanBForStaff({
      staffUserId: user.id,
      staffName: user.fullName,
      periodMonth: planBPeriodMonth,
    })
  }, [tick, user, planBPeriodMonth])

  /** Whole-branch paid sales for the selected month vs ₱2M milestone + 1% team split. */
  const branchMilestone = useMemo(() => {
    void tick
    const branchId = user?.branchId
    const month = planBPeriodMonth
    const teamSize = countBranchTeamShare(branchId)
    if (!branchId || !month) {
      return {
        sales: 0,
        remaining: BRANCH_SALES_MILESTONE,
        pct: 0,
        reached: false,
        monthLabel: formatPeriodMonthLabel(month || currentPeriodMonth()),
        branchName: user?.branchName || 'Your branch',
        teamSize,
        splitPool: 0,
        splitShare: 0,
      }
    }
    const [y, m] = month.split('-').map(Number)
    const lastDay = new Date(Date.UTC(y!, m!, 0)).getUTCDate()
    const monthFrom = `${month}-01`
    const monthTo = `${month}-${String(lastDay).padStart(2, '0')}`

    const sales = getBookingRows({ branchId })
      .filter((row) => {
        if (row.status !== 'Paid') return false
        const day = localDateKey(row.dateIso)
        return day >= monthFrom && day <= monthTo
      })
      .reduce((sum, row) => sum + row.payment, 0)

    const remaining = Math.max(0, BRANCH_SALES_MILESTONE - sales)
    const pct = Math.min(100, Math.round((sales / BRANCH_SALES_MILESTONE) * 1000) / 10)
    const reached = sales >= BRANCH_SALES_MILESTONE
    const splitPool = reached ? Math.round(sales * MILESTONE_SPLIT_RATE * 100) / 100 : 0
    const splitShare = reached ? Math.round((splitPool / teamSize) * 100) / 100 : 0
    return {
      sales,
      remaining,
      pct,
      reached,
      monthLabel: formatPeriodMonthLabel(month),
      branchName: user?.branchName || 'Your branch',
      teamSize,
      splitPool,
      splitShare,
    }
  }, [tick, user?.branchId, user?.branchName, planBPeriodMonth])

  const filterLabel = useMemo(() => {
    const dates = formatRangeLabel(from, to)
    const prod = product === ALL_PRODUCTS ? 'All products' : product
    return `${dates} · ${prod}`
  }, [from, to, product])

  function applyFilters() {
    setFrom(fromDraft)
    setTo(toDraft)
    setProduct(productDraft)
  }

  function resetFilters() {
    const next = defaultMonthRange()
    setFromDraft(next.from)
    setToDraft(next.to)
    setProductDraft(ALL_PRODUCTS)
    setFrom(next.from)
    setTo(next.to)
    setProduct(ALL_PRODUCTS)
  }

  function applyProductShortcut(name: string) {
    setProductDraft(name)
    setProduct(name)
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="My Commission & Sales"
        description={`Your tagged checkout sales with ${(STAFF_COMMISSION_RATE * 100).toFixed(1)}% staff commission — filter by date and product.`}
      />

      <BookingSummaryModal
        open={Boolean(viewRow)}
        row={viewRow}
        onClose={() => setViewRow(null)}
      />

      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-ui">
            Staff account
          </span>
          <Badge variant="success">{ownerName}</Badge>
          {user?.branchName ? <Badge variant="neutral">{user.branchName}</Badge> : null}
          <Badge variant="neutral">{filterLabel}</Badge>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-ui">
            From
            <input
              type="date"
              value={fromDraft}
              max={toDraft || undefined}
              onChange={(e) => setFromDraft(e.target.value)}
              className="mt-1 block min-w-[160px] rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-ui">
            To
            <input
              type="date"
              value={toDraft}
              min={fromDraft || undefined}
              onChange={(e) => setToDraft(e.target.value)}
              className="mt-1 block min-w-[160px] rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-ui">
            Product
            <select
              value={productDraft}
              onChange={(e) => setProductDraft(e.target.value)}
              className="mt-1 block min-w-[220px] rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
            >
              <option value={ALL_PRODUCTS}>All products</option>
              {productOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" onClick={applyFilters} className="min-w-[110px]">
            Filter
          </Button>
          <Button type="button" variant="secondary" onClick={resetFilters}>
            This month
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-ui">
          Choose dates and product, then click Filter to update the cards, graph, and tables.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="My Paid Sales"
          value={formatPesoExact(summary.paidSales)}
          subtext={filterLabel}
          icon={<Wallet className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="My Commission"
          value={formatPesoExact(summary.commission)}
          subtext={`${(rate * 100).toFixed(1)}% · ${filterLabel}`}
          icon={<Percent className="h-5 w-5" />}
          tone="gold"
        />
        <StatCard
          label="My Bookings"
          value={String(summary.bookings)}
          subtext={summary.pendingCount ? `${summary.pendingCount} pending` : filterLabel}
          icon={<CalendarDays className="h-5 w-5" />}
          tone="cream"
        />
        <StatCard
          label="Product Checkouts"
          value={String(summary.productBookings)}
          subtext={`${productsSold.length} unique products`}
          icon={<Package className="h-5 w-5" />}
          tone="sage"
        />
        <StatCard
          label="Total Product Sold"
          value={String(totalProductSold)}
          subtext={filterLabel}
          icon={<ShoppingBag className="h-5 w-5" />}
          tone="copper"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Attendance Incentives"
          value={formatPesoExact(attendanceIncentive.amount)}
          subtext={
            attendanceIncentive.eligible
              ? `₱${ATTENDANCE_INCENTIVE_AMOUNT.toLocaleString('en-PH')} · no lates / no absences · ${attendanceIncentive.monthLabel}`
              : `${attendanceIncentive.lateDays} late · ${attendanceIncentive.absentDays} absent · ${attendanceIncentive.monthLabel}`
          }
          icon={<Sparkles className="h-5 w-5" />}
          tone={attendanceIncentive.eligible ? 'incentive' : 'incentiveMuted'}
        />
        <StatCard
          label="Plan B Incentive"
          value={formatPesoExact(planBAmount)}
          subtext="Pass the KPI set by the branch"
          icon={<Trophy className="h-5 w-5" />}
          tone={planBAmount > 0 ? 'planb' : 'incentiveMuted'}
        />
        <StatCard
          label="2M Split Commission"
          value={formatPesoExact(branchMilestone.splitShare)}
          subtext={
            branchMilestone.reached
              ? `1% of branch sales ÷ ${branchMilestone.teamSize} teammates · pool ${formatPesoExact(branchMilestone.splitPool)}`
              : `Unlocks at ₱2M · 1% split for the whole team (incl. manager)`
          }
          icon={<Users className="h-5 w-5" />}
          tone={branchMilestone.reached ? 'milestone' : 'incentiveMuted'}
          className="sm:col-span-2 xl:col-span-1"
        />
      </div>

      <MilestoneCard
        branchName={branchMilestone.branchName}
        monthLabel={branchMilestone.monthLabel}
        sales={branchMilestone.sales}
        remaining={branchMilestone.remaining}
        pct={branchMilestone.pct}
        reached={branchMilestone.reached}
        teamSize={branchMilestone.teamSize}
        splitPool={branchMilestone.splitPool}
        splitShare={branchMilestone.splitShare}
      />

      <Card className="p-4 sm:p-5">
        <CardHeader
          title={`${ownerName}'s paid sales & commission`}
          description={`Timeline: ${filterLabel}`}
        />
        <div className="mt-2 h-72">
          {loading ? (
            <p className="flex h-full items-center justify-center text-sm text-slate-ui">
              Loading your checkout sales…
            </p>
          ) : chartData.length === 0 ? (
            <p className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-ui">
              No paid checkouts for {ownerName} in {filterLabel}.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="sales"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    `₱${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`
                  }
                />
                <YAxis
                  yAxisId="commission"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₱${v}`}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatPeso(Number(value)),
                    name === 'mySales'
                      ? 'My Paid Sales'
                      : name === 'myCommission'
                        ? 'My Commission'
                        : String(name),
                  ]}
                />
                <Legend />
                <Bar
                  yAxisId="sales"
                  dataKey="mySales"
                  fill="#0A2E26"
                  name="My Paid Sales"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
                <Line
                  yAxisId="commission"
                  type="monotone"
                  dataKey="myCommission"
                  stroke="#C5A059"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#C5A059' }}
                  name="My Commission"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-[#0a0a0a]">My checkout bookings</h2>
            <p className="mt-0.5 text-xs text-slate-ui">{filterLabel}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-[#faf9f7]">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                    Booking
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                    Products
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                    Services
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                    Status
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-ui">
                      Loading…
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-ui">
                      No checkout bookings for {filterLabel}.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((row) => (
                    <tr
                      key={row.bookingKey}
                      className="cursor-pointer border-t border-border/60 hover:bg-[#f7f5f0]/80"
                      onClick={() => setViewRow(row)}
                    >
                      <td className="px-4 py-3 font-medium tabular-nums text-[#073D2C]">
                        {row.bookingId}
                      </td>
                      <td className="px-4 py-3 text-[#0a0a0a]">{row.patientName}</td>
                      <td className="max-w-[180px] px-4 py-3 text-xs text-slate-ui">
                        {row.products}
                      </td>
                      <td className="max-w-[180px] px-4 py-3 text-xs text-slate-ui">
                        {row.services}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#0a0a0a]">
                        {formatPesoExact(
                          product === ALL_PRODUCTS ? row.payment : creditedAmount(row, product),
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.status === 'Paid' ? (
                          <Badge variant="success">Paid</Badge>
                        ) : row.status === 'Pending' ? (
                          <Badge variant="warning">Pending</Badge>
                        ) : (
                          <Badge variant="neutral">{row.status}</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-ui">
                        {formatBookingDate(row.dateIso)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-[#0a0a0a]">Products I sold</h2>
            <p className="mt-0.5 text-xs text-slate-ui">{filterLabel}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-[#faf9f7]">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                    Sales
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                    Comm.
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-ui">
                      Loading…
                    </td>
                  </tr>
                ) : productsSold.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-ui">
                      No products for {filterLabel}.
                    </td>
                  </tr>
                ) : (
                  productsSold.map((p) => (
                    <tr
                      key={p.name}
                      className="cursor-pointer border-t border-border/60 hover:bg-[#f7f5f0]/80"
                      onClick={() => applyProductShortcut(p.name)}
                    >
                      <td className="px-4 py-3 text-[#0a0a0a]">{p.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-ui">{p.units}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#0a0a0a]">
                        {formatPesoExact(p.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#C5A059]">
                        {formatPesoExact(p.commission)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

function MilestoneCard({
  branchName,
  monthLabel,
  sales,
  remaining,
  pct,
  reached,
  teamSize,
  splitPool,
  splitShare,
}: {
  branchName: string
  monthLabel: string
  sales: number
  remaining: number
  pct: number
  reached: boolean
  teamSize: number
  splitPool: number
  splitShare: number
}) {
  return (
    <div className="rounded-[14px] border border-[#C5A059]/40 bg-gradient-to-br from-[#FFFDF8] via-[#F8F0DE] to-[#E8D5A3] p-4 shadow-[0_12px_28px_rgba(197,160,89,0.2)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b5420]">
            The 2M Milestone
          </p>
          <p className="mt-2 font-metric text-2xl font-semibold text-[#0A2E26] sm:text-3xl">
            {formatPesoExact(sales)}
            <span className="ml-2 text-base font-medium text-[#6b5420] sm:text-lg">
              / {formatPesoExact(BRANCH_SALES_MILESTONE)}
            </span>
          </p>
          <p className="mt-1 text-xs text-[#6b5420]">
            {branchName} · {monthLabel} branch paid sales
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#8a6a20]">
          <Flag className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-[#6b5420]">
          <span>{pct}% of ₱2M</span>
          <span>
            {reached
              ? 'Milestone reached — 1% team split unlocked!'
              : `${formatPesoExact(remaining)} left to hit ₱2M`}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/70 shadow-inner">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              reached
                ? 'bg-gradient-to-r from-[#0A2E26] to-[#2F9E6E]'
                : 'bg-gradient-to-r from-[#C5A059] to-[#0A2E26]',
            )}
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[#6b5420]/90">
          {reached
            ? `1% pool ${formatPesoExact(splitPool)} split across ${teamSize} teammates (incl. branch manager) — your share ${formatPesoExact(splitShare)}.`
            : 'Hit ₱2M and the branch unlocks a 1% commission pool split equally across the whole team, including the branch manager.'}
        </p>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  tone,
  className,
}: {
  label: string
  value: string
  subtext?: string
  icon: ReactNode
  tone:
    | 'emerald'
    | 'gold'
    | 'cream'
    | 'sage'
    | 'copper'
    | 'incentive'
    | 'incentiveMuted'
    | 'planb'
    | 'milestone'
  className?: string
}) {
  const tones = {
    emerald: {
      card: 'border-[#0A2E26]/15 bg-gradient-to-br from-[#0A2E26] to-[#145c45] text-white shadow-[0_10px_28px_rgba(10,46,38,0.22)]',
      label: 'text-white/70',
      value: 'text-white',
      sub: 'text-white/65',
      iconWrap: 'bg-white/15 text-[#E8C547]',
    },
    gold: {
      card: 'border-[#C5A059]/35 bg-gradient-to-br from-[#F7E7C1] via-[#F3D898] to-[#C5A059] text-[#3d2e0f] shadow-[0_10px_28px_rgba(197,160,89,0.28)]',
      label: 'text-[#6b5420]',
      value: 'text-[#2f230a]',
      sub: 'text-[#6b5420]/90',
      iconWrap: 'bg-white/55 text-[#8a6a20]',
    },
    cream: {
      card: 'border-[#e8dfcf] bg-gradient-to-br from-[#FFFDF8] via-[#F7F1E6] to-[#EDE3D0] text-[#0a0a0a] shadow-[0_8px_22px_rgba(120,90,40,0.1)]',
      label: 'text-[#7a6a52]',
      value: 'text-[#073D2C]',
      sub: 'text-[#8a7a62]',
      iconWrap: 'bg-[#073D2C]/10 text-[#073D2C]',
    },
    sage: {
      card: 'border-[#9fc5b5]/50 bg-gradient-to-br from-[#E8F5EF] via-[#D5EDE3] to-[#9fc5b5] text-[#0A2E26] shadow-[0_8px_22px_rgba(10,46,38,0.12)]',
      label: 'text-[#2f6b55]',
      value: 'text-[#0A2E26]',
      sub: 'text-[#3d7a64]',
      iconWrap: 'bg-white/70 text-[#0A2E26]',
    },
    copper: {
      card: 'border-[#d4a574]/45 bg-gradient-to-br from-[#FFF4EB] via-[#F0C9A8] to-[#D4896A] text-[#4a2c1a] shadow-[0_10px_28px_rgba(212,137,106,0.28)]',
      label: 'text-[#8a4f30]',
      value: 'text-[#3d2416]',
      sub: 'text-[#8a4f30]/90',
      iconWrap: 'bg-white/60 text-[#9a5535]',
    },
    incentive: {
      card: 'border-[#7ec8a3]/50 bg-gradient-to-br from-[#EFFFF6] via-[#B8EBD0] to-[#2F9E6E] text-[#0A2E26] shadow-[0_12px_30px_rgba(47,158,110,0.25)]',
      label: 'text-[#1f6b4a]',
      value: 'text-[#0A2E26]',
      sub: 'text-[#1f6b4a]/95',
      iconWrap: 'bg-white/70 text-[#0A2E26]',
    },
    incentiveMuted: {
      card: 'border-border/80 bg-gradient-to-br from-[#f4f4f5] via-[#e7e7ea] to-[#d4d4d8] text-[#3f3f46] shadow-[0_8px_20px_rgba(63,63,70,0.1)]',
      label: 'text-[#71717a]',
      value: 'text-[#3f3f46]',
      sub: 'text-[#71717a]',
      iconWrap: 'bg-white/70 text-[#71717a]',
    },
    planb: {
      card: 'border-[#8b6bb8]/40 bg-gradient-to-br from-[#F6F0FF] via-[#D9C6F5] to-[#8B6BB8] text-[#2d1b4e] shadow-[0_12px_30px_rgba(139,107,184,0.28)]',
      label: 'text-[#5b3d8a]',
      value: 'text-[#2d1b4e]',
      sub: 'text-[#5b3d8a]/95',
      iconWrap: 'bg-white/65 text-[#5b3d8a]',
    },
    milestone: {
      card: 'border-[#C5A059]/45 bg-gradient-to-br from-[#FFFDF8] via-[#F3E6C8] to-[#C5A059] text-[#2f230a] shadow-[0_12px_30px_rgba(197,160,89,0.3)]',
      label: 'text-[#6b5420]',
      value: 'text-[#0A2E26]',
      sub: 'text-[#6b5420]/95',
      iconWrap: 'bg-white/65 text-[#8a6a20]',
    },
  } as const

  const t = tones[tone]

  return (
    <div
      className={cn(
        'rounded-[14px] border p-4 transition-transform duration-200 hover:-translate-y-0.5',
        t.card,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-xs font-semibold uppercase tracking-wide', t.label)}>{label}</p>
          <p className={cn('mt-2 truncate font-metric text-2xl font-semibold sm:text-3xl', t.value)}>
            {value}
          </p>
          {subtext ? <p className={cn('mt-1 line-clamp-2 text-xs', t.sub)}>{subtext}</p> : null}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', t.iconWrap)}>
          {icon}
        </div>
      </div>
    </div>
  )
}
