import { useEffect, useState } from 'react'
import { MapPin, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  formatAttendanceHours,
  formatManilaDateTime,
  resolveAttendancePhotoUrl,
  saveAttendanceSessionTimes,
  toManilaDatetimeLocalValue,
  type AttendanceSession,
} from '@/services/attendanceService'
import { formatRoleLabel } from '@/utils/roleLabels'

export function AttendanceSessionModal({
  staffName,
  staffRole,
  staffEmail,
  branchName,
  session,
  canEditTimes,
  onClose,
  onSaved,
}: {
  staffName: string
  staffRole: string
  staffEmail: string
  branchName: string
  session: AttendanceSession
  /** HR / people-ops can correct Time In / Time Out */
  canEditTimes?: boolean
  onClose: () => void
  onSaved?: () => void
}) {
  const [timeInPhoto, setTimeInPhoto] = useState<string | null>(null)
  const [timeOutPhoto, setTimeOutPhoto] = useState<string | null>(null)
  const [loadingPhotos, setLoadingPhotos] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [timeInLocal, setTimeInLocal] = useState(() =>
    toManilaDatetimeLocalValue(session.timeIn.punchedAt),
  )
  const [timeOutLocal, setTimeOutLocal] = useState(() =>
    session.timeOut ? toManilaDatetimeLocalValue(session.timeOut.punchedAt) : '',
  )

  useEffect(() => {
    setTimeInLocal(toManilaDatetimeLocalValue(session.timeIn.punchedAt))
    setTimeOutLocal(
      session.timeOut ? toManilaDatetimeLocalValue(session.timeOut.punchedAt) : '',
    )
    setEditing(false)
  }, [session])

  useEffect(() => {
    let cancelled = false
    setLoadingPhotos(true)
    void (async () => {
      try {
        const [inUrl, outUrl] = await Promise.all([
          resolveAttendancePhotoUrl(session.timeIn.photoUrl),
          session.timeOut
            ? resolveAttendancePhotoUrl(session.timeOut.photoUrl)
            : Promise.resolve(null),
        ])
        if (!cancelled) {
          setTimeInPhoto(inUrl)
          setTimeOutPhoto(outUrl)
        }
      } finally {
        if (!cancelled) setLoadingPhotos(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session])

  async function handleSave() {
    setSaving(true)
    try {
      await saveAttendanceSessionTimes({
        session,
        timeInLocal,
        timeOutLocal: timeOutLocal.trim() || null,
      })
      toast.success('Attendance times updated')
      setEditing(false)
      onSaved?.()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update attendance')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-emerald-950/45 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[18px] bg-white shadow-2xl sm:rounded-[18px]">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
              Attendance detail
            </p>
            <h3 className="truncate font-display text-lg font-semibold text-charcoal">
              {staffName}
            </h3>
            <p className="truncate text-xs capitalize text-slate-ui">
              {formatRoleLabel(staffRole)}
              {staffEmail ? ` · ${staffEmail}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-charcoal hover:bg-ivory-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant={session.timeOut ? 'success' : 'warning'}>
              {session.timeOut ? 'Complete' : 'Open'}
            </Badge>
            <span className="rounded-full bg-ivory-100 px-2.5 py-0.5 text-xs font-medium text-slate-ui">
              {session.dateKey}
            </span>
            <span className="rounded-full bg-ivory-100 px-2.5 py-0.5 text-xs font-medium text-slate-ui">
              {branchName}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
              {formatAttendanceHours(session.hours)}
            </span>
          </div>

          {canEditTimes ? (
            <div className="rounded-[12px] border border-[#C5A059]/35 bg-[#FFFDF8] px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#6b5420]">Correct Time In / Time Out</p>
                {!editing ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit times
                  </Button>
                ) : null}
              </div>
              {editing ? (
                <div className="mt-3 space-y-3">
                  <label className="block text-xs font-medium text-slate-ui">
                    Time In (Manila)
                    <input
                      type="datetime-local"
                      value={timeInLocal}
                      onChange={(e) => setTimeInLocal(e.target.value)}
                      className="mt-1 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-emerald-700"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-ui">
                    Time Out (Manila)
                    <input
                      type="datetime-local"
                      value={timeOutLocal}
                      onChange={(e) => setTimeOutLocal(e.target.value)}
                      className="mt-1 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-emerald-700"
                    />
                    {!session.timeOut ? (
                      <span className="mt-1 block text-[11px] text-slate-ui">
                        Empty session — enter a Time Out to close it (saved as HR correction).
                      </span>
                    ) : null}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={saving || !timeInLocal}
                      onClick={() => void handleSave()}
                    >
                      {saving ? 'Saving…' : 'Save times'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving}
                      onClick={() => {
                        setTimeInLocal(toManilaDatetimeLocalValue(session.timeIn.punchedAt))
                        setTimeOutLocal(
                          session.timeOut
                            ? toManilaDatetimeLocalValue(session.timeOut.punchedAt)
                            : '',
                        )
                        setEditing(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] text-slate-ui">
                  Adjust punch times when the kiosk record is wrong. Payroll and incentives use the
                  corrected times.
                </p>
              )}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <PunchPhotoCard
              title="Time In"
              when={formatManilaDateTime(session.timeIn.punchedAt)}
              location={session.timeIn.locationLabel}
              photoUrl={timeInPhoto}
              loading={loadingPhotos}
            />
            <PunchPhotoCard
              title="Time Out"
              when={
                session.timeOut ? formatManilaDateTime(session.timeOut.punchedAt) : null
              }
              location={session.timeOut?.locationLabel ?? null}
              photoUrl={timeOutPhoto}
              loading={loadingPhotos}
              emptyLabel="No Time Out yet"
            />
          </div>
        </div>

        <div className="border-t border-border px-4 py-3 sm:px-5">
          <Button type="button" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

function PunchPhotoCard({
  title,
  when,
  location,
  photoUrl,
  loading,
  emptyLabel,
}: {
  title: string
  when: string | null
  location: string | null | undefined
  photoUrl: string | null
  loading: boolean
  emptyLabel?: string
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-ivory-50/50">
      <div className="border-b border-border/70 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-ui">{title}</p>
        {when ? (
          <p className="mt-0.5 text-sm font-medium text-[#073D2C]">{when}</p>
        ) : (
          <p className="mt-0.5 text-sm text-slate-ui">{emptyLabel ?? '—'}</p>
        )}
      </div>
      <div className="aspect-[4/3] bg-[#0A2E26]/90">
        {loading ? (
          <div className="grid h-full place-items-center text-xs text-white/70">Loading…</div>
        ) : photoUrl ? (
          <img src={photoUrl} alt={`${title} selfie`} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center px-3 text-center text-xs text-white/65">
            {when ? 'No selfie on file' : emptyLabel ?? '—'}
          </div>
        )}
      </div>
      {location ? (
        <p className="flex items-start gap-1.5 px-3 py-2 text-[11px] leading-snug text-slate-ui">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[#C5A059]" />
          <span>{location}</span>
        </p>
      ) : null}
    </div>
  )
}
