import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  CalendarCheck2,
  ChevronDown,
  ChevronRight,
  Package,
  Percent,
  Search,
  ShoppingBag,
  Sparkles,
  Target,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { getBranches } from '@/services/branchService'
import {
  buildEmployeeKpiRows,
  type EmployeeKpiRow,
  type EmployeeKpiSummary,
} from '@/services/employeeKpiService'
import {
  currentPeriodMonth,
  formatPeriodMonthLabel,
  preloadPlanBIncentives,
  subscribePlanBIncentives,
} from '@/services/planBIncentiveService'
import { preloadSalesData, subscribeSalesData } from '@/services/salesService'
import { preloadAccessUsers, subscribeAccessUsers } from '@/services/userAccessService'
import { formatPeso, formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'

function scoreTone(score: number) {
  if (score >= 75) return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (score >= 50) return 'bg-amber-50 text-amber-900 border-amber-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function monthOptions(count = 8) {
  const out: string[] = []
  const base = currentPeriodMonth()
  const [y, m] = base.split('-').map(Number)
  let year = y!
  let month = m!
  for (let i = 0; i < count; i++) {
    out.push(`${year}-${String(month).padStart(2, '0')}`)
    month -= 1
    if (month < 1) {
      month = 12
      year -= 1
    }
  }
  return out
}

/** Compact page list: 1 … 4 5 6 … 12 */
function kpiPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set<number>([1, total, current, current - 1, current + 1])
  if (current <= 3) {
    pages.add(2)
    pages.add(3)
    pages.add(4)
  }
  if (current >= total - 2) {
    pages.add(total - 1)
    pages.add(total - 2)
    pages.add(total - 3)
  }
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const out: (number | 'ellipsis')[] = []
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]!
    if (i > 0 && n - sorted[i - 1]! > 1) out.push('ellipsis')
    out.push(n)
  }
  return out
}

