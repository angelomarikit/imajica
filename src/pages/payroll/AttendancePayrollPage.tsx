import { useEffect, useMemo, useState } from 'react'
import {
  Clock,
  FileSpreadsheet,
  Filter,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Navigate } from 'react-router-dom'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { PayslipDocument } from '@/components/payroll/PayslipDocument'
import { useAuth } from '@/contexts/AuthContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { PAYROLL_DEFAULT_SHIFT } from '@/constants/payrollRosterSeed'
import {
  formatManilaTime,
  listAttendanceForBranches,
  listMyAttendance,
  manilaDateKey,
  subscribeAttendance,
} from '@/services/attendanceService'
import { getBranches } from '@/services/branchService'
import {
  computeAttendancePayroll,
  type AttendancePayrollRow,
} from '@/services/payrollAttendanceService'
import {
  savePayrollLeaveAdjustment,
  subscribePayrollLeaveAdjustments,
} from '@/services/payrollLeaveService'
import { subscribeEmployeeHr } from '@/services/staffDirectoryService'
import { subscribePayrollProfiles } from '@/services/payrollProfileService'
import { buildPayslipDocument, type BuiltPayslip } from '@/services/payslipCompute'
import { gatherPayslipIncentives } from '@/services/payslipIncentives'
import {
  deletePayslip,
  listPayslipsForStaff,
  preloadPayslips,
  sendPayslipToEmployee,
  subscribePayslips,
} from '@/services/payslipService'
import { preloadPlanBIncentives, subscribePlanBIncentives } from '@/services/planBIncentiveService'
import { preloadSalesData, subscribeSalesData } from '@/services/salesService'
import { preloadAccessUsers } from '@/services/userAccessService'
import { canAccessPeopleOps, isBranchOwner } from '@/utils/franchiseAccess'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'
import type { AttendancePunch } from '@/types'

/** Default filter = current semi-monthly cut (1–15 or 16–end). */
function defaultMonthRange() {
  const today = manilaDateKey()
  const [y, m, dayStr] = today.split('-')
  const day = Number(dayStr)
  const month = `${y}-${m}`
  const lastDay = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate()
  if (day <= 15) {
    return { from: `${month}-01`, to: `${month}-15` }
  }
  return {
    from: `${month}-16`,
    to: `${month}-${String(lastDay).padStart(2, '0')}`,
  }
}

function statusBadge(row: AttendancePayrollRow) {
  if (!row.matchedUserId) return <Badge variant="warning">No timeclock link</Badge>
  if (row.daysOpen > 0) return <Badge variant="warning">{row.daysOpen} open</Badge>
  if (row.daysAbsent > 0) return <Badge variant="neutral">{row.daysAbsent} absent</Badge>
  return <Badge variant="success">Ready</Badge>
}

function sumIncentives(
  row: AttendancePayrollRow,
  periodFrom: string,
  periodTo: string,
  branchAttendancePunches: AttendancePunch[] = [],
) {
  const branchId = row.employee.branchId
  const branchScoped = branchId
    ? branchAttendancePunches.filter((p) => p.branchId === branchId)
    : branchAttendancePunches
  // Employee punches for attendance incentive (matched timeclock / login id)
  const attendancePunches = row.matchedUserId
    ? branchScoped.filter((p) => p.userId === row.matchedUserId)
    : []
  const inc = gatherPayslipIncentives({
    row,
    periodFrom,
    periodTo,
    attendancePunches,
    branchAttendancePunches: branchScoped,
  })
  const total =
    (inc.staffSalesCommission || 0) +
    (inc.managerCommission || 0) +
    (inc.milestoneShare || 0) +
    (inc.attendanceIncentive || 0) +
    (inc.planBAmount || 0)
  // Absences already zero out gross days — do not list them again in deductions vs net
  const netDeductions = Math.round(
    (row.lateDeduction +
      row.undertimeDeduction +
      row.statutoryTotal +
      (row.benefitsDeduction || 0)) *
      100,
  ) / 100
  return {
    incentives: Math.round(total * 100) / 100,
    staffCommission: inc.staffSalesCommission,
    netDeductions,
    netWithIncentives: Math.round((row.netPay + total) * 100) / 100,
  }
}

