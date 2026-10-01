import { useEffect, useMemo, useState } from 'react'
import {
  Clock,
  FileSpreadsheet,
  Filter,
  Search,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Navigate } from 'react-router-dom'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { PAYROLL_DEFAULT_SHIFT } from '@/constants/payrollRosterSeed'
import {
  formatAttendanceHours,
  formatManilaTime,
  manilaDateKey,
  subscribeAttendance,
} from '@/services/attendanceService'
import {
  computeAttendancePayroll,
  scheduledMinutesPerDay,
  type AttendancePayrollRow,
} from '@/services/payrollAttendanceService'
import { canAccessHqAdmin } from '@/utils/franchiseAccess'
import { formatPeso, formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'

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

/** HQ payroll from Time In / Time Out + spreadsheet daily rates & statutory deductions. */
export function AttendancePayrollPage() {
  const { user } = useAuth()
  const allowed = canAccessHqAdmin(user)
  const initial = defaultMonthRange()

  const [fromDraft, setFromDraft] = useState(initial.from)
  const [toDraft, setToDraft] = useState(initial.to)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AttendancePayrollRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const next = await computeAttendancePayroll(from, to)
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
  }, [from, to])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const e = r.employee
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q) ||
        e.branchLabel.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
      )
    })
  }, [rows, query])

  const selected = rows.find((r) => r.employee.id === selectedId) ?? null

  const totals = useMemo(() => {
    return {
      staff: rows.length,
      gross: rows.reduce((s, r) => s + r.grossPay, 0),
      deductions: rows.reduce((s, r) => s + r.totalDeductions, 0),
      net: rows.reduce((s, r) => s + r.netPay, 0),
      lateMin: rows.reduce((s, r) => s + r.lateMinutes, 0),
    }
  }, [rows])

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
    if (!rows.length) {
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
          'Late Deduction',
          'Undertime Deduction',
          'SSS+MPF',
          'Pag-IBIG',
          'PhilHealth',
          'Total Deductions',
          'Net Pay',
        ],
        ...rows.map((r) => [
          r.employee.fullName,
          r.employee.jobTitle,
          r.employee.branchLabel,
          r.employee.salaryPerDay,
          r.daysPresent,
          r.daysAbsent,
          r.lateMinutes,
          r.undertimeMinutes,
          r.grossPay,
          r.lateDeduction,
          r.undertimeDeduction,
          r.sssDeduction,
          r.pagibigDeduction,
          r.philhealthDeduction,
          r.totalDeductions,
          r.netPay,
        ]),
      ]
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summary), 'Payroll')

      const detail: (string | number)[][] = [
        ['Staff', 'Date', 'Status', 'Time In', 'Time Out', 'Late (min)', 'Undertime (min)', 'Late ₱', 'Undertime ₱'],
      ]
      for (const r of rows) {
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
        title="Payroll"
        description="Built from Time In / Time Out vs the Tue–Sun 9:45 AM–7:00 PM shift. Daily rates and SSS / Pag-IBIG / PhilHealth follow the payroll spreadsheet."
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Staff on roster" value={String(totals.staff)} icon={Wallet} />
        <Kpi label="Gross pay" value={formatPeso(totals.gross)} icon={Wallet} />
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#073D2C]">Staff payroll</p>
              <p className="text-[11px] text-slate-ui">
                Gross from days with Time In; late / undertime cut pay by the minute
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
                    <th className="px-3 py-2.5 font-semibold">Deductions</th>
                    <th className="px-3 py-2.5 font-semibold">Net</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filtered.map((r) => {
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
                        <td className="whitespace-nowrap px-3 py-3 text-amber-800">
                          {formatPeso(r.totalDeductions)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-[#073D2C]">
                          {formatPeso(r.netPay)}
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

        <Card className="p-4 sm:p-5">
          {!selected ? (
            <p className="text-sm text-slate-ui">Select a staff member to preview the payslip.</p>
          ) : (
            <PayslipPanel row={selected} />
          )}
        </Card>
      </div>
    </div>
  )
}

function PayslipPanel({ row }: { row: AttendancePayrollRow }) {
  const e = row.employee
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
          Payslip preview
        </p>
        <h2 className="text-lg font-semibold text-charcoal">{e.fullName}</h2>
        <p className="text-sm text-slate-ui">
          {e.jobTitle} · {e.branchLabel}
        </p>
        {!row.matchedUserId ? (
          <p className="mt-2 text-xs text-amber-800">
            Not linked to a timeclock account — attendance shows as absent until emails/names match.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Mini label="Present" value={`${row.daysPresent}`} />
        <Mini label="Absent" value={`${row.daysAbsent}`} />
        <Mini label="MBS" value={formatPeso(row.mbs)} />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-ui">Earnings</p>
        <ul className="space-y-1.5 text-sm">
          <li className="flex justify-between gap-2">
            <span>
              Days worked ({row.daysPresent} × {formatPesoExact(e.salaryPerDay)})
            </span>
            <span className="font-medium">{formatPeso(row.grossPay)}</span>
          </li>
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-ui">
          Deductions (from attendance + sheet)
        </p>
        <ul className="space-y-1.5 text-sm">
          <li className="flex justify-between gap-2">
            <span>Late ({row.lateMinutes} min)</span>
            <span>-{formatPeso(row.lateDeduction)}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Undertime ({row.undertimeMinutes} min)</span>
            <span>-{formatPeso(row.undertimeDeduction)}</span>
          </li>
          <li className="flex justify-between gap-2 text-slate-ui">
            <span>Unpaid absences ({row.daysAbsent} day)</span>
            <span>({formatPeso(row.absenceDeduction)} not earned)</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>SSS + MPF</span>
            <span>-{formatPeso(row.sssDeduction)}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Pag-IBIG</span>
            <span>-{formatPeso(row.pagibigDeduction)}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>PhilHealth</span>
            <span>-{formatPeso(row.philhealthDeduction)}</span>
          </li>
        </ul>
      </div>

      <div className="rounded-[12px] bg-emerald-50 p-4">
        <p className="text-xs text-slate-ui">Net pay</p>
        <p className="font-metric text-3xl font-semibold tracking-tight text-emerald-900">
          {formatPeso(row.netPay)}
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-ui">
          Daily attendance
        </p>
        <div className="max-h-56 space-y-1 overflow-y-auto text-xs">
          {row.dayDetails.map((d) => (
            <div
              key={d.dateKey}
              className="flex items-center justify-between gap-2 rounded-[8px] border border-border/70 px-2.5 py-1.5"
            >
              <span className="font-medium text-charcoal">{d.dateKey}</span>
              <span className="capitalize text-slate-ui">{d.status}</span>
              <span className="text-slate-ui">
                {d.timeIn ? formatManilaTime(d.timeIn) : '—'}
                {' → '}
                {d.timeOut ? formatManilaTime(d.timeOut) : '—'}
              </span>
              <span className="text-[#073D2C]">
                {d.hours != null ? formatAttendanceHours(d.hours) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-ivory-50 px-2 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-slate-ui">{label}</p>
      <p className="text-sm font-semibold text-[#073D2C]">{value}</p>
    </div>
  )
}
