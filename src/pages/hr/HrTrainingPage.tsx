import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Eye,
  FileUp,
  GraduationCap,
  Search,
  Trash2,
  Upload,
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
import { listDirectoryStaff } from '@/services/staffDirectoryService'
import {
  audienceLabel,
  createTrainingMaterial,
  deleteTrainingMaterial,
  formatBytes,
  getTrainingProgressSummary,
  listTrainingMaterials,
  progressStatusLabel,
  progressStatusVariant,
  resolveTrainingFileUrl,
  subscribeTrainingMaterials,
  TRAINING_CATEGORIES,
  updateTrainingMaterial,
  type TrainingAudience,
  type TrainingMaterial,
  type TrainingMaterialStatus,
  type TrainingProgressSummary,
} from '@/services/trainingMaterialService'
import type { Staff } from '@/types'
import { cn } from '@/utils/cn'

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-[#073D2C] outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10'
const labelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-ui'

type EditorMode = 'create' | 'edit'

const emptyForm = {
  title: '',
  description: '',
  category: 'General',
  audience: 'all' as TrainingAudience,
  status: 'draft' as TrainingMaterialStatus,
  assigneeProfileIds: [] as string[],
}

export function HrTrainingPage() {
  const { user } = useAuth()
  const [materials, setMaterials] = useState<TrainingMaterial[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TrainingMaterialStatus>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>('create')
  const [editing, setEditing] = useState<TrainingMaterial | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [staffQuery, setStaffQuery] = useState('')
  const [preview, setPreview] = useState<{
    title: string
    url: string
    mime?: string | null
    fileName?: string | null
  } | null>(null)
  const [progressByMaterial, setProgressByMaterial] = useState<Record<string, TrainingProgressSummary>>(
    {},
  )
  const [progressBoard, setProgressBoard] = useState<TrainingProgressSummary | null>(null)
  const [progressLoading, setProgressLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    setLoading(true)
    try {
      const [mats, people] = await Promise.all([listTrainingMaterials(), listDirectoryStaff()])
      setMaterials(mats)
      const active = people.filter((s) => s.status === 'active')
      setStaff(active)
      const summaries: Record<string, TrainingProgressSummary> = {}
      await Promise.all(
        mats.map(async (m) => {
          summaries[m.id] = await getTrainingProgressSummary(m, active)
        }),
      )
      setProgressByMaterial(summaries)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load training materials')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    return subscribeTrainingMaterials(() => {
      void refresh()
    })
  }, [])

  const filtered = useMemo(() => {
    let list = materials
    if (statusFilter !== 'all') list = list.filter((m) => m.status === statusFilter)
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((m) => {
      const hay = `${m.title} ${m.description} ${m.category} ${m.fileName || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [materials, statusFilter, query])

  const stats = useMemo(() => {
    const published = materials.filter((m) => m.status === 'published').length
    const draft = materials.filter((m) => m.status === 'draft').length
    const forAll = materials.filter((m) => m.audience === 'all' && m.status === 'published').length
    return { total: materials.length, published, draft, forAll }
  }, [materials])

  const staffFiltered = useMemo(() => {
    const q = staffQuery.trim().toLowerCase()
    if (!q) return staff
    return staff.filter((s) => {
      const hay = `${s.fullName} ${s.email} ${s.branchName} ${s.title}`.toLowerCase()
      return hay.includes(q)
    })
  }, [staff, staffQuery])

  function openEdit(m: TrainingMaterial) {
    setEditorMode('edit')
    setEditing(m)
    setForm({
      title: m.title,
      description: m.description,
      category: m.category,
      audience: m.audience,
      status: m.status,
      assigneeProfileIds: [...m.assigneeProfileIds],
    })
    setPendingFile(null)
    setStaffQuery('')
    setEditorOpen(true)
    setProgressLoading(true)
    void getTrainingProgressSummary(m, staff)
      .then(setProgressBoard)
      .catch(() => setProgressBoard(null))
      .finally(() => setProgressLoading(false))
  }

  function openCreate() {
    setEditorMode('create')
    setEditing(null)
    setForm(emptyForm)
    setPendingFile(null)
    setStaffQuery('')
    setProgressBoard(null)
    setEditorOpen(true)
  }

  function toggleAssignee(profileId: string) {
    setForm((f) => {
      const has = f.assigneeProfileIds.includes(profileId)
      return {
        ...f,
        assigneeProfileIds: has
          ? f.assigneeProfileIds.filter((id) => id !== profileId)
          : [...f.assigneeProfileIds, profileId],
      }
    })
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (editorMode === 'create' && !pendingFile && !editing?.fileUrl) {
      toast.error('Upload a training file')
      return
    }
    if (form.audience === 'selected' && form.assigneeProfileIds.length === 0) {
      toast.error('Select at least one employee, or set audience to All employees')
      return
    }

    setSaving(true)
    try {
      if (editorMode === 'create') {
        const created = await createTrainingMaterial({
          title: form.title,
          description: form.description,
          category: form.category,
          audience: form.audience,
          status: form.status,
          assigneeProfileIds: form.assigneeProfileIds,
          file: pendingFile,
          createdBy: user?.id,
        })
        toast.success(`Added "${created.title}"`)
      } else if (editing) {
        await updateTrainingMaterial({
          id: editing.id,
          title: form.title,
          description: form.description,
          category: form.category,
          audience: form.audience,
          status: form.status,
          assigneeProfileIds: form.assigneeProfileIds,
          file: pendingFile,
        })
        toast.success('Training material updated')
      }
      setEditorOpen(false)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save material')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    const ok = window.confirm(
      `Delete "${editing.title}"? This removes the training for all employees and cannot be undone.`,
    )
    if (!ok) return
    setSaving(true)
    try {
      await deleteTrainingMaterial(editing.id)
      toast.success('Training material deleted')
      setEditorOpen(false)
      setEditing(null)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete material')
    } finally {
      setSaving(false)
    }
  }

  async function quickPublish(m: TrainingMaterial, status: TrainingMaterialStatus) {
    try {
      await updateTrainingMaterial({ id: m.id, status })
      toast.success(status === 'published' ? 'Published to employees' : `Marked as ${status}`)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update status')
    }
  }

  async function viewFile(m: TrainingMaterial) {
    if (!m.fileUrl) {
      toast.message('No file uploaded yet')
      return
    }
    try {
      const url = await resolveTrainingFileUrl(m.fileUrl)
      if (!url) {
        toast.error('Could not open file')
        return
      }
      setPreview({ title: m.title, url, mime: m.fileMime, fileName: m.fileName })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open file')
    }
  }

  function statusVariant(status: TrainingMaterialStatus): 'success' | 'warning' | 'neutral' {
    if (status === 'published') return 'success'
    if (status === 'draft') return 'warning'
    return 'neutral'
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Training"
        description="Upload training materials and control who can see them — all employees or selected people. Publish when ready."
        stat={{ value: stats.published, label: 'Published' }}
        actions={
          <Button variant="gold" onClick={openCreate}>
            <Upload className="h-4 w-4" /> Upload material
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Materials" value={String(stats.total)} icon={<GraduationCap className="h-5 w-5" />} />
        <KpiCard label="Published" value={String(stats.published)} icon={<BookOpen className="h-5 w-5" />} />
        <KpiCard label="Drafts" value={String(stats.draft)} icon={<FileUp className="h-5 w-5" />} />
        <KpiCard
          label="Visible to all"
          value={String(stats.forAll)}
          subtext="Published + all employees"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-ui">
            Status
            <select
              className={cn(fieldClass, 'mt-1 block min-w-[140px]')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, category, file..."
              className="w-full rounded-[10px] border border-border bg-white py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-center text-sm text-slate-ui">Loading training materials...</p>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-center text-sm text-slate-ui">
            No training materials yet. Upload a file to start the library.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((m) => {
              const prog = progressByMaterial[m.id]
              return (
              <button
                key={m.id}
                type="button"
                onClick={() => openEdit(m)}
                className="rounded-[14px] border border-border bg-white p-4 text-left shadow-[0_1px_3px_rgba(10,46,38,0.04)] transition hover:border-emerald-800/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#073D2C]">{m.title}</p>
                    <p className="truncate text-[11px] text-slate-ui">{m.category}</p>
                  </div>
                  <Badge variant={statusVariant(m.status)} className="capitalize">
                    {m.status}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-[10px] bg-ivory-50 px-2.5 py-2">
                    <p className="text-slate-ui">Audience</p>
                    <p className="font-semibold text-[#073D2C]">{audienceLabel(m)}</p>
                  </div>
                  <div className="rounded-[10px] bg-emerald-50/70 px-2.5 py-2">
                    <p className="text-slate-ui">Completed</p>
                    <p className="font-semibold text-emerald-900">
                      {prog
                        ? `${prog.completed}/${prog.totalAudience || 0}`
                        : '—'}
                    </p>
                  </div>
                </div>
                {m.description ? (
                  <p className="mt-3 line-clamp-2 text-xs text-slate-ui">{m.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    role="button"
                    tabIndex={0}
                    className="inline-flex items-center gap-1 rounded-[8px] border border-border px-2 py-1 text-[11px] font-semibold text-[#073D2C] hover:bg-ivory-50"
                    onClick={(e) => {
                      e.stopPropagation()
                      void viewFile(m)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation()
                        void viewFile(m)
                      }
                    }}
                  >
                    <Eye className="h-3 w-3" /> View
                  </span>
                  {m.status !== 'published' ? (
                    <span
                      role="button"
                      tabIndex={0}
                      className="inline-flex items-center gap-1 rounded-[8px] border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-900"
                      onClick={(e) => {
                        e.stopPropagation()
                        void quickPublish(m, 'published')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation()
                          void quickPublish(m, 'published')
                        }
                      }}
                    >
                      Publish
                    </span>
                  ) : (
                    <span
                      role="button"
                      tabIndex={0}
                      className="inline-flex items-center gap-1 rounded-[8px] border border-border px-2 py-1 text-[11px] font-semibold text-slate-ui"
                      onClick={(e) => {
                        e.stopPropagation()
                        void quickPublish(m, 'draft')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation()
                          void quickPublish(m, 'draft')
                        }
                      }}
                    >
                      Unpublish
                    </span>
                  )}
                </div>
              </button>
              )
            })}
          </div>
        )}
      </Card>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-emerald-950/45"
            aria-label="Close"
            onClick={() => setEditorOpen(false)}
          />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[12px] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-display text-lg font-semibold text-charcoal">
                {editorMode === 'create' ? 'Upload training material' : 'Edit training material'}
              </h3>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-ui hover:bg-ivory-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5 scrollbar-thin">
              <label className="block">
                <span className={labelClass}>Title *</span>
                <input
                  className={fieldClass}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Clinic safety orientation"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Description</span>
                <textarea
                  className={cn(fieldClass, 'min-h-[72px] resize-y')}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What this training covers"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Category</span>
                  <select
                    className={fieldClass}
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {TRAINING_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>Status</span>
                  <select
                    className={fieldClass}
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as TrainingMaterialStatus }))
                    }
                  >
                    <option value="draft">Draft (HR only)</option>
                    <option value="published">Published (visible to audience)</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>

              <div>
                <p className={labelClass}>File</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" />
                    {pendingFile || editing?.fileName ? 'Replace file' : 'Choose file'}
                  </Button>
                  {editing?.fileUrl && !pendingFile ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => void viewFile(editing)}>
                      <Eye className="h-3.5 w-3.5" /> View current
                    </Button>
                  ) : null}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.mp4,.webm,.txt"
                  onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                />
                <p className="mt-1 text-xs text-slate-ui">
                  {pendingFile
                    ? `${pendingFile.name} · ${formatBytes(pendingFile.size)}`
                    : editing?.fileName
                      ? `Current: ${editing.fileName}${editing.fileSize ? ` · ${formatBytes(editing.fileSize)}` : ''}`
                      : 'PDF, Office, image, or video up to 50MB'}
                </p>
              </div>

              <div>
                <p className={labelClass}>Who can see this</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cn(
                      'rounded-[10px] border px-3 py-2 text-sm font-medium',
                      form.audience === 'all'
                        ? 'border-emerald-800 bg-emerald-50 text-emerald-950'
                        : 'border-border text-slate-ui',
                    )}
                    onClick={() => setForm((f) => ({ ...f, audience: 'all', assigneeProfileIds: [] }))}
                  >
                    All employees
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'rounded-[10px] border px-3 py-2 text-sm font-medium',
                      form.audience === 'selected'
                        ? 'border-emerald-800 bg-emerald-50 text-emerald-950'
                        : 'border-border text-slate-ui',
                    )}
                    onClick={() => setForm((f) => ({ ...f, audience: 'selected' }))}
                  >
                    Specific employees
                  </button>
                </div>
              </div>

              {form.audience === 'selected' ? (
                <div className="rounded-[12px] border border-border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#073D2C]">
                      Selected {form.assigneeProfileIds.length}
                    </p>
                    <input
                      className="w-full max-w-[200px] rounded-[8px] border border-border px-2 py-1.5 text-xs"
                      placeholder="Search employees..."
                      value={staffQuery}
                      onChange={(e) => setStaffQuery(e.target.value)}
                    />
                  </div>
                  <ul className="max-h-48 space-y-1 overflow-y-auto scrollbar-thin">
                    {staffFiltered.map((s) => {
                      const pid = s.profileId || s.id
                      const checked = form.assigneeProfileIds.includes(pid)
                      return (
                        <li key={s.id}>
                          <label className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-ivory-50">
                            <input
                              type="checkbox"
                              className="accent-emerald-800"
                              checked={checked}
                              onChange={() => toggleAssignee(pid)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-[#073D2C]">{s.fullName}</span>
                              <span className="block truncate text-[11px] text-slate-ui">
                                {s.title} · {s.branchName || '—'}
                              </span>
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}

              {editorMode === 'edit' ? (
                <div className="rounded-[12px] border border-border p-3">
                  <p className={labelClass}>Employee completion</p>
                  {progressLoading ? (
                    <p className="mt-2 text-xs text-slate-ui">Loading progress...</p>
                  ) : !progressBoard ? (
                    <p className="mt-2 text-xs text-slate-ui">No progress data yet.</p>
                  ) : (
                    <>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <div className="rounded-[10px] bg-emerald-50 px-2.5 py-2">
                          <p className="text-slate-ui">Completed</p>
                          <p className="font-semibold text-emerald-900">{progressBoard.completed}</p>
                        </div>
                        <div className="rounded-[10px] bg-amber-50 px-2.5 py-2">
                          <p className="text-slate-ui">In progress</p>
                          <p className="font-semibold text-amber-800">{progressBoard.inProgress}</p>
                        </div>
                        <div className="rounded-[10px] bg-sky-50 px-2.5 py-2">
                          <p className="text-slate-ui">Assigned</p>
                          <p className="font-semibold text-sky-800">{progressBoard.assigned}</p>
                        </div>
                        <div className="rounded-[10px] bg-ivory-50 px-2.5 py-2">
                          <p className="text-slate-ui">Not started</p>
                          <p className="font-semibold text-[#073D2C]">{progressBoard.notStarted}</p>
                        </div>
                      </div>
                      <ul className="mt-3 max-h-52 space-y-1.5 overflow-y-auto scrollbar-thin">
                        {progressBoard.rows.length === 0 ? (
                          <li className="text-xs text-slate-ui">
                            No audience yet. Publish and assign employees to track completion.
                          </li>
                        ) : (
                          progressBoard.rows.map((row) => (
                            <li
                              key={row.profileId}
                              className="flex items-center justify-between gap-2 rounded-[8px] border border-border/70 px-2.5 py-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[#073D2C]">{row.fullName}</p>
                                <p className="truncate text-[11px] text-slate-ui">{row.email || '—'}</p>
                              </div>
                              <Badge variant={progressStatusVariant(row.status)}>
                                {progressStatusLabel(row.status)}
                              </Badge>
                            </li>
                          ))
                        )}
                      </ul>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
              {editorMode === 'edit' ? (
                <Button variant="destructive" disabled={saving} onClick={() => void handleDelete()}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditorOpen(false)}>
                  Cancel
                </Button>
                <Button variant="gold" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? 'Saving...' : editorMode === 'create' ? 'Save material' : 'Update material'}
                </Button>
              </div>
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
              ) : preview.mime?.startsWith('video/') ? (
                <video src={preview.url} controls className="mx-auto max-h-[75vh] w-full max-w-3xl" />
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
