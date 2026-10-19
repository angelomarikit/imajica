import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Flag,
  Search,
  Users,
  Wallet,
} from 'lucide-react'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import {
  BRANCH_SALES_MILESTONE,
  MILESTONE_PAYOUT_DAY,
  MILESTONE_SPLIT_RATE,
} from '@/constants/payrollIncentives'
import {
  listAttendanceForBranches,
  subscribeAttendance,
} from '@/services/attendanceService'
import {
  currentPeriodMonth,
  formatPeriodMonthLabel,
} from '@/services/planBIncentiveService'
import { preloadSalesData, subscribeSalesData } from '@/services/salesService'
import {
  listBranchMilestoneTracker,
  type MilestoneTrackerMember,
} from '@/services/staffCommissionService'
import { preloadAccessUsers, subscribeAccessUsers } from '@/services/userAccessService'
import {
  canAccessPeopleOps,
  isAnyMarketingRole,
  isBranchOwner,
  isHqRole,
} from '@/utils/franchiseAccess'
import { formatPesoExact } from '@/utils/currency'
import { formatRoleLabel } from '@/utils/roleLabels'
import { cn } from '@/utils/cn'
import type { AttendancePunch } from '@/types'

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

const PROCESS_STEPS = [
  {
    title: 'Branch sales',
    detail: 'Sum paid clinic-recognized sales for the month (doctor’s procedure uses clinic net).',
  },
  {
    title: 'One 1% pool',
    detail:
      'At ₱2M, the branch opens a single shared pool = 1% of that month’s paid sales — not 1% for each person.',
  },
  {
    title: 'Spread by day',
    detail: 'That one pool is carved by day: (day sales ÷ month sales) × pool.',
  },
  {
    title: 'Share among present',
    detail:
      'Each day’s slice is split equally among teammates who Time In. No Time In → ₱0 that day.',
  },
  {
    title: 'Your total',
    detail: 'Your commission is only your piece of the shared pool (sum of day shares).',
  },
] as const

