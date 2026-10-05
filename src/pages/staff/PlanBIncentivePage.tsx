import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { getBranches } from '@/services/branchService'
import {
  currentPeriodMonth,
  deletePlanBIncentive,
  formatPeriodMonthLabel,
  getPlanBIncentives,
  preloadPlanBIncentives,
  savePlanBIncentive,
  subscribePlanBIncentives,
} from '@/services/planBIncentiveService'
import { matchesStaffBranch } from '@/services/staffDirectoryService'
import { getAccessUsers } from '@/services/userAccessService'
import type { PlanBIncentive } from '@/types'
import { formatPesoExact } from '@/utils/currency'
import { canAccessPeopleOps, isFranchiseBranchOwner } from '@/utils/franchiseAccess'
import { formatRoleLabel } from '@/utils/roleLabels'

type Recipient = {
  id: string
  fullName: string
  role: string
  branchId: string
  branchName: string
}

function monthInputValue(periodMonth: string) {
  return periodMonth || currentPeriodMonth()
}

export function PlanBIncentivePage() {
  const { user } = useAuth()
  const forcedBranchId = useForcedBranchId()
  const isHq = canAccessPeopleOps(user)
  const branchOwner = isFranchiseBranchOwner(user)
  const [tick, setTick] = useState(0)
  const [loading, setLoading] = useState(true)
  const [periodFilter, setPeriodFilter] = useState(currentPeriodMonth())
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<PlanBIncentive | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlanBIncentive | null>(null)
  const [saving, setSaving] = useState(false)

  const [staffUserId, setStaffUserId] = useState('')
  const [periodMonth, setPeriodMonth] = useState(currentPeriodMonth())
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    let cancelled = false
    void preloadPlanBIncentives().then(() => {
      if (!cancelled) {
        setTick((n) => n + 1)
        setLoading(false)
      }
    })
    return subscribePlanBIncentives(() => setTick((n) => n + 1))
  }, [])

  const branchId = forcedBranchId || user?.branchId || ''
  const branchName =
    user?.branchName || getBranches().find((b) => b.id === branchId)?.name || 'Branch'

  const recipients = useMemo((): Recipient[] => {
    void tick
    const users = getAccessUsers().filter((u) => u.status === 'active')
    if (branchOwner && branchId) {
      const list = users
        .filter((u) => matchesStaffBranch(u, branchId))
        .map((u) => ({
          id: u.id,
          fullName: u.fullName,
          role: u.role,
          branchId: u.branchId || branchId,
          branchName: u.branchName || branchName,
        }))
      // Ensure the clinic manager can award themselves even if directory is thin
      if (user && !list.some((r) => r.id === user.id)) {
        list.unshift({
          id: user.id,
          fullName: user.fullName,
          role: user.role,
          branchId,
          branchName,
        })
      }
      return list.sort((a, b) => a.fullName.localeCompare(b.fullName))
    }
    return users
      .filter((u) => u.role !== 'CLIENT')
      .map((u) => ({
        id: u.id,
        fullName: u.fullName,
        role: u.role,
        branchId: u.branchId || '',
        branchName: u.branchName || '',
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [tick, branchOwner, branchId, branchName, user])

  const rows = useMemo(() => {
    void tick
    return getPlanBIncentives().filter((r) => {
      if (periodFilter && r.periodMonth !== periodFilter) return false
      if (branchOwner && branchId && r.branchId !== branchId) return false
      return true
    })
  }, [tick, periodFilter, branchOwner, branchId])

  const monthTotal = useMemo(
    () => rows.reduce((sum, r) => sum + r.amount, 0),
    [rows],
  )

  function openCreate() {
    setEditing(null)
    setStaffUserId(user?.id || recipients[0]?.id || '')
    setPeriodMonth(periodFilter || currentPeriodMonth())
    setAmount('')
    setNotes('')
    setEditorOpen(true)
  }

  function openEdit(row: PlanBIncentive) {
    setEditing(row)
    setStaffUserId(row.staffUserId)
    setPeriodMonth(row.periodMonth)
    setAmount(String(row.amount))
    setNotes(row.notes || '')
    setEditorOpen(true)
  }

  async function handleSave() {
    if (!user) return
    const recipient = recipients.find((r) => r.id === staffUserId)
    if (!recipient) {
      toast.error('Select a staff member')
      return
    }
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (!periodMonth || !/^\d{4}-\d{2}$/.test(periodMonth)) {
      toast.error('Select a month')
      return
    }
    const targetBranchId = branchOwner ? branchId : recipient.branchId || branchId
    if (!targetBranchId) {
      toast.error('Branch is required')
      return
    }
    const targetBranchName =
      getBranches().find((b) => b.id === targetBranchId)?.name ||
      recipient.branchName ||
      branchName

    setSaving(true)
    try {
      await savePlanBIncentive({
        id: editing?.id,
        staffUserId: recipient.id,
        staffName: recipient.fullName,
        branchId: targetBranchId,
        branchName: targetBranchName,
        periodMonth,
        amount: value,
        notes,
        createdByUserId: user.id,
        createdByName: user.fullName,
      })
      toast.success(editing ? 'Plan B incentive updated' : 'Plan B incentive added')
      setEditorOpen(false)
      setPeriodFilter(periodMonth)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save Plan B incentive')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deletePlanBIncentive(deleteTarget.id)
      toast.success('Plan B incentive removed')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Plan B Incentive"
        description="Pass the KPI set by the branch. Add Plan B amounts for staff or yourself."
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-medium text-slate-ui">
              Month
              <input
                type="month"
                value={monthInputValue(periodFilter)}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="mt-1 block min-w-[160px] rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
              />
            </label>
            <div className="rounded-[10px] border border-border bg-[#faf9f7] px-4 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-ui">
                Month total
              </p>
              <p className="font-metric text-lg font-semibold text-[#073D2C]">
                {formatPesoExact(monthTotal)}
              </p>
            </div>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Plan B
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-[#faf9f7]">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                  Staff
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                  Month
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                  Amount
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                  Notes
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                  Added by
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-ui">
                    Loading Plan B incentives…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-ui">
                    No Plan B incentives for {formatPeriodMonthLabel(periodFilter)}.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#0a0a0a]">{row.staffName}</p>
                      <p className="text-xs text-slate-ui">{row.branchName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral">{formatPeriodMonthLabel(row.periodMonth)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-[#073D2C]">
                      {formatPesoExact(row.amount)}
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-xs text-slate-ui">
                      {row.notes || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-ui">{row.createdByName || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          aria-label="Edit"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          aria-label="Delete"
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {!branchOwner && !isHq ? (
        <p className="text-sm text-slate-ui">
          Only clinic managers and HQ can add Plan B incentives.
        </p>
      ) : null}

      <Dialog
        open={editorOpen}
        onClose={() => {
          if (!saving) setEditorOpen(false)
        }}
        title={editing ? 'Edit Plan B incentive' : 'Add Plan B incentive'}
        description="Enter the amount for the selected staff and month."
        confirmLabel={saving ? 'Saving…' : 'Save'}
        onConfirm={() => {
          if (!saving) void handleSave()
        }}
      >
        <div className="space-y-4">
          <label className="block text-xs font-medium text-slate-ui">
            Staff
            <select
              value={staffUserId}
              onChange={(e) => setStaffUserId(e.target.value)}
              className="mt-1 block w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
            >
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName}
                  {user?.id === r.id ? ' (You)' : ''} · {formatRoleLabel(r.role)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-ui">
            Month
            <input
              type="month"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className="mt-1 block w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-slate-ui">
            Amount (₱)
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 block w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-slate-ui">
            Notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
              placeholder="Reason or reference"
            />
          </label>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!saving) setDeleteTarget(null)
        }}
        title="Delete Plan B incentive?"
        description={
          deleteTarget
            ? `Remove ${formatPesoExact(deleteTarget.amount)} for ${deleteTarget.staffName} (${formatPeriodMonthLabel(deleteTarget.periodMonth)})?`
            : undefined
        }
        confirmLabel={saving ? 'Deleting…' : 'Delete'}
        destructive
        onConfirm={() => {
          if (!saving) void confirmDelete()
        }}
      />
    </div>
  )
}
