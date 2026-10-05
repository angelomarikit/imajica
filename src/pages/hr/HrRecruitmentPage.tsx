import { useEffect, useMemo, useState } from 'react'
import {
  Briefcase,
  CheckCircle2,
  Circle,
  Clock3,
  Plus,
  UserPlus,
  Users,
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
  APPLICANT_STATUS_LABELS,
  APPLICANT_STATUS_ORDER,
  createApplicant,
  listApplicants,
  listStageEvents,
  processStepsFor,
  statusVariant,
  subscribeRecruitment,
  updateApplicantStatus,
  type ApplicantStatus,
  type RecruitmentApplicant,
  type RecruitmentStageEvent,
} from '@/services/recruitmentService'
import { cn } from '@/utils/cn'

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-[#073D2C] outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10'
const labelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-ui'

const ALL_STATUSES: ApplicantStatus[] = [
  ...APPLICANT_STATUS_ORDER,
  'rejected',
  'withdrawn',
]

const emptyForm = {
  fullName: '',
  email: '',
  phone: '',
  appliedRole: '',
  branchId: '',
  source: '',
  notes: '',
}

export function HrRecruitmentPage() {
  const { user } = useAuth()
  const [applicants, setApplicants] = useState<RecruitmentApplicant[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [branchId, setBranchId] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApplicantStatus | ''>('')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<RecruitmentApplicant | null>(null)
  const [events, setEvents] = useState<RecruitmentStageEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [statusDraft, setStatusDraft] = useState<ApplicantStatus>('applied')
  const [statusNote, setStatusNote] = useState('')
  const [statusDate, setStatusDate] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const branches = useMemo(
    () => getBranches().filter((b) => b.status === 'active' && b.branchType !== 'warehouse'),
    [],
  )

  async function refresh() {
    setLoading(true)
    try {
      setApplicants(await listApplicants())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load applicants')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    return subscribeRecruitment(() => {
      void refresh()
    })
  }, [])

  useEffect(() => {
    if (!selected) {
      setEvents([])
      return
    }
    setStatusDraft(selected.status)
    setStatusNote('')
    setStatusDate('')
    setEventsLoading(true)
    void listStageEvents(selected.id)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false))
  }, [selected])

  const filtered = useMemo(() => {
    let list = applicants
    if (branchId) list = list.filter((a) => a.branchId === branchId)
    if (statusFilter) list = list.filter((a) => a.status === statusFilter)
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((a) => {
      const hay = `${a.fullName} ${a.email} ${a.phone} ${a.appliedRole} ${a.branchName} ${a.source || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [applicants, branchId, statusFilter, query])

  const stats = useMemo(() => {
    const open = applicants.filter((a) => !['hired', 'rejected', 'withdrawn'].includes(a.status)).length
    const interviews = applicants.filter((a) =>
      ['initial_interview', 'technical_interview', 'final_interview'].includes(a.status),
    ).length
    const offers = applicants.filter((a) => a.status === 'offer').length
    const hired = applicants.filter((a) => a.status === 'hired').length
    return { open, interviews, offers, hired }
  }, [applicants])

  async function handleAdd() {
    if (!form.fullName.trim() || !form.appliedRole.trim()) {
      toast.error('Name and applied role are required')
      return
    }
    setSaving(true)
    try {
      const created = await createApplicant({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        appliedRole: form.appliedRole,
        branchId: form.branchId || null,
        source: form.source,
        notes: form.notes,
        createdBy: user?.id,
        createdByName: user?.fullName,
      })
      toast.success(`Added ${created.fullName} to the pipeline`)
      setForm(emptyForm)
      setAddOpen(false)
      await refresh()
      setSelected(created)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add applicant')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusUpdate() {
    if (!selected) return
    setUpdatingStatus(true)
    try {
      const updated = await updateApplicantStatus({
        id: selected.id,
        status: statusDraft,
        note: statusNote,
        scheduledAt: statusDate || undefined,
        updatedBy: user?.id,
        updatedByName: user?.fullName,
      })
      toast.success(`Status set to ${APPLICANT_STATUS_LABELS[updated.status]}`)
      if (updated.status === 'hired') {
        toast.message('Moved to New Hires', {
          description: 'Open New Hires to tick off benefits and ops requirements.',
        })
      }
      setSelected(updated)
      setStatusNote('')
      setStatusDate('')
      await refresh()
      setEvents(await listStageEvents(updated.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const steps = selected ? processStepsFor(selected.status) : []

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Recruitment"
        description="Add applicants and track each candidate through initial interview, technical interview, final interview, offer, and hire."
        stat={{ value: stats.open, label: 'In pipeline' }}
        actions={
          <Button variant="gold" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add applicant
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Open pipeline" value={String(stats.open)} icon={<Briefcase className="h-5 w-5" />} />
        <KpiCard label="In interviews" value={String(stats.interviews)} icon={<Users className="h-5 w-5" />} />
        <KpiCard label="Offers out" value={String(stats.offers)} icon={<Clock3 className="h-5 w-5" />} />
        <KpiCard label="Hired" value={String(stats.hired)} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="min-w-0 flex-1">
            <span className={labelClass}>Search</span>
            <input
              className={fieldClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, role, email, clinic…"
            />
          </label>
          <label className="w-full lg:w-52">
            <span className={labelClass}>Clinic</span>
            <select className={fieldClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">All clinics</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="w-full lg:w-56">
            <span className={labelClass}>Status</span>
            <select
              className={fieldClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter((e.target.value || '') as ApplicantStatus | '')}
            >
              <option value="">All statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {APPLICANT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-ivory-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Clinic</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-ui">
                    Loading applicants…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="text-sm text-slate-ui">No applicants yet.</p>
                    <Button className="mt-3" variant="gold" onClick={() => setAddOpen(true)}>
                      <Plus className="h-4 w-4" /> Add first applicant
                    </Button>
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-emerald-50/40"
                    onClick={() => setSelected(a)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#073D2C]">{a.fullName}</p>
                      <p className="text-xs text-slate-ui">{a.email || a.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-[#073D2C]">{a.appliedRole}</td>
                    <td className="px-4 py-3 text-slate-ui">{a.branchName || 'All / TBD'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(a.status)}>{APPLICANT_STATUS_LABELS[a.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-ui">{a.appliedAt}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelected(a)
                        }}
                      >
                        View process
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
              <h3 className="font-display text-lg font-semibold tracking-tight text-charcoal">
                Add applicant
              </h3>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-ui hover:bg-ivory-100"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5 scrollbar-thin">
              <label className="block">
                <span className={labelClass}>Full name *</span>
                <input
                  className={fieldClass}
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Juan Dela Cruz"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Applied role *</span>
                <input
                  className={fieldClass}
                  value={form.appliedRole}
                  onChange={(e) => setForm((f) => ({ ...f, appliedRole: e.target.value }))}
                  placeholder="Nurse, Therapist, Front desk..."
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Email</span>
                  <input
                    className={fieldClass}
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Phone</span>
                  <input
                    className={fieldClass}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </label>
              </div>
              <label className="block">
                <span className={labelClass}>Clinic</span>
                <select
                  className={fieldClass}
                  value={form.branchId}
                  onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                >
                  <option value="">TBD / any clinic</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Source</span>
                <input
                  className={fieldClass}
                  value={form.source}
                  onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                  placeholder="Referral, JobStreet, walk-in..."
                />
              </label>
              <label className="block">
                <span className={labelClass}>Notes</span>
                <textarea
                  className={cn(fieldClass, 'min-h-[88px] resize-y')}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button variant="gold" disabled={saving} onClick={() => void handleAdd()}>
                {saving ? 'Saving...' : 'Add to pipeline'}
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
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[12px] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-display text-lg font-semibold tracking-tight text-charcoal">
                {selected.fullName}
              </h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-ui hover:bg-ivory-100"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto p-5 scrollbar-thin">
              <div className="rounded-[12px] border border-border bg-ivory-50/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-semibold text-[#073D2C]">{selected.fullName}</p>
                    <p className="text-sm text-slate-ui">
                      {selected.appliedRole}
                      {selected.branchName ? ` | ${selected.branchName}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-ui">
                      {[selected.email, selected.phone].filter(Boolean).join(' | ') || 'No contact yet'}
                    </p>
                  </div>
                  <Badge variant={statusVariant(selected.status)}>
                    {APPLICANT_STATUS_LABELS[selected.status]}
                  </Badge>
                </div>
                {selected.notes ? (
                  <p className="mt-3 text-sm text-[#073D2C]">{selected.notes}</p>
                ) : null}
              </div>

              <div>
                <p className={labelClass}>Hiring process</p>
                <ol className="mt-3 space-y-0">
                  {steps.map((step, i) => {
                    const done = step.state === 'done'
                    const current = step.state === 'current'
                    const closed = step.state === 'closed'
                    return (
                      <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
                        {i < steps.length - 1 ? (
                          <span
                            aria-hidden
                            className={cn(
                              'absolute left-[11px] top-6 w-px',
                              done ? 'bg-emerald-700/50' : 'bg-border',
                            )}
                            style={{ height: 'calc(100% - 12px)' }}
                          />
                        ) : null}
                        <span
                          className={cn(
                            'relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                            done && 'bg-emerald-800 text-white',
                            current && 'bg-gold-100 text-gold-600 ring-2 ring-gold-200',
                            !done && !current && 'bg-ivory-100 text-slate-ui',
                            closed && 'opacity-40',
                          )}
                        >
                          {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <p
                            className={cn(
                              'text-sm font-medium',
                              current ? 'text-[#073D2C]' : 'text-slate-ui',
                              closed && 'line-through',
                            )}
                          >
                            {step.label}
                            {current ? (
                              <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-gold-600">
                                Current
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
                {(selected.status === 'rejected' || selected.status === 'withdrawn') && (
                  <p className="mt-2 rounded-[10px] bg-red-50 px-3 py-2 text-sm text-red-700">
                    Process closed - {APPLICANT_STATUS_LABELS[selected.status]}
                  </p>
                )}
              </div>

              <div className="rounded-[12px] border border-border p-4">
                <p className={labelClass}>Update status</p>
                <label className="mt-2 block">
                  <span className="text-xs text-slate-ui">Stage / outcome</span>
                  <select
                    className={fieldClass}
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value as ApplicantStatus)}
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {APPLICANT_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 block">
                  <span className="text-xs text-slate-ui">Scheduled / interview date (optional)</span>
                  <input
                    type="date"
                    className={fieldClass}
                    value={statusDate}
                    onChange={(e) => setStatusDate(e.target.value)}
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-xs text-slate-ui">Note (optional)</span>
                  <textarea
                    className={cn(fieldClass, 'min-h-[72px] resize-y')}
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Feedback, interviewer, next steps..."
                  />
                </label>
                <Button
                  className="mt-3 w-full"
                  variant="gold"
                  disabled={updatingStatus}
                  onClick={() => void handleStatusUpdate()}
                >
                  {updatingStatus ? 'Updating...' : 'Save status'}
                </Button>
              </div>

              <div>
                <p className={labelClass}>Process timeline</p>
                {eventsLoading ? (
                  <p className="mt-2 text-sm text-slate-ui">Loading timeline...</p>
                ) : events.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-ui">No stage events yet.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {[...events].reverse().map((ev) => (
                      <li key={ev.id} className="rounded-[10px] border border-border/80 px-3 py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant={statusVariant(ev.status)}>
                            {APPLICANT_STATUS_LABELS[ev.status]}
                          </Badge>
                          <span className="text-[11px] text-slate-ui">
                            {new Date(ev.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {ev.note ? <p className="mt-1.5 text-sm text-[#073D2C]">{ev.note}</p> : null}
                        <p className="mt-1 text-[11px] text-slate-ui">
                          {[ev.createdByName, ev.scheduledAt ? `Scheduled ${ev.scheduledAt}` : null]
                            .filter(Boolean)
                            .join(' | ') || '-'}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