export function Milestone2MPage() {
  const { user } = useAuth()
  const { branches } = useBranch()
  const orgWide =
    canAccessPeopleOps(user) || isHqRole(user?.role) || isAnyMarketingRole(user?.role)
  const clinicLocked = isBranchOwner(user) || Boolean(user?.branchId && !orgWide)

  const clinics = useMemo(
    () =>
      branches
        .filter((b) => b.status === 'active' && b.branchType !== 'warehouse')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [branches],
  )

  const [periodMonth, setPeriodMonth] = useState(currentPeriodMonth)
  const [branchId, setBranchId] = useState(() => {
    if (clinicLocked && user?.branchId) return user.branchId
    return clinics[0]?.id || ''
  })
  const [query, setQuery] = useState('')
  const [tick, setTick] = useState(0)
  const [loading, setLoading] = useState(true)
  const [branchPunches, setBranchPunches] = useState<AttendancePunch[]>([])

  useEffect(() => {
    if (clinicLocked && user?.branchId) {
      setBranchId(user.branchId)
      return
    }
    if (!branchId && clinics[0]?.id) setBranchId(clinics[0].id)
  }, [clinicLocked, user?.branchId, clinics, branchId])

  useEffect(() => {
    let cancelled = false
    void Promise.all([preloadSalesData(), preloadAccessUsers()]).then(() => {
      if (!cancelled) {
        setTick((n) => n + 1)
        setLoading(false)
      }
    })
    const unsubSales = subscribeSalesData(() => setTick((n) => n + 1))
    const unsubUsers = subscribeAccessUsers(() => setTick((n) => n + 1))
    return () => {
      cancelled = true
      unsubSales()
      unsubUsers()
    }
  }, [])

  useEffect(() => {
    if (!branchId) {
      setBranchPunches([])
      return
    }
    let cancelled = false
    const [y, m] = periodMonth.split('-').map(Number)
    const monthFrom = `${periodMonth}-01`
    const lastDay = new Date(Date.UTC(y!, m!, 0)).getUTCDate()
    const monthTo = `${periodMonth}-${String(lastDay).padStart(2, '0')}`

    async function load() {
      try {
        const rows = await listAttendanceForBranches([branchId], monthFrom, monthTo)
        if (!cancelled) setBranchPunches(rows)
      } catch {
        if (!cancelled) setBranchPunches([])
      }
    }
    void load()
    return subscribeAttendance(() => {
      void load()
    })
  }, [branchId, periodMonth])

  const tracker = useMemo(() => {
    void tick
    if (!branchId) {
      return {
        milestoneSales: 0,
        milestoneReached: false,
        milestonePool: 0,
        milestoneTeamSize: 0,
        unallocatedPool: 0,
        isProjected: true,
        monthFrom: `${periodMonth}-01`,
        monthTo: `${periodMonth}-01`,
        members: [] as MilestoneTrackerMember[],
      }
    }
    return listBranchMilestoneTracker({
      branchId,
      periodMonth,
      branchPunches,
    })
  }, [tick, branchId, periodMonth, branchPunches])

  const branchName =
    clinics.find((b) => b.id === branchId)?.name ||
    user?.branchName ||
    'Branch'

  const remaining = Math.max(0, BRANCH_SALES_MILESTONE - tracker.milestoneSales)
  const pct = Math.min(
    100,
    Math.round((tracker.milestoneSales / BRANCH_SALES_MILESTONE) * 1000) / 10,
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tracker.members
    return tracker.members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        formatRoleLabel(m.role).toLowerCase().includes(q) ||
        (m.employeeCode || '').toLowerCase().includes(q),
    )
  }, [tracker.members, query])

  const myShare = useMemo(() => {
    if (!user?.id) return null
    return tracker.members.find((m) => m.userId === user.id) || null
  }, [tracker.members, user?.id])

  const poolLabel = tracker.milestoneReached
    ? formatPesoExact(tracker.milestonePool)
    : formatPesoExact(BRANCH_SALES_MILESTONE * MILESTONE_SPLIT_RATE)

  return (
    <div className="space-y-5">
      <AdminPageBanner
        eyebrow="Team incentive"
        title="2M Milestone"
        description="Track your branch toward ₱2M and see how the one shared 1% pool is spread among staff who timed in — not 1% each."
        stat={{
          value: formatPesoExact(tracker.milestoneSales),
          label: `${formatPeriodMonthLabel(periodMonth)} · ${branchName}`,
        }}
      />

      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-ui">Month</span>
          <select
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-charcoal"
          >
            {monthOptions().map((m) => (
              <option key={m} value={m}>
                {formatPeriodMonthLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-ui">Branch</span>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={clinicLocked}
            className="min-w-[12rem] rounded-xl border border-border bg-white px-3 py-2 text-sm text-charcoal disabled:bg-slate-50"
          >
            {clinics.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="relative block min-w-[14rem] flex-1 text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-ui">Search employee</span>
          <Search className="pointer-events-none absolute left-3 top-[2.05rem] h-4 w-4 text-slate-ui" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, role, or code"
            className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm text-charcoal"
          />
        </label>
      </div>

      <Card className="overflow-hidden border-[#C5A059]/35 bg-gradient-to-br from-[#FFFDF8] via-[#F8F0DE] to-[#E8D5A3] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6b5420]">
              Branch progress
            </p>
            <p className="mt-1 font-metric text-2xl font-semibold text-[#0A2E26] sm:text-3xl">
              {formatPesoExact(tracker.milestoneSales)}
              <span className="ml-2 text-base font-medium text-[#6b5420]">
                / {formatPesoExact(BRANCH_SALES_MILESTONE)}
              </span>
            </p>
            <p className="mt-1 text-xs text-[#6b5420]">
              {tracker.milestoneReached
                ? `Unlocked — one shared 1% pool ${formatPesoExact(tracker.milestonePool)} (spread among the team)`
                : `${formatPesoExact(remaining)} left · projected shared pool at unlock ${poolLabel}`}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[#8a6a20]">
            <Flag className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs font-medium text-[#6b5420]">
            <span>{pct}% of ₱2M</span>
            <Badge variant={tracker.milestoneReached ? 'success' : 'warning'}>
              {tracker.milestoneReached ? 'Reached' : 'In progress'}
            </Badge>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/70 shadow-inner">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                tracker.milestoneReached
                  ? 'bg-gradient-to-r from-[#0A2E26] to-[#2F9E6E]'
                  : 'bg-gradient-to-r from-[#C5A059] to-[#0A2E26]',
              )}
              style={{ width: `${Math.max(2, pct)}%` }}
            />
          </div>
        </div>
        {myShare ? (
          <p className="mt-3 rounded-xl bg-white/60 px-3 py-2 text-sm text-[#0A2E26]">
            <Wallet className="mr-1.5 inline h-4 w-4 text-[#C5A059]" />
            Your {tracker.isProjected ? 'estimated' : ''} share:{' '}
            <strong>{formatPesoExact(myShare.share)}</strong>
            {tracker.isProjected ? ' if the branch reaches ₱2M (at current day pattern)' : ''}
            {' · '}
            {myShare.daysTimedIn} day{myShare.daysTimedIn === 1 ? '' : 's'} timed in
          </p>
        ) : null}
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#073D2C]">How the 2M milestone works</h2>
        <p className="mt-1 text-xs text-slate-ui">
          Process from branch sales to your commission — same rules used on payslips and My Commission.
        </p>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-2">
          {PROCESS_STEPS.map((step, idx) => (
            <div key={step.title} className="flex flex-1 items-stretch gap-2">
              <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-[#073D2C]/12 bg-[#f7f5f0]/80 p-3">
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#073D2C] text-xs font-bold text-white">
                  {idx + 1}
                </div>
                <p className="text-sm font-semibold text-[#0A2E26]">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-ui">{step.detail}</p>
              </div>
              {idx < PROCESS_STEPS.length - 1 ? (
                <div className="hidden shrink-0 items-center text-[#C5A059] lg:flex">
                  <ArrowRight className="h-5 w-5" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#073D2C]">Rules & context</h2>
        <ul className="mt-3 space-y-2 text-sm text-charcoal">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C5A059]" />
            <span>
              Target is <strong>₱{BRANCH_SALES_MILESTONE.toLocaleString('en-PH')}</strong> paid
              clinic-recognized sales per branch, per calendar month.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C5A059]" />
            <span>
              One shared pool = <strong>{(MILESTONE_SPLIT_RATE * 100).toFixed(0)}%</strong> of that
              month’s paid sales for the whole team — not 1% per employee. Past ₱2M, that single
              pool grows with sales.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C5A059]" />
            <span>
              That pool is spread by day (proportional to day sales). Only clinic staff + Clinic
              Manager who <strong>Time In</strong> that Manila day split that day’s slice equally.
              Operations Manager is <strong>not</strong> in this pool (they earn 1% org commission
              instead).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C5A059]" />
            <span>
              Share is paid once per month on the <strong>{MILESTONE_PAYOUT_DAY}th</strong> (or the
              last day in shorter months) — not on the 1st–15th salary cut.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C5A059]" />
            <span>
              No Time In = absent for that day’s pool (₱0), even if sales happened. Leave does not
              override — only a Time In punch counts.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C5A059]" />
            <span>
              If a day has sales but nobody timed in, that day’s pool stays{' '}
              <strong>unallocated</strong>
              {tracker.unallocatedPool > 0
                ? ` (currently ${formatPesoExact(tracker.unallocatedPool)})`
                : ''}
              .
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C5A059]" />
            <span>
              Eligible team: clinic staff roles + clinic manager on that branch. Before unlock,
              amounts below are <strong>estimates</strong> as if the branch hits ₱2M with the
              current day-sales pattern.
            </span>
          </li>
        </ul>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#073D2C]" />
            <h2 className="text-sm font-semibold text-[#073D2C]">Employee day-share</h2>
          </div>
          <p className="text-xs text-slate-ui">
            {tracker.isProjected ? 'Estimated at ₱2M unlock · ' : 'Unlocked pool · '}
            {filtered.length} teammate{filtered.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f5f0] text-xs uppercase tracking-wide text-slate-ui">
              <tr>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold text-right">Days timed in</th>
                <th className="px-4 py-3 font-semibold text-right">
                  {tracker.isProjected ? 'Est. share' : 'Share'}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-ui">
                    Loading milestone data…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-ui">
                    No eligible teammates for this branch.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const isMe = m.userId === user?.id
                  return (
                    <tr
                      key={m.userId}
                      className={cn(
                        'border-t border-border/60',
                        isMe ? 'bg-[#073D2C]/[0.04]' : 'hover:bg-[#f7f5f0]/80',
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-charcoal">
                          {m.fullName}
                          {isMe ? (
                            <span className="ml-2 text-[11px] font-semibold text-[#073D2C]">
                              You
                            </span>
                          ) : null}
                        </p>
                        {m.employeeCode ? (
                          <p className="text-[11px] text-slate-ui">Code {m.employeeCode}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-ui">{formatRoleLabel(m.role)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-charcoal">
                        {m.daysTimedIn}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#0A2E26]">
                        {formatPesoExact(m.share)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