export function HrKpisPage() {
  const [periodMonth, setPeriodMonth] = useState(currentPeriodMonth)
  const [branchId, setBranchId] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [summary, setSummary] = useState<EmployeeKpiSummary | null>(null)
  const [rows, setRows] = useState<EmployeeKpiRow[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const branches = useMemo(
    () =>
      getBranches().filter((b) => b.status === 'active' && b.branchType !== 'warehouse'),
    [],
  )

  useEffect(() => {
    void preloadSalesData().then(() => setTick((n) => n + 1))
    void preloadPlanBIncentives().then(() => setTick((n) => n + 1))
    void preloadAccessUsers().then(() => setTick((n) => n + 1))
    const unsubSales = subscribeSalesData(() => setTick((n) => n + 1))
    const unsubPlanB = subscribePlanBIncentives(() => setTick((n) => n + 1))
    const unsubUsers = subscribeAccessUsers(() => setTick((n) => n + 1))
    return () => {
      unsubSales()
      unsubPlanB()
      unsubUsers()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void buildEmployeeKpiRows({
      periodMonth,
      branchId: branchId || null,
    }).then(({ summary: s, rows: r }) => {
      if (cancelled) return
      setSummary(s)
      setRows(r)
      setPage(1)
      setExpandedId(null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [periodMonth, branchId, tick])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const hay =
        `${r.fullName} ${r.email} ${r.branchName} ${r.title} ${r.roleLabel} ${r.employeeCode ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageStart = (safePage - 1) * pageSize
  const pageRows = filtered.slice(pageStart, pageStart + pageSize)
  const pageNumbers = useMemo(() => kpiPageNumbers(safePage, pageCount), [safePage, pageCount])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="KPI's and Performance"
        description="Live scorecard from the incentive program — commission, bookings, services, products, attendance, and Plan B — so HR can see how each employee is performing."
        actions={
          <Link to="/admin/plan-b-incentive">
            <Button variant="gold" className="gap-1.5">
              <Award className="h-4 w-4" />
              Plan B Incentive
            </Button>
          </Link>
        }
        stat={
          summary
            ? { value: `${summary.avgPerformanceScore}`, label: 'Avg score' }
            : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Employees scored"
          value={String(summary?.employeeCount ?? 0)}
          subtext={formatPeriodMonthLabel(periodMonth)}
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          label="Paid bookings"
          value={(summary?.totalBookings ?? 0).toLocaleString()}
          subtext="Tagged checkout sales"
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <KpiCard
          label="Commission pool"
          value={formatPeso(summary?.totalCommission ?? 0)}
          subtext="Staff 0.5% / Clinic manager 1%"
          icon={<Percent className="h-5 w-5" />}
        />
        <KpiCard
          label="Plan B + Attendance"
          value={formatPeso((summary?.totalPlanB ?? 0) + (summary?.totalAttendanceIncentives ?? 0))}
          subtext={`${summary?.planBPassCount ?? 0} Plan B · ${summary?.perfectAttendanceCount ?? 0} perfect attendance`}
          icon={<Trophy className="h-5 w-5" />}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-ui">
            Period (incentive month)
            <select
              value={periodMonth}
              onChange={(e) => {
                setPeriodMonth(e.target.value)
                setPage(1)
              }}
              className="mt-1 block min-w-[180px] rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-[#073D2C]"
            >
              {monthOptions().map((m) => (
                <option key={m} value={m}>
                  {formatPeriodMonthLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-ui">
            Branch
            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value)
                setPage(1)
              }}
              className="mt-1 block min-w-[200px] rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-[#073D2C]"
            >
              <option value="">All clinics</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-ui">
            Per page
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="mt-1 block min-w-[100px] rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-[#073D2C]"
            >
              {[10, 15, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search employee, branch, emp #…"
              className="w-full rounded-[10px] border border-border bg-white py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-ui">
          Score blends sales, bookings, service/product mix, attendance discipline, and whether Plan B KPI was awarded.
          Expand a row for line-item and attendance detail.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3 w-8" />
                <th className="px-2 py-3">Rank</th>
                <th className="px-2 py-3">Employee</th>
                <th className="px-2 py-3">Score</th>
                <th className="px-2 py-3">Bookings</th>
                <th className="px-2 py-3">Sales</th>
                <th className="px-2 py-3">Commission</th>
                <th className="px-2 py-3">Services</th>
                <th className="px-2 py-3">Products</th>
                <th className="px-2 py-3">Attendance</th>
                <th className="px-2 py-3">Plan B</th>
                <th className="px-2 py-3">Incentive total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-2 py-10 text-center text-slate-ui">
                    Computing KPI performance…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-2 py-10 text-center text-slate-ui">
                    No employees match this period / filter.
                  </td>
                </tr>
              ) : (
                pageRows.map((row, idx) => {
                  const open = expandedId === row.id
                  const rank = pageStart + idx + 1
                  return (
                    <EmployeeKpiTableRows
                      key={row.id}
                      row={row}
                      rank={rank}
                      open={open}
                      onToggle={() => setExpandedId(open ? null : row.id)}
                    />
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-ui">
          <span>
            Showing {filtered.length === 0 ? 0 : pageStart + 1} to{' '}
            {Math.min(pageStart + pageSize, filtered.length)} of {filtered.length} employees
          </span>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 min-w-8 rounded-[6px] border border-border bg-white px-2 disabled:opacity-40"
              aria-label="Previous page"
            >
              ‹
            </button>
            {pageNumbers.map((item, i) =>
              item === 'ellipsis' ? (
                <span key={`e-${i}`} className="px-1 text-slate-ui">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={cn(
                    'h-8 min-w-8 rounded-[6px] border px-2 font-medium',
                    item === safePage
                      ? 'border-emerald-900 bg-emerald-900 text-white'
                      : 'border-border bg-white hover:bg-ivory-100',
                  )}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="h-8 min-w-8 rounded-[6px] border border-border bg-white px-2 disabled:opacity-40"
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function EmployeeKpiTableRows({
  row,
  rank,
  open,
  onToggle,
}: {
  row: EmployeeKpiRow
  rank: number
  open: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr className="border-t border-border/70 hover:bg-ivory-100">
        <td className="px-2 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#073D2C] hover:bg-white"
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="px-2 py-3 font-semibold text-[#073D2C]">#{rank}</td>
        <td className="px-2 py-3">
          <p className="font-semibold text-[#073D2C]">{row.fullName}</p>
          <p className="text-[11px] text-slate-ui">
            {row.title} · {row.branchName || '—'}
            {row.employeeCode ? ` · #${row.employeeCode}` : ''}
          </p>
        </td>
        <td className="px-2 py-3">
          <span
            className={cn(
              'inline-flex min-w-[3rem] items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-bold',
              scoreTone(row.performanceScore),
            )}
          >
            {row.performanceScore}
          </span>
        </td>
        <td className="px-2 py-3 font-medium">{row.bookingCount}</td>
        <td className="px-2 py-3 font-medium">{formatPesoExact(row.salesAmount)}</td>
        <td className="px-2 py-3">
          <p className="font-medium">{formatPesoExact(row.commission)}</p>
          <p className="text-[10px] text-slate-ui">
            {row.commissionKind === 'clinic_manager' ? '1% clinic' : '0.5% tagged'}
          </p>
        </td>
        <td className="px-2 py-3">
          <p className="font-medium">{row.serviceUnits}</p>
          <p className="text-[10px] text-slate-ui">{formatPesoExact(row.serviceRevenue)}</p>
        </td>
        <td className="px-2 py-3">
          <p className="font-medium">{row.productUnits}</p>
          <p className="text-[10px] text-slate-ui">{formatPesoExact(row.productRevenue)}</p>
        </td>
        <td className="px-2 py-3">
          <p className="font-medium">
            {row.attendance.presentDays}/{row.attendance.scheduledDaysSoFar}d
          </p>
          <p className="text-[10px] text-slate-ui">
            {row.attendance.lateDays} late · {row.attendance.absentDays} absent
          </p>
          {row.attendance.eligible ? (
            <Badge variant="success" className="mt-1">
              Perfect
            </Badge>
          ) : null}
        </td>
        <td className="px-2 py-3">
          <p className={cn('font-semibold', row.planBAmount > 0 ? 'text-emerald-800' : 'text-slate-ui')}>
            {formatPesoExact(row.planBAmount)}
          </p>
          {row.planBAmount > 0 ? (
            <Badge variant="success" className="mt-1">
              KPI met
            </Badge>
          ) : (
            <span className="text-[10px] text-slate-ui">No Plan B</span>
          )}
        </td>
        <td className="px-2 py-3 font-semibold text-[#073D2C]">
          {formatPesoExact(row.totalIncentivePay)}
        </td>
      </tr>
      {open ? (
        <tr className="border-t border-border/40 bg-[#F7F3EA]/70">
          <td colSpan={12} className="px-4 py-4">
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-[12px] border border-border bg-white p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                  <Sparkles className="h-3.5 w-3.5 text-[#C5A059]" />
                  Top services
                </p>
                {row.topServices.length === 0 ? (
                  <p className="text-xs text-slate-ui">No service lines this month.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {row.topServices.map((s) => (
                      <li key={s.name} className="flex justify-between gap-2">
                        <span className="text-[#073D2C]">{s.name}</span>
                        <span className="shrink-0 text-slate-ui">
                          {s.units} · {formatPesoExact(s.revenue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-[12px] border border-border bg-white p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                  <Package className="h-3.5 w-3.5 text-[#C5A059]" />
                  Top products
                </p>
                {row.topProducts.length === 0 ? (
                  <p className="text-xs text-slate-ui">No product lines this month.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {row.topProducts.map((s) => (
                      <li key={s.name} className="flex justify-between gap-2">
                        <span className="text-[#073D2C]">{s.name}</span>
                        <span className="shrink-0 text-slate-ui">
                          {s.units} · {formatPesoExact(s.revenue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-[12px] border border-border bg-white p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                  <Target className="h-3.5 w-3.5 text-[#C5A059]" />
                  Incentive program
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Wallet className="mt-0.5 h-3.5 w-3.5 text-slate-ui" />
                    <span>
                      Commission <strong>{formatPesoExact(row.commission)}</strong>
                      <span className="block text-[11px] text-slate-ui">
                        {row.commissionKind === 'clinic_manager'
                          ? 'Clinic manager 1% of branch paid sales'
                          : 'Staff 0.5% of tagged paid sales'}
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Award className="mt-0.5 h-3.5 w-3.5 text-slate-ui" />
                    <span>
                      Plan B <strong>{formatPesoExact(row.planBAmount)}</strong>
                      <span className="block text-[11px] text-slate-ui">{row.planBNotes}</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CalendarCheck2 className="mt-0.5 h-3.5 w-3.5 text-slate-ui" />
                    <span>
                      Attendance incentive{' '}
                      <strong>{formatPesoExact(row.attendanceIncentive)}</strong>
                      <span className="block text-[11px] text-slate-ui">
                        {row.attendance.monthLabel}: {row.attendance.presentDays} present,{' '}
                        {row.attendance.lateDays} late, {row.attendance.absentDays} absent
                        {row.attendance.eligible ? ' · ₱1,000 perfect attendance' : ''}
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Trophy className="mt-0.5 h-3.5 w-3.5 text-slate-ui" />
                    <span>
                      Branch milestone share{' '}
                      <strong>
                        {row.milestoneReached ? formatPesoExact(row.milestoneShare) : '—'}
                      </strong>
                      <span className="block text-[11px] text-slate-ui">
                        {row.milestoneReached
                          ? '₱2M branch target hit — 1% pool split'
                          : 'Branch has not hit ₱2M milestone this month'}
                      </span>
                    </span>
                  </li>
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={`/admin/staff/${row.id}`}
                    className="text-xs font-semibold text-emerald-900 underline-offset-2 hover:underline"
                  >
                    Employee profile
                  </Link>
                  <Link
                    to="/admin/plan-b-incentive"
                    className="text-xs font-semibold text-emerald-900 underline-offset-2 hover:underline"
                  >
                    Manage Plan B
                  </Link>
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}
