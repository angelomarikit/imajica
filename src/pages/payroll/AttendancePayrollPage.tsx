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
import { PayslipDocument } from '@/components/payroll/PayslipDocument'
import { useAuth } from '@/contexts/AuthContext'
import { PAYROLL_DEFAULT_SHIFT } from '@/constants/payrollRosterSeed'
import {
  formatManilaTime,
  listMyAttendance,
  manilaDateKey,
  subscribeAttendance,
} from '@/services/attendanceService'
import {
  computeAttendancePayroll,
  scheduledMinutesPerDay,
  type AttendancePayrollRow,
} from '@/services/payrollAttendanceService'
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
import { canAccessPeopleOps } from '@/utils/franchiseAccess'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'
import type { AttendancePunch } from '@/types'

function defaultMonthRange() {
  const to = manilaDateKey()
  const d = new Date(`${to}T12:00:00+08:00`)
  d.setDate(1)
  const from = manilaDateKey(d)
  return { from, to }
}

function statusBadge(row: AttendancePayrollRow) {
  if (!row.matchedUserId) return <Badge variant="warning">No timeclock link</Badge>
  if (row.daysOpen > 0) return <Badge variant="warning">{row.daysOpen} open</Badge>
  if (row.daysAbsent > 0) return <Badge variant="neutral">{row.daysAbsent} absent</Badge>
  return <Badge variant="success">Ready</Badge>
}

function sumIncentives(row: AttendancePayrollRow, periodFrom: string, periodTo: string) {
  const inc = gatherPayslipIncentives({ row, periodFrom, periodTo })
  const total =
    (inc.staffSalesCommission || 0) +
    (inc.managerCommission || 0) +
    (inc.milestoneShare || 0) +
    (inc.attendanceIncentive || 0) +
    (inc.planBAmount || 0)
  // Absences already zero out gross days — do not list them again in deductions vs net
  const netDeductions = Math.round(
    (row.lateDeduction + row.undertimeDeduction + row.statutoryTotal) * 100,
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
  description = 'Daily rates, attendance hours, late/undertime, and statutory deductions from the payroll roster.',
  branchIds,
}: {
  title?: string
  description?: string
  /** When set, only employees tagged to these clinic branch ids. */
  branchIds?: string[]
} = {}) {
  const { user } = useAuth()
  const allowed = canAccessPeopleOps(user)
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

  const branchKey = branchIds?.slice().sort().join(',') ?? ''

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to compute payroll')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    return subscribeAttendance(() => {
      void load()
    })
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
      const extras = sumIncentives(r, from, to)
      return { row: r, ...extras }
    })
  }, [rows, from, to, salesTick])

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
          'Late (min)',
          'Undertime (min)',
          'Gross',
          'Incentives',
          'Staff Commission 0.5%',
          'Late Deduction',
          'Undertime Deduction',
          'SSS+MPF',
          'Pag-IBIG',
          'PhilHealth',
          'Total Deductions',
          'Net Pay (incl. incentives)',
        ],
        ...payrollRows.map(({ row: r, incentives, staffCommission, netDeductions, netWithIncentives }) => [
          r.employee.fullName,
          r.employee.jobTitle,
          r.employee.branchLabel,
          r.employee.salaryPerDay,
          r.daysPresent,
          r.daysAbsent,
          r.lateMinutes,
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
        ['Staff', 'Date', 'Status', 'Time In', 'Time Out', 'Late (min)', 'Undertime (min)', 'Late ₱', 'Undertime ₱'],
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
            d.undertimeMinutes,
            d.lateDeduction,
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Staff on roster" value={String(totals.staff)} icon={Wallet} />
        <Kpi label="Gross pay" value={formatPeso(totals.gross)} icon={Wallet} />
        <Kpi label="Incentives" value={formatPeso(totals.incentives)} icon={Wallet} />
        <Kpi label="Deductions" value={formatPeso(totals.deductions)} icon={Clock} />
        <Kpi label="Late minutes" value={String(totals.lateMin)} icon={Clock} />
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
            Shift {scheduledMinutesPerDay()} min/day · MBS = salary/day ×{' '}
            {PAYROLL_DEFAULT_SHIFT.mbsDaysPerMonth}
          </p>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#073D2C]">Staff payroll</p>
              <p className="text-[11px] text-slate-ui">
                Net includes My Commission incentives (0.5% tagged sales + other incentives)
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
              <table className="min-w-full text-left text-sm">
                <thead className="bg-ivory-50 text-[11px] uppercase tracking-wide text-slate-ui">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Staff</th>
                    <th className="px-3 py-2.5 font-semibold">Present</th>
                    <th className="px-3 py-2.5 font-semibold">Late</th>
                    <th className="px-3 py-2.5 font-semibold">Gross</th>
                    <th className="px-3 py-2.5 font-semibold">Incentives</th>
                    <th className="px-3 py-2.5 font-semibold">Deductions</th>
                    <th className="px-3 py-2.5 font-semibold">Net</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filtered.map(({ row: r, incentives, netDeductions, netWithIncentives }) => {
                    const active = r.employee.id === selectedId
                    return (
                      <tr
                        key={r.employee.id}
                        className={cn(
                          'cursor-pointer transition',
                          active ? 'bg-emerald-50' : 'bg-white hover:bg-ivory-50',
                        )}
                        onClick={() => setSelectedId(r.employee.id)}
                      >
                        <td className="px-3 py-3">
                          <p className="font-semibold text-charcoal">{r.employee.fullName}</p>
                          <p className="text-[11px] text-slate-ui">
                            {r.employee.jobTitle} · {r.employee.branchLabel} · ₱
                            {r.employee.salaryPerDay}/day
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          {r.daysPresent}/{r.daysScheduled}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">{r.lateMinutes}m</td>
                        <td className="whitespace-nowrap px-3 py-3">{formatPeso(r.grossPay)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-[#6b5420]">
                          {formatPeso(incentives)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-amber-800">
                          {formatPeso(netDeductions)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-[#073D2C]">
                          {formatPeso(netWithIncentives)}
                        </td>
                        <td className="px-3 py-3">{statusBadge(r)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-5 lg:col-span-1 lg:max-w-none">
          {!selected ? (
            <p className="text-sm text-slate-ui">Select a staff member to preview the payslip.</p>
          ) : (
            <HrPayslipPreview row={selected} periodFrom={from} periodTo={to} />
          )}
        </Card>
      </div>
    </div>
  )
}

function HrPayslipPreview({
  row,
  periodFrom,
  periodTo,
}: {
  row: AttendancePayrollRow
  periodFrom: string
  periodTo: string
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
    const incentives = gatherPayslipIncentives({
      row,
      periodFrom,
      periodTo,
      attendancePunches: punches,
    })
    return buildPayslipDocument({ row, periodFrom, periodTo, incentives })
  }, [row, periodFrom, periodTo, punches, salesTick])

  // Reset draft when the auto-calculated payslip changes (new staff / range / punches)
  useEffect(() => {
    setDraft(computed)
    setEditing(false)
  }, [computed])

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
