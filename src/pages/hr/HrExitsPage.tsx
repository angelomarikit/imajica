import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  MessageSquare,
  Search,
  Upload,
  UserMinus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { useAuth } from '@/contexts/AuthContext'
import { getBranches } from '@/services/branchService'
import {
  createExit,
  EXIT_REASON_OPTIONS,
  EXIT_REQUIREMENTS,
  exitChecklistProgress,
  hasExitDocument,
  isExitInterviewComplete,
  listExits,
  pendingExitRequirements,
  resolveExitDocumentUrl,
  saveExitInterview,
  setExitRequirement,
  subscribeExits,
  updateExitDetails,
  uploadExitDocument,
  type EmployeeExitRecord,
  type ExitInterview,
  type ExitRequirementId,
} from '@/services/exitService'
import { listDirectoryStaff } from '@/services/staffDirectoryService'
import type { Staff } from '@/types'
import { cn } from '@/utils/cn'

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-[#073D2C] outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10'
const labelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-ui'

const GROUP_LABEL = {
  interview: 'Exit interview & notice',
  clearance: 'Turnover / clearance',
  pay_docs: 'Final pay & documents',
} as const

type ModalTab = 'details' | 'interview' | 'checklist'

const emptyAdd = {
  staffKey: '',
  resignationDate: new Date().toISOString().slice(0, 10),
  lastWorkingDay: '',
  reason: '',
  reasonNotes: '',
}

export function HrExitsPage() {
  const { user } = useAuth()
  const [exits, setExits] = useState<EmployeeExitRecord[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [branchId, setBranchId] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'cleared'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState(emptyAdd)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<EmployeeExitRecord | null>(null)
  const [tab, setTab] = useState<ModalTab>('details')
  const [interviewDraft, setInterviewDraft] = useState<ExitInterview>({})
  const [detailsDraft, setDetailsDraft] = useState({
    resignationDate: '',
    lastWorkingDay: '',
    reason: '',
    reasonNotes: '',
    notes: '',
  })
  const [savingId, setSavingId] = useState<string | null>(null)
  const [uploadTarget, setUploadTarget] = useState<ExitRequirementId | null>(null)
  const [preview, setPreview] = useState<{
    title: string
    url: string
    mime?: string | null
    fileName?: string | null
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const branches = useMemo(
    () => getBranches().filter((b) => b.status === 'active' && b.branchType !== 'warehouse'),
    [],
  )

  async function refresh() {
    setLoading(true)
    try {
      const [exitRows, staffRows] = await Promise.all([listExits(), listDirectoryStaff()])
      setExits(exitRows.filter((e) => e.status !== 'cancelled'))
      setStaff(staffRows.filter((s) => s.status === 'active'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load exits')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    return subscribeExits(() => {
      void refresh()
    })
  }, [])

  useEffect(() => {
    if (!selected) return
    const latest = exits.find((e) => e.id === selected.id)
    if (latest) {
      setSelected(latest)
      setInterviewDraft(latest.exitInterview)
      setDetailsDraft({
        resignationDate: latest.resignationDate,
        lastWorkingDay: latest.lastWorkingDay,
        reason: latest.reason,
        reasonNotes: latest.reasonNotes,
        notes: latest.notes || '',
      })
    }
  }, [exits, selected?.id])

  const filtered = useMemo(() => {
    let list = exits
    if (branchId) list = list.filter((e) => e.branchId === branchId)
    if (statusFilter !== 'all') list = list.filter((e) => e.status === statusFilter)
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((e) => {
      const hay = `${e.fullName} ${e.email} ${e.jobTitle} ${e.branchName} ${e.reason}`.toLowerCase()
      return hay.includes(q)
    })
  }, [exits, branchId, statusFilter, query])

  const stats = useMemo(() => {
    const inProgress = exits.filter((e) => e.status === 'in_progress').length
    const cleared = exits.filter((e) => e.status === 'cleared').length
    const pendingItems = exits.reduce((s, e) => s + pendingExitRequirements(e).length, 0)
    return { total: exits.length, inProgress, cleared, pendingItems }
  }, [exits])

  function openExit(row: EmployeeExitRecord) {
    setSelected(row)
    setTab('details')
    setInterviewDraft(row.exitInterview)
    setDetailsDraft({
      resignationDate: row.resignationDate,
      lastWorkingDay: row.lastWorkingDay,
      reason: row.reason,
      reasonNotes: row.reasonNotes,
      notes: row.notes || '',
    })
  }

  async function handleAdd() {
    const chosen = staff.find((s) => (s.profileId || s.id) === addForm.staffKey || s.id === addForm.staffKey)
    if (!chosen && !addForm.staffKey) {
      toast.error('Select an employee')
      return
    }
    if (!chosen) {
      toast.error('Select an employee')
      return
    }
    setSaving(true)
    try {
      const created = await createExit({
        profileId: chosen.profileId || chosen.id,
        // Directory id is usually a profile id — service resolves real staff.id if one exists
        staffId: null,
        fullName: chosen.fullName,
        email: chosen.email,
        phone: chosen.phone,
        jobTitle: chosen.title || chosen.role,
        branchId: chosen.branchId || null,
        resignationDate: addForm.resignationDate,
        lastWorkingDay: addForm.lastWorkingDay,
        reason: addForm.reason,
        reasonNotes: addForm.reasonNotes,
        createdBy: user?.id,
      })
      toast.success(`Started exit process for ${created.fullName}`)
      setAddOpen(false)
      setAddForm(emptyAdd)
      await refresh()
      openExit(created)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create exit')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDetails() {
    if (!selected) return
    setSaving(true)
    try {
      const updated = await updateExitDetails(selected.id, {
        resignationDate: detailsDraft.resignationDate,
        lastWorkingDay: detailsDraft.lastWorkingDay,
        reason: detailsDraft.reason,
        reasonNotes: detailsDraft.reasonNotes,
        notes: detailsDraft.notes,
      })
      setSelected(updated)
      toast.success('Exit details saved')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save details')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveInterview() {
    if (!selected) return
    setSaving(true)
    try {
      const draft = {
        ...interviewDraft,
        conductedAt: interviewDraft.conductedAt || new Date().toISOString().slice(0, 10),
        interviewerName: interviewDraft.interviewerName || user?.fullName || '',
      }
      const updated = await saveExitInterview(selected.id, draft)
      setSelected(updated)
      setInterviewDraft(updated.exitInterview)
      toast.success(
        isExitInterviewComplete(updated.exitInterview)
          ? 'Exit interview saved and marked complete'
          : 'Exit interview draft saved',
      )
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save interview')
    } finally {
      setSaving(false)
    }
  }

  async function toggleReq(exit: EmployeeExitRecord, requirementId: ExitRequirementId, done: boolean) {
    const req = EXIT_REQUIREMENTS.find((r) => r.id === requirementId)
    if (done && requirementId === 'exit_interview' && !isExitInterviewComplete(exit.exitInterview)) {
      toast.error('Fill in the exit interview tab first')
      setTab('interview')
      return
    }
    if (done && req?.requiresDocument && !hasExitDocument(exit.checklist[requirementId])) {
      toast.error('Upload a document first, then mark it complete')
      return
    }
    setSavingId(`${exit.id}:${requirementId}`)
    try {
      const updated = await setExitRequirement({ id: exit.id, requirementId, done })
      setSelected(updated)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update checklist')
    } finally {
      setSavingId(null)
    }
  }

  function startUpload(requirementId: ExitRequirementId) {
    setUploadTarget(requirementId)
    fileInputRef.current?.click()
  }

  async function onFileChosen(fileList: FileList | null) {
    if (!selected || !uploadTarget || !fileList?.[0]) {
      setUploadTarget(null)
      return
    }
    const file = fileList[0]
    setSavingId(`${selected.id}:${uploadTarget}:upload`)
    try {
      const updated = await uploadExitDocument({
        exitId: selected.id,
        requirementId: uploadTarget,
        file,
      })
      setSelected(updated)
      toast.success(`Uploaded ${file.name}`)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setSavingId(null)
      setUploadTarget(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function viewDocument(exit: EmployeeExitRecord, requirementId: ExitRequirementId, label: string) {
    const state = exit.checklist[requirementId]
    if (!hasExitDocument(state)) {
      toast.message('No document uploaded yet')
      return
    }
    setSavingId(`${exit.id}:${requirementId}:view`)
    try {
      const url = await resolveExitDocumentUrl(state.fileUrl)
      if (!url) {
        toast.error('Could not open document')
        return
      }
      setPreview({ title: label, url, mime: state.fileMime, fileName: state.fileName })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open document')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Resignation / Exits"
        description="Start an exit for any employee, conduct the exit interview, and clear turnover items in one place."
        stat={{ value: stats.inProgress, label: 'In progress' }}
        actions={
          <Button variant="gold" onClick={() => setAddOpen(true)}>
            <UserMinus className="h-4 w-4" /> Start exit
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active exits" value={String(stats.total)} icon={<UserMinus className="h-5 w-5" />} />
        <KpiCard
          label="In progress"
          value={String(stats.inProgress)}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <KpiCard label="Cleared" value={String(stats.cleared)} icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard
          label="Open checklist items"
          value={String(stats.pendingItems)}
          icon={<MessageSquare className="h-5 w-5" />}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-ui">
            Clinic
            <select
              className={cn(fieldClass, 'mt-1 block min-w-[180px]')}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
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
            Status
            <select
              className={cn(fieldClass, 'mt-1 block min-w-[140px]')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="all">All</option>
              <option value="in_progress">In progress</option>
              <option value="cleared">Cleared</option>
            </select>
          </label>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, role, reason..."
              className="w-full rounded-[10px] border border-border bg-white py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-center text-sm text-slate-ui">Loading exits...</p>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-center text-sm text-slate-ui">
            No resignation / exit records yet. Click Start exit to begin.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((e) => {
              const prog = exitChecklistProgress(e)
              const pending = pendingExitRequirements(e).slice(0, 4)
              const cleared = e.status === 'cleared'
              const interviewDone = isExitInterviewComplete(e.exitInterview)
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => openExit(e)}
                  className="rounded-[14px] border border-border bg-white p-4 text-left shadow-[0_1px_3px_rgba(10,46,38,0.04)] transition hover:border-emerald-800/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#073D2C]">{e.fullName}</p>
                      <p className="truncate text-[11px] text-slate-ui">
                        {e.jobTitle || 'Staff'} · {e.branchName || 'Clinic TBD'}
                      </p>
                    </div>
                    <Badge variant={cleared ? 'success' : 'warning'}>
                      {cleared ? 'Cleared' : 'In progress'}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-[10px] bg-ivory-50 px-2.5 py-2">
                      <p className="text-slate-ui">Last day</p>
                      <p className="font-semibold text-[#073D2C]">{e.lastWorkingDay || 'TBD'}</p>
                    </div>
                    <div className="rounded-[10px] bg-ivory-50 px-2.5 py-2">
                      <p className="text-slate-ui">Interview</p>
                      <p className="font-semibold text-[#073D2C]">{interviewDone ? 'Done' : 'Pending'}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-slate-ui">
                      <span>Turnover checklist</span>
                      <span className="font-semibold text-[#073D2C]">
                        {prog.done}/{prog.total}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ivory-100">
                      <div
                        className={cn('h-full rounded-full', cleared ? 'bg-emerald-700' : 'bg-amber-500')}
                        style={{ width: `${prog.pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <p className={labelClass}>Still needed</p>
                    {pending.length === 0 ? (
                      <p className="text-xs text-emerald-800">All clearance items complete</p>
                    ) : (
                      pending.map((r) => (
                        <p key={r.id} className="truncate text-xs text-[#073D2C]">
                          · {r.label}
                        </p>
                      ))
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-emerald-950/45"
            aria-label="Close"
            onClick={() => setAddOpen(false)}
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[12px] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-display text-lg font-semibold text-charcoal">Start resignation / exit</h3>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-ui hover:bg-ivory-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <label className="block">
                <span className={labelClass}>Employee *</span>
                <select
                  className={fieldClass}
                  value={addForm.staffKey}
                  onChange={(e) => setAddForm((f) => ({ ...f, staffKey: e.target.value }))}
                >
                  <option value="">Select employee</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.profileId || s.id}>
                      {s.fullName}
                      {s.branchName ? ` · ${s.branchName}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Resignation date</span>
                  <input
                    type="date"
                    className={fieldClass}
                    value={addForm.resignationDate}
                    onChange={(e) => setAddForm((f) => ({ ...f, resignationDate: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Last working day</span>
                  <input
                    type="date"
                    className={fieldClass}
                    value={addForm.lastWorkingDay}
                    onChange={(e) => setAddForm((f) => ({ ...f, lastWorkingDay: e.target.value }))}
                  />
                </label>
              </div>
              <label className="block">
                <span className={labelClass}>Primary reason</span>
                <select
                  className={fieldClass}
                  value={addForm.reason}
                  onChange={(e) => setAddForm((f) => ({ ...f, reason: e.target.value }))}
                >
                  <option value="">Select reason</option>
                  {EXIT_REASON_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Notes</span>
                <textarea
                  className={cn(fieldClass, 'min-h-[80px] resize-y')}
                  value={addForm.reasonNotes}
                  onChange={(e) => setAddForm((f) => ({ ...f, reasonNotes: e.target.value }))}
                  placeholder="Optional context for HR"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button variant="gold" disabled={saving} onClick={() => void handleAdd()}>
                {saving ? 'Saving...' : 'Start exit'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-emerald-950/45"
            aria-label="Close"
            onClick={() => setSelected(null)}
          />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[12px] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-charcoal">{selected.fullName}</h3>
                <p className="text-xs text-slate-ui">
                  {selected.jobTitle || 'Staff'}
                  {selected.branchName ? ` · ${selected.branchName}` : ''} · Resigned{' '}
                  {selected.resignationDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-ui hover:bg-ivory-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-1 border-b border-border px-3 pt-2">
              {(
                [
                  { id: 'details', label: 'Exit details' },
                  { id: 'interview', label: 'Exit interview' },
                  { id: 'checklist', label: 'Turnover checklist' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'rounded-t-[10px] px-3 py-2 text-sm font-medium',
                    tab === t.id
                      ? 'bg-ivory-50 text-[#073D2C]'
                      : 'text-slate-ui hover:text-[#073D2C]',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={(e) => void onFileChosen(e.target.files)}
            />

            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              {tab === 'details' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={selected.status === 'cleared' ? 'success' : 'warning'}>
                      {selected.status === 'cleared' ? 'Cleared' : 'In progress'}
                    </Badge>
                    <span className="text-xs text-slate-ui">
                      Checklist {exitChecklistProgress(selected).done}/{exitChecklistProgress(selected).total}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelClass}>Resignation date</span>
                      <input
                        type="date"
                        className={fieldClass}
                        value={detailsDraft.resignationDate}
                        onChange={(e) =>
                          setDetailsDraft((d) => ({ ...d, resignationDate: e.target.value }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Last working day</span>
                      <input
                        type="date"
                        className={fieldClass}
                        value={detailsDraft.lastWorkingDay}
                        onChange={(e) =>
                          setDetailsDraft((d) => ({ ...d, lastWorkingDay: e.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className={labelClass}>Primary reason</span>
                    <select
                      className={fieldClass}
                      value={detailsDraft.reason}
                      onChange={(e) => setDetailsDraft((d) => ({ ...d, reason: e.target.value }))}
                    >
                      <option value="">Select reason</option>
                      {EXIT_REASON_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelClass}>Reason notes</span>
                    <textarea
                      className={cn(fieldClass, 'min-h-[72px] resize-y')}
                      value={detailsDraft.reasonNotes}
                      onChange={(e) => setDetailsDraft((d) => ({ ...d, reasonNotes: e.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>HR notes</span>
                    <textarea
                      className={cn(fieldClass, 'min-h-[72px] resize-y')}
                      value={detailsDraft.notes}
                      onChange={(e) => setDetailsDraft((d) => ({ ...d, notes: e.target.value }))}
                    />
                  </label>
                  <Button variant="gold" disabled={saving} onClick={() => void handleSaveDetails()}>
                    {saving ? 'Saving...' : 'Save details'}
                  </Button>
                </div>
              ) : null}

              {tab === 'interview' ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-ui">
                    Complete the interview below. Saving with date, interviewer, reason, and rehire
                    eligibility will auto-check the interview checklist items.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelClass}>Interview date</span>
                      <input
                        type="date"
                        className={fieldClass}
                        value={interviewDraft.conductedAt || ''}
                        onChange={(e) =>
                          setInterviewDraft((d) => ({ ...d, conductedAt: e.target.value }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Interviewer</span>
                      <input
                        className={fieldClass}
                        value={interviewDraft.interviewerName || ''}
                        onChange={(e) =>
                          setInterviewDraft((d) => ({ ...d, interviewerName: e.target.value }))
                        }
                        placeholder={user?.fullName || 'HR name'}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className={labelClass}>Why are you leaving?</span>
                    <textarea
                      className={cn(fieldClass, 'min-h-[80px] resize-y')}
                      value={interviewDraft.reasonForLeaving || ''}
                      onChange={(e) =>
                        setInterviewDraft((d) => ({ ...d, reasonForLeaving: e.target.value }))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>What went well?</span>
                    <textarea
                      className={cn(fieldClass, 'min-h-[72px] resize-y')}
                      value={interviewDraft.whatWentWell || ''}
                      onChange={(e) =>
                        setInterviewDraft((d) => ({ ...d, whatWentWell: e.target.value }))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>What could we improve?</span>
                    <textarea
                      className={cn(fieldClass, 'min-h-[72px] resize-y')}
                      value={interviewDraft.whatCouldImprove || ''}
                      onChange={(e) =>
                        setInterviewDraft((d) => ({ ...d, whatCouldImprove: e.target.value }))
                      }
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelClass}>Would recommend Imajica?</span>
                      <select
                        className={fieldClass}
                        value={interviewDraft.wouldRecommend || ''}
                        onChange={(e) =>
                          setInterviewDraft((d) => ({
                            ...d,
                            wouldRecommend: e.target.value as ExitInterview['wouldRecommend'],
                          }))
                        }
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="maybe">Maybe</option>
                        <option value="no">No</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelClass}>Eligible for rehire?</span>
                      <select
                        className={fieldClass}
                        value={interviewDraft.rehireEligible || ''}
                        onChange={(e) =>
                          setInterviewDraft((d) => ({
                            ...d,
                            rehireEligible: e.target.value as ExitInterview['rehireEligible'],
                          }))
                        }
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="maybe">Maybe</option>
                        <option value="no">No</option>
                      </select>
                    </label>
                  </div>
                  <label className="block">
                    <span className={labelClass}>Additional notes</span>
                    <textarea
                      className={cn(fieldClass, 'min-h-[72px] resize-y')}
                      value={interviewDraft.additionalNotes || ''}
                      onChange={(e) =>
                        setInterviewDraft((d) => ({ ...d, additionalNotes: e.target.value }))
                      }
                    />
                  </label>
                  <Button variant="gold" disabled={saving} onClick={() => void handleSaveInterview()}>
                    {saving ? 'Saving...' : 'Save exit interview'}
                  </Button>
                </div>
              ) : null}

              {tab === 'checklist' ? (
                <div className="space-y-5">
                  <p className="text-xs text-slate-ui">
                    Work through turnover items. Items that need proof require Upload before you can
                    check them off.
                  </p>
                  {(['interview', 'clearance', 'pay_docs'] as const).map((group) => {
                    const items = EXIT_REQUIREMENTS.filter((r) => r.group === group)
                    return (
                      <div key={group}>
                        <p className={labelClass}>{GROUP_LABEL[group]}</p>
                        <ul className="mt-2 space-y-2">
                          {items.map((req) => {
                            const state = selected.checklist[req.id]
                            const done = Boolean(state?.done)
                            const hasDoc = hasExitDocument(state)
                            const needsDoc = req.requiresDocument
                            const interviewGate =
                              (req.id === 'exit_interview' || req.id === 'exit_notes_filed') &&
                              !isExitInterviewComplete(selected.exitInterview)
                            const canCheck = done
                              ? true
                              : req.id === 'exit_interview' || req.id === 'exit_notes_filed'
                                ? !interviewGate
                                : needsDoc
                                  ? hasDoc
                                  : true
                            const busy =
                              savingId === `${selected.id}:${req.id}` ||
                              savingId === `${selected.id}:${req.id}:upload` ||
                              savingId === `${selected.id}:${req.id}:view`
                            return (
                              <li
                                key={req.id}
                                className={cn(
                                  'flex items-start gap-3 rounded-[12px] border px-3 py-2.5',
                                  done ? 'border-emerald-200 bg-emerald-50/50' : 'border-border bg-white',
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 accent-emerald-800"
                                  checked={done}
                                  disabled={busy || (!done && !canCheck)}
                                  onChange={(e) => void toggleReq(selected, req.id, e.target.checked)}
                                />
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={cn(
                                      'text-sm font-medium',
                                      done ? 'text-emerald-900' : 'text-[#073D2C]',
                                    )}
                                  >
                                    {req.label}
                                  </p>
                                  <p className="text-[11px] text-slate-ui">{req.hint}</p>
                                  {needsDoc ? (
                                    hasDoc ? (
                                      <p className="mt-1 truncate text-[11px] font-medium text-emerald-800">
                                        File: {state?.fileName || 'Uploaded'}
                                      </p>
                                    ) : (
                                      <p className="mt-1 text-[11px] text-amber-700">
                                        Document required before check
                                      </p>
                                    )
                                  ) : null}
                                  {interviewGate ? (
                                    <p className="mt-1 text-[11px] text-amber-700">
                                      Complete Exit interview tab first
                                    </p>
                                  ) : null}
                                </div>
                                {needsDoc ? (
                                  <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      disabled={busy}
                                      onClick={() => startUpload(req.id)}
                                    >
                                      <Upload className="h-3.5 w-3.5" />
                                      Upload
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      disabled={busy || !hasDoc}
                                      onClick={() => void viewDocument(selected, req.id, req.label)}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      View
                                    </Button>
                                  </div>
                                ) : null}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>

            <div className="border-t border-border px-5 py-3">
              <Button className="w-full" variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-emerald-950/55"
            aria-label="Close preview"
            onClick={() => setPreview(null)}
          />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[12px] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-base font-semibold text-charcoal">
                  {preview.title}
                </h3>
                {preview.fileName ? (
                  <p className="truncate text-xs text-slate-ui">{preview.fileName}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.open(preview.url, '_blank', 'noopener,noreferrer')}
                >
                  Open in tab
                </Button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-ui hover:bg-ivory-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-ivory-50 p-3">
              {preview.mime?.startsWith('image/') || preview.url.startsWith('data:image/') ? (
                <img
                  src={preview.url}
                  alt={preview.title}
                  className="mx-auto max-h-[75vh] max-w-full object-contain"
                />
              ) : (
                <iframe
                  title={preview.title}
                  src={preview.url}
                  className="h-[75vh] w-full rounded-[8px] bg-white"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
