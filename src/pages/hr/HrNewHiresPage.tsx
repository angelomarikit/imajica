import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ClipboardList, Eye, Search, Upload, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { getBranches } from '@/services/branchService'
import {
  checklistProgress,
  hasRequirementDocument,
  listNewHires,
  NEW_HIRE_REQUIREMENTS,
  pendingRequirements,
  resolveNewHireDocumentUrl,
  setNewHireRequirement,
  subscribeNewHires,
  syncHiredApplicantsIntoNewHires,
  uploadNewHireDocument,
  type NewHireRecord,
  type NewHireRequirementId,
} from '@/services/newHireService'
import { listApplicants } from '@/services/recruitmentService'
import { cn } from '@/utils/cn'

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-[#073D2C] outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10'
const labelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-ui'

const GROUP_LABEL = {
  documents: 'Documents',
  benefits: 'Benefits enrollment',
  operations: 'Operations readiness',
} as const

export function HrNewHiresPage() {
  const [hires, setHires] = useState<NewHireRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [branchId, setBranchId] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'onboarding' | 'ready'>('all')
  const [selected, setSelected] = useState<NewHireRecord | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [uploadTarget, setUploadTarget] = useState<NewHireRequirementId | null>(null)
  const [preview, setPreview] = useState<{ title: string; url: string; mime?: string | null; fileName?: string | null } | null>(
    null,
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const branches = useMemo(
    () => getBranches().filter((b) => b.status === 'active' && b.branchType !== 'warehouse'),
    [],
  )

  async function refresh() {
    setLoading(true)
    try {
      const applicants = await listApplicants()
      await syncHiredApplicantsIntoNewHires(applicants)
      const rows = await listNewHires()
      setHires(rows.filter((h) => h.status !== 'cancelled'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load new hires')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    return subscribeNewHires(() => {
      void refresh()
    })
  }, [])

  useEffect(() => {
    if (!selected) return
    const latest = hires.find((h) => h.id === selected.id)
    if (latest) setSelected(latest)
  }, [hires, selected?.id])

  const filtered = useMemo(() => {
    let list = hires
    if (branchId) list = list.filter((h) => h.branchId === branchId)
    if (statusFilter !== 'all') list = list.filter((h) => h.status === statusFilter)
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((h) => {
      const hay = `${h.fullName} ${h.email} ${h.appliedRole} ${h.branchName}`.toLowerCase()
      return hay.includes(q)
    })
  }, [hires, branchId, statusFilter, query])

  const stats = useMemo(() => {
    const onboarding = hires.filter((h) => h.status === 'onboarding').length
    const ready = hires.filter((h) => h.status === 'ready').length
    const pendingItems = hires.reduce((s, h) => s + pendingRequirements(h).length, 0)
    return { total: hires.length, onboarding, ready, pendingItems }
  }, [hires])

  async function toggleReq(hire: NewHireRecord, requirementId: NewHireRequirementId, done: boolean) {
    if (done && !hasRequirementDocument(hire.checklist[requirementId])) {
      toast.error('Upload a document first, then mark it complete')
      return
    }
    setSavingId(`${hire.id}:${requirementId}`)
    try {
      const updated = await setNewHireRequirement({ id: hire.id, requirementId, done })
      setSelected(updated)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update checklist')
    } finally {
      setSavingId(null)
    }
  }

  function startUpload(requirementId: NewHireRequirementId) {
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
      const updated = await uploadNewHireDocument({
        hireId: selected.id,
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

  async function viewDocument(hire: NewHireRecord, requirementId: NewHireRequirementId, label: string) {
    const state = hire.checklist[requirementId]
    if (!hasRequirementDocument(state)) {
      toast.message('No document uploaded yet')
      return
    }
    setSavingId(`${hire.id}:${requirementId}:view`)
    try {
      const url = await resolveNewHireDocumentUrl(state.fileUrl)
      if (!url) {
        toast.error('Could not open document')
        return
      }
      setPreview({
        title: label,
        url,
        mime: state.fileMime,
        fileName: state.fileName,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open document')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="New Hires"
        description="Hired candidates land here automatically. Use each card as a reminder of documents, benefits, and ops items still needed before they are fully ready."
        stat={{ value: stats.onboarding, label: 'Still onboarding' }}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="New hires" value={String(stats.total)} icon={<UserPlus className="h-5 w-5" />} />
        <KpiCard
          label="Onboarding"
          value={String(stats.onboarding)}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <KpiCard label="Ready" value={String(stats.ready)} icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard
          label="Open requirements"
          value={String(stats.pendingItems)}
          subtext="Across all new hires"
          icon={<ClipboardList className="h-5 w-5" />}
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
              <option value="onboarding">Onboarding</option>
              <option value="ready">Ready</option>
            </select>
          </label>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, role, clinic..."
              className="w-full rounded-[10px] border border-border bg-white py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-center text-sm text-slate-ui">Loading new hires...</p>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-center text-sm text-slate-ui">
            No new hires yet. Mark an applicant as Hired in Recruitment and they will appear here.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((h) => {
              const prog = checklistProgress(h)
              const pending = pendingRequirements(h).slice(0, 4)
              const ready = h.status === 'ready'
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelected(h)}
                  className="rounded-[14px] border border-border bg-white p-4 text-left shadow-[0_1px_3px_rgba(10,46,38,0.04)] transition hover:border-emerald-800/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#073D2C]">{h.fullName}</p>
                      <p className="truncate text-[11px] text-slate-ui">
                        {h.appliedRole} · {h.branchName || 'Clinic TBD'}
                      </p>
                    </div>
                    <Badge variant={ready ? 'success' : 'warning'}>
                      {ready ? 'Ready' : 'Needs setup'}
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-slate-ui">
                      <span>Requirements</span>
                      <span className="font-semibold text-[#073D2C]">
                        {prog.done}/{prog.total}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ivory-100">
                      <div
                        className={cn('h-full rounded-full', ready ? 'bg-emerald-700' : 'bg-amber-500')}
                        style={{ width: `${prog.pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <p className={labelClass}>Still needed</p>
                    {pending.length === 0 ? (
                      <p className="text-xs text-emerald-800">All requirements complete</p>
                    ) : (
                      pending.map((r) => (
                        <p key={r.id} className="truncate text-xs text-[#073D2C]">
                          · {r.label}
                        </p>
                      ))
                    )}
                    {pendingRequirements(h).length > 4 ? (
                      <p className="text-[11px] text-slate-ui">
                        +{pendingRequirements(h).length - 4} more
                      </p>
                    ) : null}
                  </div>

                  <p className="mt-3 text-[11px] text-slate-ui">Hired {h.hiredAt}</p>
                </button>
              )
            })}
          </div>
        )}
      </Card>

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
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight text-charcoal">
                  {selected.fullName}
                </h3>
                <p className="text-xs text-slate-ui">
                  {selected.appliedRole}
                  {selected.branchName ? ` · ${selected.branchName}` : ''} · Hired {selected.hiredAt}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-ui hover:bg-ivory-100"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={(e) => void onFileChosen(e.target.files)}
            />

            <div className="flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={selected.status === 'ready' ? 'success' : 'warning'}>
                  {selected.status === 'ready' ? 'Ready for operations' : 'Onboarding in progress'}
                </Badge>
                <span className="text-xs text-slate-ui">
                  {checklistProgress(selected).done}/{checklistProgress(selected).total} complete
                </span>
              </div>
              <p className="text-xs text-slate-ui">
                Upload a document for each item first, then check it off after you have reviewed the file.
              </p>

              {(['documents', 'benefits', 'operations'] as const).map((group) => {
                const items = NEW_HIRE_REQUIREMENTS.filter((r) => r.group === group)
                return (
                  <div key={group}>
                    <p className={labelClass}>{GROUP_LABEL[group]}</p>
                    <ul className="mt-2 space-y-2">
                      {items.map((req) => {
                        const state = selected.checklist[req.id]
                        const done = Boolean(state?.done)
                        const hasDoc = hasRequirementDocument(state)
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
                              disabled={busy || (!done && !hasDoc)}
                              title={
                                !hasDoc && !done
                                  ? 'Upload a document before checking this off'
                                  : undefined
                              }
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
                              {hasDoc ? (
                                <p className="mt-1 truncate text-[11px] font-medium text-emerald-800">
                                  File: {state?.fileName || 'Uploaded document'}
                                </p>
                              ) : (
                                <p className="mt-1 text-[11px] text-amber-700">Document required before check</p>
                              )}
                            </div>
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
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
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
                <h3 className="truncate font-display text-base font-semibold text-charcoal">{preview.title}</h3>
                {preview.fileName ? <p className="truncate text-xs text-slate-ui">{preview.fileName}</p> : null}
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
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-ivory-50 p-3">
              {preview.mime?.startsWith('image/') || preview.url.startsWith('data:image/') ? (
                <img src={preview.url} alt={preview.title} className="mx-auto max-h-[75vh] max-w-full object-contain" />
              ) : (
                <iframe title={preview.title} src={preview.url} className="h-[75vh] w-full rounded-[8px] bg-white" />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
