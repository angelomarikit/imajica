import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarOff, Send } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { useAuth } from '@/contexts/AuthContext'
import {
  applyForLeave,
  cancelLeaveRequest,
  countLeaveDays,
  getLeaveBalance,
  LEAVE_TYPE_LABELS,
  leaveYear,
  listLeaveRequests,
  remainingCredits,
  statusTone,
  subscribeLeave,
} from '@/services/leaveService'
import type { LeaveBalance, LeaveRequest, LeaveType } from '@/types'
import { cn } from '@/utils/cn'

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-[#073D2C] outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10'
const labelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-ui'

export function MyLeavePage() {
  const { user } = useAuth()
  const year = leaveYear()
  const [balance, setBalance] = useState<LeaveBalance | null>(null)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [leaveType, setLeaveType] = useState<LeaveType>('vacation')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')

  async function refresh() {
    if (!user?.id) return
    setLoading(true)
    try {
      const [bal, rows] = await Promise.all([
        getLeaveBalance(user.id, year),
        listLeaveRequests({ userId: user.id, year }),
      ])
      setBalance(bal)
      setRequests(rows)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load leave')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    return subscribeLeave(() => {
      void refresh()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const previewDays = startDate && endDate ? countLeaveDays(startDate, endDate) : 0
  const remainingForType = balance ? remainingCredits(balance, leaveType) : 0

  const recentStatus = useMemo(() => requests.slice(0, 5), [requests])

  async function handleApply(e: FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    if (!startDate || !endDate) {
      toast.error('Select start and end dates')
      return
    }
    setSubmitting(true)
    try {
      await applyForLeave({
        userId: user.id,
        employeeName: user.fullName,
        employeeEmail: user.email,
        branchId: user.branchId,
        branchName: user.branchName,
        leaveType,
        startDate,
        endDate,
        reason,
      })
      toast.success('Leave request submitted — waiting for HR approval')
      setReason('')
      setStartDate('')
      setEndDate('')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit leave')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(id: string) {
    if (!user?.id) return
    try {
      await cancelLeaveRequest({ id, byUserId: user.id })
      toast.success('Leave request cancelled')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel')
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="My Leave"
        description="Apply for sick, vacation, or emergency leave. Track your credits and request status here."
        stat={{ value: pendingCount, label: 'Pending' }}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Sick leave left"
          value={String(balance ? remainingCredits(balance, 'sick') : '—')}
          subtext={balance ? `of ${balance.sickDays} days (${year})` : 'Loading…'}
        />
        <KpiCard
          label="Vacation leave left"
          value={String(balance ? remainingCredits(balance, 'vacation') : '—')}
          subtext={balance ? `of ${balance.vacationDays} days (${year})` : 'Loading…'}
        />
        <KpiCard
          label="Emergency leave left"
          value={String(balance ? remainingCredits(balance, 'emergency') : '—')}
          subtext={balance ? `of ${balance.emergencyDays} days (${year})` : 'Loading…'}
        />
        <KpiCard
          label="Request status"
          value={`${approvedCount} approved`}
          subtext={`${pendingCount} pending · ${requests.length} this year`}
          icon={<CalendarOff className="h-5 w-5" />}
        />
      </div>

      {recentStatus.length > 0 ? (
        <Card className="p-4 sm:p-5">
          <h2 className="font-display text-lg text-[#073D2C]">Latest leave status</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {recentStatus.map((r) => (
              <div
                key={r.id}
                className="flex min-w-[220px] flex-1 items-center justify-between gap-2 rounded-[10px] border border-border bg-ivory-50 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-[#073D2C]">
                    {LEAVE_TYPE_LABELS[r.leaveType]}
                  </p>
                  <p className="text-[11px] text-slate-ui">
                    {r.startDate} → {r.endDate} · {r.days}d
                  </p>
                </div>
                <Badge variant={statusTone(r.status)}>{r.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-4 sm:p-5">
          <h2 className="font-display text-xl text-[#073D2C]">Apply for leave</h2>
          <p className="mt-1 text-sm text-slate-ui">
            HR reviews and approves requests. Clinic managers and HQ can also approve later.
          </p>
          <form onSubmit={handleApply} className="mt-4 space-y-3">
            <label className="block">
              <span className={labelClass}>Leave type</span>
              <select
                className={fieldClass}
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              >
                <option value="vacation">Vacation leave</option>
                <option value="sick">Sick leave</option>
                <option value="emergency">Emergency leave</option>
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Start date</span>
                <input
                  type="date"
                  className={fieldClass}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    if (!endDate || endDate < e.target.value) setEndDate(e.target.value)
                  }}
                  required
                />
              </label>
              <label className="block">
                <span className={labelClass}>End date</span>
                <input
                  type="date"
                  className={fieldClass}
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </label>
            </div>
            <label className="block">
              <span className={labelClass}>Reason / notes</span>
              <textarea
                className={cn(fieldClass, 'min-h-[88px] resize-y')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional details for HR"
              />
            </label>
            <p className="text-xs text-slate-ui">
              {previewDays > 0
                ? `${previewDays} day(s) · ${remainingForType} ${LEAVE_TYPE_LABELS[leaveType].toLowerCase()} credit(s) remaining`
                : `${remainingForType} ${LEAVE_TYPE_LABELS[leaveType].toLowerCase()} credit(s) remaining`}
            </p>
            <Button type="submit" className="gap-1.5" disabled={submitting || loading}>
              <Send className="h-4 w-4" />
              {submitting ? 'Submitting…' : 'Submit leave request'}
            </Button>
          </form>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="font-display text-xl text-[#073D2C]">My leave history</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-ui">
                <tr className="border-b border-border">
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Dates</th>
                  <th className="px-2 py-2">Days</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-8 text-center text-slate-ui">
                      Loading…
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-8 text-center text-slate-ui">
                      No leave requests yet this year.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="border-t border-border/70">
                      <td className="px-2 py-3 font-medium text-[#073D2C]">
                        {LEAVE_TYPE_LABELS[r.leaveType]}
                      </td>
                      <td className="px-2 py-3 text-slate-ui">
                        {r.startDate} → {r.endDate}
                      </td>
                      <td className="px-2 py-3">{r.days}</td>
                      <td className="px-2 py-3">
                        <Badge variant={statusTone(r.status)}>{r.status}</Badge>
                        {r.reviewedByName ? (
                          <p className="mt-1 text-[10px] text-slate-ui">by {r.reviewedByName}</p>
                        ) : null}
                      </td>
                      <td className="px-2 py-3">
                        {r.status === 'pending' ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-red-700 hover:underline"
                            onClick={() => void handleCancel(r.id)}
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-slate-ui">—</span>
                        )}
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
