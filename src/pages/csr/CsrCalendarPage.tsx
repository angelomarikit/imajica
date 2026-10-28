import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useBranch } from '@/contexts/BranchContext'
import { toDateKey } from '@/services/appointmentService'
import {
  csrCalendarBusySlots,
  csrRescheduleBooking,
  type CsrBusySlot,
} from '@/services/csrMarketingService'
import type { AppointmentStatus } from '@/types'
import { cn } from '@/utils/cn'

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

type ScheduleLegend = 'show' | 'no_show' | 'pending'

function legendForStatus(status: string): ScheduleLegend {
  const s = status as AppointmentStatus
  if (s === 'no_show' || s === 'cancelled') return 'no_show'
  if (
    s === 'completed' ||
    s === 'checked_in' ||
    s === 'in_progress' ||
    s === 'confirmed'
  ) {
    return 'show'
  }
  return 'pending'
}

function legendDot(kind: ScheduleLegend) {
  if (kind === 'show') return 'bg-emerald-600'
  if (kind === 'no_show') return 'bg-red-500'
  return 'bg-[#C5A059]'
}

function legendChip(kind: ScheduleLegend) {
  if (kind === 'show') return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  if (kind === 'no_show') return 'border-red-200 bg-red-50 text-red-700'
  return 'border-[#E8D9B8] bg-[#FBF7F0] text-[#8a6d2f]'
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function buildMonthCells(monthCursor: Date): Date[] {
  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push(d)
  }
  return cells
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function slotLabel(slot: CsrBusySlot) {
  // Own bookings: first name; others stay privacy-safe
  if (slot.isOwn) {
    const first = slot.clientLabel.trim().split(/\s+/)[0] || 'Client'
    return first
  }
  return 'Booked'
}

export function CsrCalendarPage() {
  const navigate = useNavigate()
  const { selectedBranchId, selectedBranch, branches } = useBranch()
  const branchId = selectedBranchId !== 'all' ? selectedBranchId : branches[0]?.id

  const [calendarMode, setCalendarMode] = useState<'month' | 'list'>('month')
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [slots, setSlots] = useState<CsrBusySlot[]>([])
  const [loading, setLoading] = useState(false)
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [newStart, setNewStart] = useState('')
  const [saving, setSaving] = useState(false)

  const cells = useMemo(() => buildMonthCells(monthCursor), [monthCursor])
  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  useEffect(() => {
    if (!branchId) {
      setSlots([])
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const from = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
        from.setHours(0, 0, 0, 0)
        const to = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0)
        to.setHours(23, 59, 59, 999)
        const rows = await csrCalendarBusySlots({
          branchId,
          from: from.toISOString(),
          to: to.toISOString(),
        })
        if (!cancelled) setSlots(rows)
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Could not load calendar')
          setSlots([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [branchId, monthCursor])

  const byDate = useMemo(() => {
    const map = new Map<string, CsrBusySlot[]>()
    for (const s of slots) {
      const key = toDateKey(new Date(s.startAt))
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
    }
    return map
  }, [slots])

  const monthSlots = useMemo(() => {
    const y = monthCursor.getFullYear()
    const m = monthCursor.getMonth()
    return slots
      .filter((s) => {
        const d = new Date(s.startAt)
        return d.getFullYear() === y && d.getMonth() === m
      })
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
  }, [slots, monthCursor])

  const selectedDaySlots = useMemo(() => {
    const key = toDateKey(selectedDate)
    return byDate.get(key) ?? []
  }, [byDate, selectedDate])

  function goToday() {
    const t = new Date()
    setMonthCursor(startOfMonth(t))
    setSelectedDate(t)
  }

  function bookOnSelectedDay() {
    const date = toDateKey(selectedDate)
    navigate(`/admin/csr/book?date=${encodeURIComponent(date)}`)
  }

  async function handleReschedule(slot: CsrBusySlot) {
    if (!newStart) {
      toast.error('Pick a new start time')
      return
    }
    const dayKey = toDateKey(new Date(slot.startAt))
    const start = new Date(`${dayKey}T${newStart}:00`)
    const durationMs = Math.max(5, slot.durationMinutes || 60) * 60_000
    const end = new Date(start.getTime() + durationMs)
    setSaving(true)
    try {
      await csrRescheduleBooking({
        appointmentId: slot.id,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        staffId: slot.staffId,
      })
      toast.success('Booking rescheduled')
      setRescheduleId(null)
      setNewStart('')
      if (branchId) {
        const from = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
        from.setHours(0, 0, 0, 0)
        const to = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0)
        to.setHours(23, 59, 59, 999)
        setSlots(
          await csrCalendarBusySlots({
            branchId,
            from: from.toISOString(),
            to: to.toISOString(),
          }),
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reschedule failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C5A059]">
            CSR Scheduling
          </p>
          <h1 className="font-display text-4xl text-[#073D2C]">Calendar</h1>
          <p className="text-sm text-slate-ui">
            {selectedBranch?.name || 'Select a branch'} — same month view as clinic scheduling.
            Other clients show as “Booked” only.
          </p>
        </div>
        <Button onClick={bookOnSelectedDay}>
          <Plus className="h-4 w-4" /> Book on{' '}
          {selectedDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm text-slate-ui">
          <CalendarDays className="h-4 w-4 text-emerald-800" />
          Pick a day with free space, then book that client into an open slot.
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-ui">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', legendDot('show'))} /> Confirmed / Show
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', legendDot('no_show'))} /> No Show / Cancelled
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', legendDot('pending'))} /> Pending
          </span>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setMonthCursor(
                  new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1),
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-border text-[#073D2C] hover:bg-ivory-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setMonthCursor(
                  new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1),
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-border text-[#073D2C] hover:bg-ivory-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="ml-1 h-9 rounded-[8px] border border-border px-3 text-sm font-semibold text-[#073D2C] hover:bg-ivory-100"
            >
              Today
            </button>
          </div>

          <h2 className="font-display text-2xl text-[#073D2C]">
            {monthCursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
          </h2>

          <div className="inline-flex rounded-[10px] border border-border bg-ivory-100 p-1">
            <button
              type="button"
              onClick={() => setCalendarMode('month')}
              className={cn(
                'rounded-[8px] px-3 py-1.5 text-sm font-semibold transition',
                calendarMode === 'month'
                  ? 'bg-[#073D2C] text-white'
                  : 'text-slate-ui hover:text-[#073D2C]',
              )}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode('list')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-sm font-semibold transition',
                calendarMode === 'list'
                  ? 'bg-[#073D2C] text-white'
                  : 'text-slate-ui hover:text-[#073D2C]',
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              List
            </button>
          </div>
        </div>

        {!branchId ? (
          <p className="p-8 text-center text-sm text-slate-ui">
            No clinic assigned. Ask HQ to assign branches to your CSR account.
          </p>
        ) : loading ? (
          <p className="p-8 text-center text-sm text-slate-ui">Loading schedule…</p>
        ) : calendarMode === 'month' ? (
          <div className="p-3 sm:p-4">
            <div className="mb-2 grid grid-cols-7 gap-px">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-ui"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[12px] border border-border bg-border">
              {cells.map((day) => {
                const inMonth = day.getMonth() === monthCursor.getMonth()
                const isToday = sameDay(day, today)
                const isSelected = sameDay(day, selectedDate)
                const key = toDateKey(day)
                const daySlots = byDate.get(key) ?? []
                return (
                  <button
                    key={key + String(day.getMonth())}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'flex min-h-[96px] flex-col gap-1 bg-white p-2 text-left transition sm:min-h-[110px]',
                      !inMonth && 'bg-[#FAF8F2]/80',
                      isSelected && 'bg-[#F3F7F5] ring-1 ring-inset ring-[#073D2C]/25',
                      isToday && !isSelected && 'bg-[#FBF7F0]',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                        !inMonth && 'text-slate-ui/50',
                        inMonth && 'text-[#073D2C]',
                        isToday && 'bg-[#073D2C] text-white',
                      )}
                    >
                      {day.getDate()}
                    </span>
                    <div className="flex w-full flex-col gap-1 overflow-hidden">
                      {daySlots.slice(0, 3).map((s) => {
                        const kind = legendForStatus(s.status)
                        return (
                          <span
                            key={s.id}
                            className={cn(
                              'truncate rounded-[6px] border px-1.5 py-0.5 text-[10px] font-medium leading-tight',
                              legendChip(kind),
                              !s.isOwn && 'opacity-80',
                            )}
                          >
                            {new Date(s.startAt).toLocaleTimeString('en-PH', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}{' '}
                            {slotLabel(s)}
                          </span>
                        )
                      })}
                      {daySlots.length > 3 ? (
                        <span className="text-[10px] font-medium text-slate-ui">
                          +{daySlots.length - 3} more
                        </span>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {monthSlots.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-ui">
                No schedules in{' '}
                {monthCursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}.
              </p>
            ) : (
              monthSlots.map((s) => {
                const kind = legendForStatus(s.status)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedDate(new Date(s.startAt))}
                    className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-ivory-100"
                  >
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', legendDot(kind))} />
                    <div className="min-w-[140px]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#C5A059]">
                        {new Date(s.startAt).toLocaleDateString('en-PH', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm font-medium text-[#073D2C]">
                        {new Date(s.startAt).toLocaleTimeString('en-PH', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#073D2C]">
                        {s.isOwn ? s.clientLabel : 'Booked'}
                        {s.isOwn ? (
                          <Badge className="ml-2 bg-emerald-50 text-emerald-900">Yours</Badge>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-slate-ui">
                        {s.isOwn ? s.treatmentLabel : 'Occupied'}
                        {s.staffName ? ` · ${s.staffName}` : ''}
                      </p>
                    </div>
                    <Badge
                      variant={
                        kind === 'show' ? 'success' : kind === 'no_show' ? 'danger' : 'warning'
                      }
                    >
                      {kind === 'show' ? 'Show' : kind === 'no_show' ? 'No Show' : 'Pending'}
                    </Badge>
                  </button>
                )
              })
            )}
          </div>
        )}
      </Card>

      {/* Selected day detail — helps CSR decide if they can add a client */}
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-xl text-[#073D2C]">
              {selectedDate.toLocaleDateString('en-PH', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h3>
            <p className="text-xs text-slate-ui">
              {selectedDaySlots.length} booking{selectedDaySlots.length === 1 ? '' : 's'} on this day
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={bookOnSelectedDay}>
              <Plus className="h-4 w-4" /> Add client on this day
            </Button>
            <Link to="/admin/csr/book">
              <Button type="button" variant="secondary">
                Book Appointment
              </Button>
            </Link>
          </div>
        </div>

        {selectedDaySlots.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-border bg-cream/40 px-4 py-6 text-center text-sm text-slate-ui">
            No bookings yet — this day looks open for a new client.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-[10px] border border-border">
            {selectedDaySlots.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[#073D2C]">
                    {new Date(s.startAt).toLocaleTimeString('en-PH', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}{' '}
                    –{' '}
                    {new Date(s.endAt).toLocaleTimeString('en-PH', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-sm text-slate-ui">
                    {s.isOwn ? s.clientLabel : 'Booked (other CSR / clinic)'}
                    {' · '}
                    {s.isOwn ? s.treatmentLabel : 'Occupied'}
                    {s.staffName ? ` · ${s.staffName}` : ''}
                  </p>
                </div>
                {s.isOwn ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {rescheduleId === s.id ? (
                      <>
                        <input
                          type="time"
                          className="h-10 rounded-[10px] border border-border px-2 text-sm"
                          value={newStart}
                          onChange={(e) => setNewStart(e.target.value)}
                        />
                        <Button size="sm" disabled={saving} onClick={() => void handleReschedule(s)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setRescheduleId(null)
                            setNewStart('')
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setRescheduleId(s.id)
                          const local = new Date(s.startAt)
                          setNewStart(
                            `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`,
                          )
                        }}
                      >
                        Reschedule
                      </Button>
                    )}
                  </div>
                ) : (
                  <Badge className="bg-slate-100 text-slate-700">Occupied</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
