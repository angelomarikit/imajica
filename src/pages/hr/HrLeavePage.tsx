import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { KpiCard } from '@/components/ui/KpiCard'
import { useAuth } from '@/contexts/AuthContext'
import { getBranches } from '@/services/branchService'
import {
  designateLeave,
  getLeaveBalance,
  LEAVE_TYPE_LABELS,
  leaveYear,
  listLeaveBalancesForUsers,
  listLeaveRequests,
  remainingCredits,
  reviewLeaveRequest,
  setLeaveCredits,
  statusTone,
  subscribeLeave,
} from '@/services/leaveService'
import { listDirectoryStaff } from '@/services/staffDirectoryService'
import type { LeaveBalance, LeaveRequest, LeaveType, Staff } from '@/types'
import { canApproveLeave, canAccessPeopleOps, isBranchOwner } from '@/utils/franchiseAccess'
import { cn } from '@/utils/cn'

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-[#073D2C] outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10'
const labelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-ui'

export function HrLeavePage() {
  const { user } = useAuth()
  const peopleOps = canAccessPeopleOps(user)
  const clinicManager = isBranchOwner(user)
  const year = leaveYear()

  const [employees, setEmployees] = useState<Staff[]>([])
  const [balancesByUser, setBalancesByUser] = useState<Record<string, LeaveBalance>>({})
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [branchFilter, setBranchFilter] = useState(clinicManager && !peopleOps ? user?.branchId || '' : '')

  const [designateOpen, setDesignateOpen] = useState(false)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [leaveType, setLeaveType] = useState<LeaveType>('vacation')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const [creditSick, setCreditSick] = useState(10)
  const [creditVacation, setCreditVacation] = useState(15)
  const [creditEmergency, setCreditEmergency] = useState(5)

  const branches = useMemo(
    () => getBranches().filter((b) => b.status === 'active' && b.branchType !== 'warehouse'),
    [],
  )

  const scopedBranchId = peopleOps ? branchFilter || null : user?.branchId || null

  async function refresh() {
    setLoading(true)
    try {
      const [staff, rows] = await Promise.all([
        listDirectoryStaff(),
        listLeaveRequests({
          branchId: scopedBranchId || undefined,
          status: statusFilter === 'all' ? 'all' : statusFilter,
          year,
        }),
      ])
      let staffList = staff.filter((s) => s.status === 'active')
      if (!peopleOps && user?.branchId) {
        staffList = staffList.filter((s) => s.branchId === user.branchId)
      } else if (branchFilter) {
        staffList = staffList.filter((s) => s.branchId === branchFilter)
      }
      const balanceMap = await listLeaveBalancesForUsers(
        staffList.slice(0, 80).map((s) => s.id),
        year,
      )
      const balanceRecord: Record<string, LeaveBalance> = {}
      for (const [id, bal] of balanceMap) balanceRecord[id] = bal

      setEmployees(staffList)
      setBalancesByUser(balanceRecord)
      setRequests(
        rows.filter((r) => {
          if (!peopleOps && user?.branchId) return r.branchId === user.branchId || !r.branchId
          return true
        }),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load leave data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    let inflight = false

    async function run() {
      if (inflight || cancelled) return
      inflight = true
      try {
        await refresh()
      } finally {
        inflight = false
      }
    }

    void run()
    return subscribeLeave(() => {
      void run()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, branchFilter, user?.id])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return requests
    return requests.filter((r) => {
      const hay = `${r.employeeName} ${r.employeeEmail ?? ''} ${r.branchName} ${r.leaveType} ${r.status}`.toLowerCase()
      return hay.includes(q)
    })
  }, [requests, query])

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  async function handleApprove(row: LeaveRequest) {
    if (!user || !canApproveLeave(user, row.branchId)) {
      toast.error('You cannot approve this leave')
      return
    }
    try {
      await reviewLeaveRequest({
        id: row.id,
        status: 'approved',
        reviewerId: user.id,
        reviewerName: user.fullName,
      })
      toast.success(`Approved leave for ${row.employeeName}`)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approve failed')
    }
  }

  async function handleReject(row: LeaveRequest) {
    if (!user || !canApproveLeave(user, row.branchId)) {
      toast.error('You cannot reject this leave')
      return
    }
    try {
      await reviewLeaveRequest({
        id: row.id,
        status: 'rejected',
        reviewerId: user.id,
        reviewerName: user.fullName,
        reviewNote: 'Rejected by approver',
      })
      toast.success(`Rejected leave for ${row.employeeName}`)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reject failed')
    }
  }

  async function openCredits(employeeId: string) {
    setSelectedEmployeeId(employeeId)
    try {
      const bal = await getLeaveBalance(employeeId, year)
      setCreditSick(bal.sickDays)
      setCreditVacation(bal.vacationDays)
      setCreditEmergency(bal.emergencyDays)
      setCreditsOpen(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load credits')
    }
  }

  async function saveCredits() {
    if (!selectedEmployeeId) return
    setSaving(true)
    try {
      await setLeaveCredits({
        userId: selectedEmployeeId,
        year,
        sickDays: creditSick,
        vacationDays: creditVacation,
        emergencyDays: creditEmergency,
      })
      toast.success('Leave credits updated')
      setCreditsOpen(false)
      const bal = await getLeaveBalance(selectedEmployeeId, year)
      setBalancesByUser((prev) => ({ ...prev, [selectedEmployeeId]: bal }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save credits')
    } finally {
      setSaving(false)
    }
  }

  async function handleDesignate(e: FormEvent) {
    e.preventDefault()
    if (!user || !selectedEmployeeId) return
    const emp = employees.find((s) => s.id === selectedEmployeeId)
    if (!emp) {
      toast.error('Select an employee')
      return
    }
    if (!canApproveLeave(user, emp.branchId)) {
      toast.error('You cannot designate leave for this employee')
      return
    }
    setSaving(true)
    try {
      await designateLeave({
        userId: emp.id,
        employeeName: emp.fullName,
        employeeEmail: emp.email,
        branchId: emp.branchId,
        branchName: emp.branchName,
        leaveType,
        startDate,
        endDate,
        reason,
        reviewerId: user.id,
        reviewerName: user.fullName,
        source: peopleOps ? 'hr_designated' : 'manager_designated',
      })
      toast.success(`Leave designated for ${emp.fullName}`)
      setDesignateOpen(false)
      setReason('')
      setStartDate('')
      setEndDate('')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not designate leave')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Leave Management"
        description="Approve employee leave requests and designate sick, vacation, or emergency leave. Clinic managers and HQ can also approve for their scope."
        actions={
          <Button
            type="button"
            variant="gold"
            className="gap-1.5"
            onClick={() => {
              setSelectedEmployeeId(employees[0]?.id || '')
              setDesignateOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Designate leave
          </Button>
        }
        stat={{ value: pendingCount, label: 'Pending' }}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Pending approvals" value={String(pendingCount)} />
        <KpiCard
          label="Approved this year"
          value={String(requests.filter((r) => r.status === 'approved').length)}
        />
        <KpiCard label="Employees in scope" value={String(employees.length)} />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-ui">
            Status
            <select
              className="mt-1 block min-w-[140px] rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
          </label>
          {peopleOps ? (
            <label className="text-xs font-medium text-slate-ui">
              Branch
              <select
                className="mt-1 block min-w-[180px] rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="">All clinics</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee, branch, leave type…"
              className="w-full rounded-[10px] border border-border bg-white py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Employee</th>
                <th className="px-2 py-3">Type</th>
                <th className="px-2 py-3">Dates</th>
                <th className="px-2 py-3">Days</th>
                <th className="px-2 py-3">Source</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-2 py-8 text-center text-slate-ui">
                    Loading leave requests…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-8 text-center text-slate-ui">
                    No leave requests for this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border/70 hover:bg-ivory-100">
                    <td className="px-2 py-3">
                      <p className="font-semibold text-[#073D2C]">{r.employeeName}</p>
                      <p className="text-[11px] text-slate-ui">
                        {r.branchName || '—'} · {r.employeeEmail || '—'}
                      </p>
                    </td>
                    <td className="px-2 py-3">{LEAVE_TYPE_LABELS[r.leaveType]}</td>
                    <td className="px-2 py-3 text-slate-ui">
                      {r.startDate} → {r.endDate}
                    </td>
                    <td className="px-2 py-3 font-medium">{r.days}</td>
                    <td className="px-2 py-3 text-xs text-slate-ui">
                      {r.source === 'employee_applied'
                        ? 'Employee'
                        : r.source === 'hr_designated'
                          ? 'HR designated'
                          : 'Manager designated'}
                    </td>
                    <td className="px-2 py-3">
                      <Badge variant={statusTone(r.status)}>{r.status}</Badge>
                      {r.reviewedByName ? (
                        <p className="mt-1 text-[10px] text-slate-ui">by {r.reviewedByName}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-3">
                      {r.status === 'pending' && canApproveLeave(user, r.branchId) ? (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            title="Approve"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            onClick={() => void handleApprove(r)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Reject"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-red-50 text-red-700 hover:bg-red-100"
                            onClick={() => void handleReject(r)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="text-xs font-semibold text-emerald-900 hover:underline"
                          onClick={() => void openCredits(r.userId)}
                        >
                          Credits
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl text-[#073D2C]">Employee leave credits ({year})</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Employee</th>
                <th className="px-2 py-3">Branch</th>
                <th className="px-2 py-3">Sick left</th>
                <th className="px-2 py-3">Vacation left</th>
                <th className="px-2 py-3">Emergency left</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.slice(0, 80).map((emp) => {
                const bal = balancesByUser[emp.id]
                return (
                  <tr key={emp.id} className="border-t border-border/70">
                    <td className="px-2 py-3 font-semibold text-[#073D2C]">{emp.fullName}</td>
                    <td className="px-2 py-3 text-slate-ui">{emp.branchName || '—'}</td>
                    <td className="px-2 py-3">{bal ? remainingCredits(bal, 'sick') : '…'}</td>
                    <td className="px-2 py-3">{bal ? remainingCredits(bal, 'vacation') : '…'}</td>
                    <td className="px-2 py-3">{bal ? remainingCredits(bal, 'emergency') : '…'}</td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="text-xs font-semibold text-emerald-900 hover:underline"
                          onClick={() => void openCredits(emp.id)}
                        >
                          Edit credits
                        </button>
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#C5A059] hover:underline"
                          onClick={() => {
                            setSelectedEmployeeId(emp.id)
                            setDesignateOpen(true)
                          }}
                        >
                          Designate
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={designateOpen}
        onClose={() => setDesignateOpen(false)}
        title="Designate leave"
        description="Assign leave to an employee. This is approved immediately and deducts leave credits."
        confirmLabel={saving ? 'Saving…' : 'Designate & approve'}
        onConfirm={() => {
          const form = document.getElementById('designate-leave-form') as HTMLFormElement | null
          form?.requestSubmit()
        }}
      >
        <form id="designate-leave-form" onSubmit={handleDesignate} className="space-y-3">
          <label className="block">
            <span className={labelClass}>Employee</span>
            <select
              className={fieldClass}
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} · {e.branchName || '—'}
                </option>
              ))}
            </select>
          </label>
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
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className={labelClass}>Start</span>
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
              <span className={labelClass}>End</span>
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
            <span className={labelClass}>Note</span>
            <textarea
              className={cn(fieldClass, 'min-h-[70px] resize-y')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        </form>
      </Dialog>

      <Dialog
        open={creditsOpen}
        onClose={() => setCreditsOpen(false)}
        title="Set leave credits"
        description={`Annual credits for ${year}. Used days stay as recorded.`}
        confirmLabel={saving ? 'Saving…' : 'Save credits'}
        onConfirm={() => void saveCredits()}
      >
        <div className="grid gap-3">
          <label className="block">
            <span className={labelClass}>Sick leave days</span>
            <input
              type="number"
              min={0}
              className={fieldClass}
              value={creditSick}
              onChange={(e) => setCreditSick(Number(e.target.value) || 0)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Vacation leave days</span>
            <input
              type="number"
              min={0}
              className={fieldClass}
              value={creditVacation}
              onChange={(e) => setCreditVacation(Number(e.target.value) || 0)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Emergency leave days</span>
            <input
              type="number"
              min={0}
              className={fieldClass}
              value={creditEmergency}
              onChange={(e) => setCreditEmergency(Number(e.target.value) || 0)}
            />
          </label>
        </div>
      </Dialog>
    </div>
  )
}