/** HQ payroll from Time In / Time Out + spreadsheet daily rates & statutory deductions. */
export function AttendancePayrollPage({
  title = 'Payroll',
  description =
    '1st cut (1–15): basic pay − late/absent + OT. 2nd cut (16–30/31): salary + commissions, incentives, allowance, and monthly statutory/benefits.',
  branchIds,
}: {
  title?: string
  description?: string
  /** When set, only employees tagged to these clinic branch ids. */
  branchIds?: string[]
} = {}) {
  const { user } = useAuth()
  const forcedBranchId = useForcedBranchId()
  const clinicManager = isBranchOwner(user)
  /** HQ/HR: all clinics. Clinic manager: only their locked branch salary page. */
  const allowed =
    canAccessPeopleOps(user) ||
    (clinicManager &&
      Boolean(forcedBranchId) &&
      branchIds?.length === 1 &&
      branchIds[0] === forcedBranchId)
  const initial = defaultMonthRange()

  const [fromDraft, setFromDraft] = useState(initial.from)
  const [toDraft, setToDraft] = useState(initial.to)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AttendancePayrollRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [salesTick, setSalesTick] = useState(0)
  const [branchPunches, setBranchPunches] = useState<AttendancePunch[]>([])
  const [leaveEditRow, setLeaveEditRow] = useState<AttendancePayrollRow | null>(null)
  const [leaveSlDraft, setLeaveSlDraft] = useState('0')
  const [leaveVlDraft, setLeaveVlDraft] = useState('0')
  const [leaveSaving, setLeaveSaving] = useState(false)

  const branchKey = branchIds?.slice().sort().join(',') ?? ''
  const canEditLeave = canAccessPeopleOps(user)

  async function load() {
    setLoading(true)
    try {
      const next = await computeAttendancePayroll(from, to, {
        branchIds: branchIds?.length ? branchIds : undefined,
      })
      setRows(next)
      setSelectedId((prev) => {
        if (prev && next.some((r) => r.employee.id === prev)) return prev
        return next[0]?.employee.id ?? null
      })
      const punchBranchIds =
        branchIds?.length
          ? branchIds
          : [
              ...new Set(
                next.map((r) => r.employee.branchId).filter(Boolean) as string[],
              ),
            ]
      const ids =
        punchBranchIds.length > 0
          ? punchBranchIds
          : getBranches()
              .filter((b) => b.status === 'active' && b.branchType !== 'warehouse')
              .map((b) => b.id)
      try {
        // 2nd cut needs full-month punches for attendance incentive + 2M day-share
        const month = to.slice(0, 7)
        const [yy, mm] = month.split('-').map(Number)
        const monthLast = new Date(Date.UTC(yy!, mm!, 0)).getUTCDate()
        const punchFrom = Number(to.slice(8, 10)) >= 16 ? `${month}-01` : from
        const punchTo =
          Number(to.slice(8, 10)) >= 16
            ? `${month}-${String(monthLast).padStart(2, '0')}`
            : to
        setBranchPunches(await listAttendanceForBranches(ids, punchFrom, punchTo))
      } catch {
        setBranchPunches([])
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to compute payroll')
      setRows([])
      setBranchPunches([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const unsubAttendance = subscribeAttendance(() => {
      void load()
    })
    // Reload when clinic manager saves daily rate / benefits on Employee Database
    const unsubHr = subscribeEmployeeHr(() => {
      void load()
    })
    const unsubPayroll = subscribePayrollProfiles(() => {
      void load()
    })
    const unsubLeave = subscribePayrollLeaveAdjustments(() => {
      void load()
    })
    return () => {
      unsubAttendance()
      unsubHr()
      unsubPayroll()
      unsubLeave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, branchKey])

  useEffect(() => {
    void preloadSalesData().then(() => setSalesTick((n) => n + 1))
    void preloadPlanBIncentives().then(() => setSalesTick((n) => n + 1))
    void preloadPayslips()
    void preloadAccessUsers().then(() => setSalesTick((n) => n + 1))
    const unsubSales = subscribeSalesData(() => setSalesTick((n) => n + 1))
    const unsubPlanB = subscribePlanBIncentives(() => setSalesTick((n) => n + 1))
    return () => {
      unsubSales()
      unsubPlanB()
    }
  }, [])

  const payrollRows = useMemo(() => {
    void salesTick
    return rows.map((r) => {
      const extras = sumIncentives(r, from, to, branchPunches)
      return { row: r, ...extras }
    })
  }, [rows, from, to, salesTick, branchPunches])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return payrollRows
    return payrollRows.filter(({ row: r }) => {
      const e = r.employee
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q) ||
        e.branchLabel.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
      )
    })
  }, [payrollRows, query])

  const selected = rows.find((r) => r.employee.id === selectedId) ?? null

  const totals = useMemo(() => {
    return {
      staff: payrollRows.length,
      gross: payrollRows.reduce((s, r) => s + r.row.grossPay, 0),
      overtime: payrollRows.reduce((s, r) => s + (r.row.overtimePay || 0), 0),
      overtimeMin: payrollRows.reduce((s, r) => s + (r.row.overtimeMinutes || 0), 0),
      incentives: payrollRows.reduce((s, r) => s + r.incentives, 0),
      deductions: payrollRows.reduce((s, r) => s + r.netDeductions, 0),
      net: payrollRows.reduce((s, r) => s + r.netWithIncentives, 0),
      lateMin: payrollRows.reduce((s, r) => s + r.row.lateMinutes, 0),
    }
  }, [payrollRows])

  if (!allowed) return <Navigate to="/admin/dashboard" replace />

  function applyFilter() {
    if (fromDraft > toDraft) {
      toast.error('Start date must be on or before end date')
      return
    }
    setFrom(fromDraft)
    setTo(toDraft)
  }

  async function handleExport() {
    if (!payrollRows.length) {
      toast.error('No payroll rows to export')
      return
    }
    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.utils.book_new()
      const summary = [
        ['Period', `${from} to ${to}`],
        ['Shift', `Tue–Sun ${PAYROLL_DEFAULT_SHIFT.startHour}:${String(PAYROLL_DEFAULT_SHIFT.startMinute).padStart(2, '0')} – ${PAYROLL_DEFAULT_SHIFT.endHour}:${String(PAYROLL_DEFAULT_SHIFT.endMinute).padStart(2, '0')}`],
        [],
        [
          'Staff',
          'Position',
          'Branch',
          'Salary/Day',
          'Days Present',
          'Days Absent',
          'SL',
          'VL',
          'SL/VL Pay',
          'Late (min)',
          'OT (min)',
          'OT Pay',
          'Undertime (min)',
          'Gross (basic)',
          'Incentives',
          'Staff Commission 0.5%',
          'Late Deduction',
          'Undertime Deduction',
          'SSS+MPF',
          'Pag-IBIG',
          'PhilHealth',
          'Total Deductions',
          'Net Pay (incl. OT + incentives)',
        ],
        ...payrollRows.map(({ row: r, incentives, staffCommission, netDeductions, netWithIncentives }) => [
          r.employee.fullName,
          r.employee.jobTitle,
          r.employee.branchLabel,
          r.employee.salaryPerDay,
          r.daysPresent,
          r.daysAbsent,
          r.sickLeaveDays || 0,
          r.vacationLeaveDays || 0,
          r.leavePay || 0,
          r.lateMinutes,
          r.overtimeMinutes || 0,
          r.overtimePay || 0,
          r.undertimeMinutes,
          r.grossPay,
          incentives,
          staffCommission,
          r.lateDeduction,
          r.undertimeDeduction,
          r.sssDeduction,
          r.pagibigDeduction,
          r.philhealthDeduction,
          netDeductions,
          netWithIncentives,
        ]),
      ]
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summary), 'Payroll')

      const detail: (string | number)[][] = [
        [
          'Staff',
          'Date',
          'Status',
          'Time In',
          'Time Out',
          'Late (min)',
          'OT (min)',
          'Undertime (min)',
          'Late ₱',
          'OT ₱',
          'Undertime ₱',
        ],
      ]
      for (const { row: r } of payrollRows) {
        for (const d of r.dayDetails) {
          detail.push([
            r.employee.fullName,
            d.dateKey,
            d.status,
            d.timeIn ? formatManilaTime(d.timeIn) : '',
            d.timeOut ? formatManilaTime(d.timeOut) : '',
            d.lateMinutes,
            d.overtimeMinutes || 0,
            d.undertimeMinutes,
            d.lateDeduction,
            d.overtimePay || 0,
            d.undertimeDeduction,
          ])
        }
      }
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(detail), 'Daily Detail')
      XLSX.writeFile(workbook, `imajica-payroll-${from}-${to}.xlsx`)
      toast.success('Exported payroll workbook')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title={title}
        description={description}
        stat={{
          value: formatPeso(totals.net),
          label: 'Net payroll',
        }}
        actions={
          <Button
            type="button"
            variant="secondary"
            className="border-white/25 bg-white/10 text-white hover:bg-white/20"
            disabled={loading}
            onClick={() => void handleExport()}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Staff on roster" value={String(totals.staff)} icon={Wallet} />
        <Kpi label="Gross pay" value={formatPeso(totals.gross)} icon={Wallet} />
        <Kpi
          label="OT pay"
          value={formatPeso(totals.overtime)}
          icon={Clock}
        />
        <Kpi label="Incentives" value={formatPeso(totals.incentives)} icon={Wallet} />
        <Kpi label="Deductions" value={formatPeso(totals.deductions)} icon={Clock} />
        <Kpi
          label="Late / OT min"
          value={`${totals.lateMin} / ${totals.overtimeMin}`}
          icon={Clock}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="block min-w-[9rem] flex-1 text-xs font-medium text-slate-ui">
            From
            <input
              type="date"
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal"
            />
          </label>
          <label className="block min-w-[9rem] flex-1 text-xs font-medium text-slate-ui">
            To
            <input
              type="date"
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal"
            />
          </label>
          <Button type="button" onClick={applyFilter} className="lg:mb-0.5">
            <Filter className="h-4 w-4" />
            Apply
          </Button>
          <p className="text-xs text-slate-ui lg:ml-auto lg:self-center">
            Late / OT = (daily ÷ 480 min) × minutes · OT after 7:30 PM · MBS = salary/day ×{' '}
            {PAYROLL_DEFAULT_SHIFT.mbsDaysPerMonth}
          </p>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.7fr)]">
        <Card className="min-w-0 overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#073D2C]">Staff payroll</p>
              <p className="text-[11px] text-slate-ui">
                1–15 = basic only · 16–end includes My Commission + incentives + allowance
              </p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-ui" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search staff…"
                className="w-full rounded-[10px] border border-border bg-ivory-50 py-2 pl-8 pr-3 text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <p className="p-4 text-sm text-slate-ui">Computing payroll from attendance…</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-slate-ui">No roster staff match this filter.</p>
            ) : (
              <table className="w-full min-w-[800px] table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[7%]" />
                  <col className="w-[9%]" />
                  <col className="w-[6%]" />
                  <col className="w-[10%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="bg-ivory-50 text-[11px] uppercase tracking-wide text-slate-ui">
                  <tr>
                    <th className="px-2 py-2.5 font-semibold">Staff</th>
                    <th className="px-2 py-2.5 font-semibold">Present</th>
                    <th className="px-2 py-2.5 font-semibold">SL / VL</th>
                    <th className="px-2 py-2.5 font-semibold">Late</th>
                    <th className="px-2 py-2.5 font-semibold">OT</th>
                    <th className="px-2 py-2.5 font-semibold">Gross</th>
                    <th className="px-2 py-2.5 font-semibold">Incentives</th>
                    <th className="px-2 py-2.5 font-semibold">Deductions</th>
                    <th className="px-2 py-2.5 font-semibold">Net</th>
                    <th className="px-2 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filtered.map(({ row: r, incentives, netDeductions, netWithIncentives }) => {
                    const active = r.employee.id === selectedId
                    const otMin = r.overtimeMinutes || 0
                    const otPay = r.overtimePay || 0
                    const sl = r.sickLeaveDays || 0
                    const vl = r.vacationLeaveDays || 0
                    return (
                      <tr
                        key={r.employee.id}
                        className={cn(
                          'cursor-pointer transition',
                          active ? 'bg-emerald-50' : 'bg-white hover:bg-ivory-50',
                        )}
                        onClick={() => setSelectedId(r.employee.id)}
                      >
                        <td className="px-2 py-3">
                          <p className="truncate font-semibold text-charcoal">{r.employee.fullName}</p>
                          <p className="truncate text-[11px] text-slate-ui">
                            {r.employee.jobTitle} · {r.employee.branchLabel} · ₱
                            {r.employee.salaryPerDay}/day
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 tabular-nums">
                          {r.daysPresent}/{r.daysScheduled}
                        </td>
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            className={cn(
                              'rounded-md px-1.5 py-0.5 text-left transition',
                              canEditLeave
                                ? 'hover:bg-emerald-100/80 focus:outline-none focus:ring-2 focus:ring-emerald-700/30'
                                : '',
                            )}
                            title={
                              canEditLeave
                                ? 'Edit SL / VL days (1 day = full daily rate)'
                                : 'SL / VL days'
                            }
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!canEditLeave) return
                              setLeaveEditRow(r)
                              setLeaveSlDraft(String(sl))
                              setLeaveVlDraft(String(vl))
                            }}
                          >
                            <p className="font-medium tabular-nums text-[#073D2C]">
                              {sl} / {vl}
                            </p>
                            <p className="text-[10px] text-slate-ui">
                              {r.leavePay > 0 ? formatPeso(r.leavePay) : '—'}
                              {r.leaveManualOverride ? ' · HR' : ''}
                            </p>
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 tabular-nums">{r.lateMinutes}m</td>
                        <td className="px-2 py-3">
                          <p className="font-medium tabular-nums text-[#073D2C]">{formatPeso(otPay)}</p>
                          <p className="text-[10px] text-slate-ui">{otMin}m · 7:30+</p>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 tabular-nums">{formatPeso(r.grossPay)}</td>
                        <td className="whitespace-nowrap px-2 py-3 tabular-nums text-[#6b5420]">
                          {formatPeso(incentives)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 tabular-nums text-amber-800">
                          {formatPeso(netDeductions)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 font-semibold tabular-nums text-[#073D2C]">
                          {formatPeso(netWithIncentives)}
                        </td>
                        <td className="px-2 py-3">{statusBadge(r)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card className="min-w-0 p-3 sm:p-4 xl:max-w-md xl:justify-self-end">
          {!selected ? (
            <p className="text-sm text-slate-ui">Select a staff member to preview the payslip.</p>
          ) : (
            <HrPayslipPreview
              row={selected}
              periodFrom={from}
              periodTo={to}
              branchAttendancePunches={branchPunches}
            />
          )}
        </Card>
      </div>

      <Dialog
        open={Boolean(leaveEditRow)}
        onClose={() => {
          if (leaveSaving) return
          setLeaveEditRow(null)
        }}
        title="SL / VL days"
        description={
          leaveEditRow
            ? `${leaveEditRow.employee.fullName} · ${from} – ${to}. Each SL/VL day pays 1 full daily rate (₱${leaveEditRow.employee.salaryPerDay}). Approved leave filings auto-fill; save here to override for this cut.`
            : undefined
        }
        confirmLabel={leaveSaving ? 'Saving…' : 'Save SL / VL'}
        onConfirm={() => {
          if (!leaveEditRow || leaveSaving) return
          const sickDays = Math.max(0, Math.round(Number(leaveSlDraft) || 0))
          const vacationDays = Math.max(0, Math.round(Number(leaveVlDraft) || 0))
          setLeaveSaving(true)
          void savePayrollLeaveAdjustment({
            userId: leaveEditRow.matchedUserId || leaveEditRow.employee.id,
            matchKey: leaveEditRow.employee.email,
            email: leaveEditRow.employee.email,
            employeeName: leaveEditRow.employee.fullName,
            periodFrom: from,
            periodTo: to,
            sickDays,
            vacationDays,
          })
            .then(() => {
              toast.success(
                `Saved ${sickDays} SL / ${vacationDays} VL for ${leaveEditRow.employee.fullName}`,
              )
              setLeaveEditRow(null)
              void load()
            })
            .catch((err) => {
              toast.error(err instanceof Error ? err.message : 'Could not save SL/VL')
            })
            .finally(() => setLeaveSaving(false))
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-slate-ui">
            Sick leave (SL)
            <input
              type="number"
              min={0}
              step={1}
              value={leaveSlDraft}
              onChange={(e) => setLeaveSlDraft(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal"
            />
          </label>
          <label className="block text-xs font-medium text-slate-ui">
            Vacation leave (VL)
            <input
              type="number"
              min={0}
              step={1}
              value={leaveVlDraft}
              onChange={(e) => setLeaveVlDraft(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal"
            />
          </label>
        </div>
        {leaveEditRow ? (
          <p className="mt-3 text-xs text-slate-ui">
            Leave pay preview:{' '}
            <span className="font-semibold text-[#073D2C]">
              {formatPeso(
                (Math.max(0, Math.round(Number(leaveSlDraft) || 0)) +
                  Math.max(0, Math.round(Number(leaveVlDraft) || 0))) *
                  leaveEditRow.employee.salaryPerDay,
              )}
            </span>
          </p>
        ) : null}
      </Dialog>
    </div>
  )
}

function HrPayslipPreview({
  row,
  periodFrom,
  periodTo,
  branchAttendancePunches = [],
}: {
  row: AttendancePayrollRow
  periodFrom: string
  periodTo: string
  branchAttendancePunches?: AttendancePunch[]
}) {
  const { user } = useAuth()
  const [punches, setPunches] = useState<AttendancePunch[]>([])
  const [sending, setSending] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<BuiltPayslip | null>(null)
  const [payslipTick, setPayslipTick] = useState(0)
  const [salesTick, setSalesTick] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    void preloadPayslips().then(() => setPayslipTick((n) => n + 1))
    return subscribePayslips(() => setPayslipTick((n) => n + 1))
  }, [])

  useEffect(() => {
    void preloadSalesData().then(() => setSalesTick((n) => n + 1))
    void preloadPlanBIncentives().then(() => setSalesTick((n) => n + 1))
    void preloadAccessUsers().then(() => setSalesTick((n) => n + 1))
    const unsubSales = subscribeSalesData(() => setSalesTick((n) => n + 1))
    const unsubPlanB = subscribePlanBIncentives(() => setSalesTick((n) => n + 1))
    return () => {
      unsubSales()
      unsubPlanB()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!row.matchedUserId) {
        setPunches([])
        return
      }
      try {
        const rows = await listMyAttendance(row.matchedUserId)
        if (!cancelled) setPunches(rows)
      } catch {
        if (!cancelled) setPunches([])
      }
    }
    void load()
  }, [row.matchedUserId])

  const computed = useMemo(() => {
    void salesTick
    const branchId = row.employee.branchId
    const incentives = gatherPayslipIncentives({
      row,
      periodFrom,
      periodTo,
      attendancePunches: punches,
      branchAttendancePunches: branchId
        ? branchAttendancePunches.filter((p) => p.branchId === branchId)
        : branchAttendancePunches,
    })
    return buildPayslipDocument({ row, periodFrom, periodTo, incentives })
  }, [row, periodFrom, periodTo, punches, branchAttendancePunches, salesTick])

  // Identity of the auto-calc source — reset draft only when staff / period changes,
  // not when background sales ticks fire (that was wiping manual edits before send).
  const computeKey = `${row.employee.id}|${periodFrom}|${periodTo}|${row.daysPresent}|${row.employee.salaryPerDay}|${row.lateMinutes}|${row.sickLeaveDays}|${row.vacationLeaveDays}|${row.leavePay}`

  useEffect(() => {
    setDraft(computed)
    setEditing(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset on identity/rate change
  }, [computeKey])

  // Keep draft in sync with computed only when not actively editing
  useEffect(() => {
    if (!editing) setDraft(computed)
  }, [computed, editing])

  const payslip = draft ?? computed

  const sentForStaff = useMemo(() => {
    void payslipTick
    return listPayslipsForStaff({
      userId: row.matchedUserId,
      email: row.employee.email,
    })
  }, [payslipTick, row.matchedUserId, row.employee.email])

  async function handleSend() {
    if (!user) return
    if (payslip.base.employee.salaryPerDay <= 0 || payslip.grossEarnings <= 0) {
      const ok = window.confirm(
        `This payslip still shows ₱0 basic pay (daily rate is ${payslip.base.employee.salaryPerDay || 0}).\n\n` +
          `Set the daily rate on Employee Database (or use Edit → Daily rate on this slip), then send again.\n\n` +
          `Send anyway with zeros?`,
      )
      if (!ok) return
    }
    setSending(true)
    try {
      await sendPayslipToEmployee({
        payslip,
        sentByUserId: user.id,
        sentByName: user.fullName,
      })
      toast.success(`Payslip sent to ${payslip.employeeName} — visible on their My Salary page`)
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send payslip')
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(id: string, label: string) {
    if (
      !window.confirm(
        `Delete payslip for ${label}? The employee will no longer see it on My Salary.`,
      )
    ) {
      return
    }
    setDeletingId(id)
    try {
      await deletePayslip(id)
      toast.success('Payslip deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete payslip')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button
          type="button"
          variant={editing ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setEditing((v) => !v)}
        >
          <Pencil className="h-3.5 w-3.5" />
          {editing ? 'Done editing' : 'Edit before send'}
        </Button>
        {editing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(computed)
              toast.message('Reset to calculated amounts')
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to calculated
          </Button>
        ) : null}
      </div>

      <PayslipDocument
        payslip={payslip}
        showSend
        sending={sending}
        onSend={() => void handleSend()}
        editable={editing}
        onChange={setDraft}
      />

      {sentForStaff.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-[#073D2C]">Sent payslips for this employee</p>
            <p className="text-[11px] text-slate-ui">
              Delete a slip if amounts were wrong — it disappears from My Salary immediately.
            </p>
          </div>
          <ul className="divide-y divide-border/70">
            {sentForStaff.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#0A2E26]">{s.periodLabel}</p>
                  <p className="text-[11px] text-slate-ui">
                    Sent {new Date(s.sentAt).toLocaleString('en-PH')} · {s.sentByName}
                  </p>
                  <p className="mt-0.5 font-metric text-sm font-semibold text-emerald-900">
                    {formatPeso(s.netPay)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deletingId === s.id}
                  onClick={() => void handleDelete(s.id, s.periodLabel)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingId === s.id ? 'Deleting…' : 'Delete'}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}

function Kpi({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Clock
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-ui">{label}</p>
          <p className="mt-1 text-xl font-semibold text-[#073D2C]">{value}</p>
        </div>
        <span className="rounded-full bg-emerald-50 p-2 text-emerald-800">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  )
}
