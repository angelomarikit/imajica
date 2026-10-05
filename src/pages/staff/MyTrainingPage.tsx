import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CheckCircle2, Eye, GraduationCap, PlayCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { useAuth } from '@/contexts/AuthContext'
import {
  formatBytes,
  listMyTrainingMaterials,
  progressStatusLabel,
  progressStatusVariant,
  resolveTrainingFileUrl,
  setTrainingProgress,
  subscribeTrainingMaterials,
  type MyTrainingItem,
  type TrainingProgressStatus,
} from '@/services/trainingMaterialService'
import { cn } from '@/utils/cn'

export function MyTrainingPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<MyTrainingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    title: string
    url: string
    mime?: string | null
    fileName?: string | null
  } | null>(null)

  async function refresh() {
    if (!user?.id) return
    setLoading(true)
    try {
      setItems(await listMyTrainingMaterials(user.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load training')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    return subscribeTrainingMaterials(() => {
      void refresh()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const stats = useMemo(() => {
    const completed = items.filter((i) => i.progress?.status === 'completed').length
    const inProgress = items.filter((i) => i.progress?.status === 'in_progress').length
    const todo = items.filter((i) => i.progress?.status !== 'completed').length
    return { total: items.length, completed, inProgress, todo }
  }, [items])

  async function setStatus(item: MyTrainingItem, status: TrainingProgressStatus) {
    if (!user?.id) return
    setSavingId(item.id)
    try {
      await setTrainingProgress({
        materialId: item.id,
        profileId: user.id,
        status,
      })
      toast.success(
        status === 'completed'
          ? `Marked "${item.title}" complete`
          : status === 'in_progress'
            ? `Started "${item.title}"`
            : 'Status updated',
      )
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update status')
    } finally {
      setSavingId(null)
    }
  }

  async function openMaterial(item: MyTrainingItem) {
    if (!item.fileUrl) {
      toast.message('No file attached')
      return
    }
    try {
      if (user?.id && item.progress?.status !== 'completed' && item.progress?.status !== 'in_progress') {
        await setTrainingProgress({
          materialId: item.id,
          profileId: user.id,
          status: 'in_progress',
        })
        await refresh()
      }
      const url = await resolveTrainingFileUrl(item.fileUrl)
      if (!url) {
        toast.error('Could not open file')
        return
      }
      setPreview({ title: item.title, url, mime: item.fileMime, fileName: item.fileName })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open file')
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="My Training"
        description="Training materials assigned to you by HR. Open each file, then mark it complete when you are done."
        stat={{ value: stats.todo, label: 'Still open' }}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Assigned to me" value={String(stats.total)} icon={<GraduationCap className="h-5 w-5" />} />
        <KpiCard label="In progress" value={String(stats.inProgress)} icon={<PlayCircle className="h-5 w-5" />} />
        <KpiCard label="Completed" value={String(stats.completed)} icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard label="Still open" value={String(stats.todo)} icon={<BookOpen className="h-5 w-5" />} />
      </div>

      <Card className="p-4 sm:p-5">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-ui">Loading your training...</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-ui">
            No published training assigned to you yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const status = item.progress?.status ?? null
              const busy = savingId === item.id
              const done = status === 'completed'
              return (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-[14px] border bg-white p-4 shadow-[0_1px_3px_rgba(10,46,38,0.04)]',
                    done ? 'border-emerald-200' : 'border-border',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#073D2C]">{item.title}</p>
                      <p className="truncate text-[11px] text-slate-ui">{item.category}</p>
                    </div>
                    <Badge variant={progressStatusVariant(status)}>
                      {progressStatusLabel(status)}
                    </Badge>
                  </div>
                  {item.description ? (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-ui">{item.description}</p>
                  ) : null}
                  <p className="mt-2 truncate text-[11px] text-slate-ui">
                    {item.fileName || 'No file'}
                    {item.fileSize ? ` · ${formatBytes(item.fileSize)}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => void openMaterial(item)}>
                      <Eye className="h-3.5 w-3.5" /> Open
                    </Button>
                    {!done ? (
                      <>
                        {status !== 'in_progress' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => void setStatus(item, 'in_progress')}
                          >
                            Start
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="gold"
                          disabled={busy}
                          onClick={() => void setStatus(item, 'completed')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark complete
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void setStatus(item, 'in_progress')}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                  {done && item.progress?.completedAt ? (
                    <p className="mt-2 text-[11px] text-emerald-800">
                      Completed {new Date(item.progress.completedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-ui hover:bg-ivory-100"
              >
                <X className="h-4 w-4" />
              </button>
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
