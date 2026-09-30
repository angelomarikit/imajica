import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/contexts/AuthContext'
import {
  daysWithPunches,
  deleteAttendancePunch,
  formatManilaDateTime,
  formatManilaTime,
  listMyAttendance,
  listMyAttendanceForDay,
  manilaDateKey,
  subscribeAttendance,
} from '@/services/attendanceService'
import type { AttendancePunch } from '@/types'
import { cn } from '@/utils/cn'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function MyAttendancePage() {
  const { user } = useAuth()
  const todayKey = manilaDateKey()
  const [cursor, setCursor] = useState(() => {
    const [y, m] = todayKey.split('-').map(Number)
    return new Date(y!, m! - 1, 1)
  })
  const [selectedKey, setSelectedKey] = useState(todayKey)
  const [allPunches, setAllPunches] = useState<AttendancePunch[]>([])
  const [dayPunches, setDayPunches] = useState<AttendancePunch[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const year = cursor.getFullYear()
  const monthIndex = cursor.getMonth()

  async function refreshAll() {
    if (!user) return
    try {
      const rows = await listMyAttendance(user.id)
      setAllPunches(rows)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshAll()
    return subscribeAttendance(() => {
      void refreshAll()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    void listMyAttendanceForDay(user.id, selectedKey)
      .then(setDayPunches)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load day'))
  }, [user, selectedKey, allPunches])

  const marked = useMemo(
    () => daysWithPunches(allPunches, year, monthIndex),
    [allPunches, year, monthIndex],
  )

  const cells = useMemo(() => buildCalendarCells(year, monthIndex), [year, monthIndex])

  const monthLabel = new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(new Date(year, monthIndex, 15))

  function shiftMonth(delta: number) {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))
  }

  async function confirmDelete() {
    if (!user || !deleteTarget) return
    setDeleting(true)
    try {
      await deleteAttendancePunch({ id: deleteTarget.id, userId: user.id })
      toast.success(`${deleteTarget.label} deleted`)
      setDeleteTarget(null)
      await refreshAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete punch')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="My Attendance"
        description="Review your Time In and Time Out history, selfies, and locations by day."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[#0a0a0a]">{monthLabel}</h2>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const [y, m] = todayKey.split('-').map(Number)
                  setCursor(new Date(y!, m! - 1, 1))
                  setSelectedKey(todayKey)
                }}
              >
                Today
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-ui">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              if (!cell) return <div key={`pad-${idx}`} />
              const key = cell.key
              const isSelected = key === selectedKey
              const isToday = key === todayKey
              const has = marked.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  className={cn(
                    'relative flex h-11 flex-col items-center justify-center rounded-[10px] text-sm transition-colors',
                    isSelected
                      ? 'bg-emerald-900 text-white'
                      : 'hover:bg-emerald-50 text-[#073D2C]',
                    !isSelected && isToday && 'ring-1 ring-gold',
                  )}
                >
                  <span className="font-medium">{cell.day}</span>
                  {has ? (
                    <span
                      className={cn(
                        'mt-0.5 h-1.5 w-1.5 rounded-full',
                        isSelected ? 'bg-gold' : 'bg-emerald-600',
                      )}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
          {loading ? (
            <p className="mt-3 text-sm text-slate-ui">Loading calendar…</p>
          ) : (
            <p className="mt-3 text-xs text-slate-ui">
              Days with a gold/green dot have Time In or Time Out records.
            </p>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">
            {formatDayHeading(selectedKey)}
          </h2>
          <p className="mt-1 text-sm text-slate-ui">
            {dayPunches.length === 0
              ? 'No punches on this day.'
              : `${dayPunches.length} punch${dayPunches.length === 1 ? '' : 'es'}`}
          </p>

          <ul className="mt-4 space-y-3">
            {dayPunches.map((p) => {
              const label = p.punchType === 'time_in' ? 'Time In' : 'Time Out'
              return (
                <li
                  key={p.id}
                  className="overflow-hidden rounded-[14px] border border-border bg-white shadow-sm"
                >
                  <div className="flex gap-3 p-3">
                    {p.photoUrl ? (
                      <img
                        src={p.photoUrl}
                        alt={`${p.punchType} selfie`}
                        className="h-24 w-24 shrink-0 rounded-[10px] object-cover scale-x-[-1]"
                      />
                    ) : (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[10px] bg-slate-100 text-xs text-slate-ui">
                        No photo
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[#073D2C]">{label}</p>
                        <button
                          type="button"
                          aria-label={`Delete ${label}`}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          onClick={() => setDeleteTarget({ id: p.id, label })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-ui">{formatManilaTime(p.punchedAt)}</p>
                      <p className="text-xs text-slate-ui">{formatManilaDateTime(p.punchedAt)}</p>
                      {p.locationLabel || (p.latitude != null && p.longitude != null) ? (
                        <a
                          className="mt-2 inline-flex items-start gap-1 text-xs font-semibold text-emerald-800 underline"
                          href={
                            p.latitude != null && p.longitude != null
                              ? `https://www.google.com/maps?q=${p.latitude},${p.longitude}`
                              : undefined
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            {p.locationLabel || 'Location on map'}
                            {p.accuracyM != null && !p.locationLabel
                              ? ` (±${Math.round(p.accuracyM)}m)`
                              : ''}
                          </span>
                        </a>
                      ) : (
                        <p className="mt-2 text-xs text-slate-ui">No location saved</p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        title={`Delete ${deleteTarget?.label ?? 'attendance'}?`}
        description="This will permanently remove this Time In / Time Out record, including the selfie. This cannot be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        destructive
        onConfirm={() => {
          if (!deleting) void confirmDelete()
        }}
      />
    </div>
  )
}

function formatDayHeading(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!, 4, 0, 0))
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(dt)
}

function buildCalendarCells(
  year: number,
  monthIndex: number,
): Array<{ day: number; key: string } | null> {
  const first = new Date(year, monthIndex, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells: Array<{ day: number; key: string } | null> = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ day, key })
  }
  return cells
}
