import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Plus,
  Table2,
} from 'lucide-react'
import { toast } from 'sonner'
import { AddClientScheduleModal } from '@/components/booking/AddClientScheduleModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import {
  listAppointments,
  subscribeAppointments,
  toDateKey,
  updateAppointmentStatus,
} from '@/services/appointmentService'
import type { Appointment, AppointmentStatus } from '@/types'
import { cn } from '@/utils/cn'

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

type ScheduleLegend = 'show' | 'no_show' | 'pending'

function legendForStatus(status: AppointmentStatus): ScheduleLegend {
  if (status === 'no_show' || status === 'cancelled') return 'no_show'
  if (
    status === 'completed' ||
    status === 'checked_in' ||
    status === 'in_progress' ||
    status === 'confirmed'
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

export function AppointmentsPage() {
  const [mainView, setMainView] = useState<'calendar' | 'table'>('calendar')
  const [calendarMode, setCalendarMode] = useState<'month' | 'list'>('month')
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const cells = useMemo(() => buildMonthCells(monthCursor), [monthCursor])
  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const byDate = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const a of appointments) {
      const key = toDateKey(new Date(a.startAt))
      const list = map.get(key) ?? []
      list.push(a)
      map.set(key, list)
    }
    return map
  }, [appointments])

  const monthAppointments = useMemo(() => {
    const y = monthCursor.getFullYear()
    const m = monthCursor.getMonth()
    return appointments
      .filter((a) => {
        const d = new Date(a.startAt)
        return d.getFullYear() === y && d.getMonth() === m
      })
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
  }, [appointments, monthCursor])

  async function refresh() {
    try {
      setAppointments(await listAppointments())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load appointments')
    }
  }

  useEffect(() => {
    void refresh()
    return subscribeAppointments(() => {
      void refresh()
    })
  }, [])

  async function updateStatus(id: string, status: AppointmentStatus) {
    try {
      const updated = await updateAppointmentStatus(id, status)
      if (updated) {
        setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)))
        setSelectedAppt((prev) => (prev && prev.id === id ? updated : prev))
      }
      toast.success(`Marked as ${status.replace('_', ' ')}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  async function handleAddSaved() {
    toast.success('Schedule added')
    await refresh()
  }

  function goToday() {
    const now = new Date()
    setMonthCursor(startOfMonth(now))
    setSelectedDate(now)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C5A059]">
            Scheduling
          </p>
          <h1 className="font-display text-4xl text-[#073D2C]">Client Scheduling</h1>
          <p className="text-sm text-slate-ui">
            Manage bookings, client show / no-show statuses, and clinic schedule.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add Schedule
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[10px] border border-border bg-white p-1">
          <button
            type="button"
            onClick={() => setMainView('calendar')}
            className={cn(
              'inline-flex items-center gap-2 rounded-[8px] px-3.5 py-2 text-sm font-semibold transition',
              mainView === 'calendar'
                ? 'bg-[#073D2C] text-white'
                : 'text-slate-ui hover:text-[#073D2C]',
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Calendar View
          </button>
          <button
            type="button"
            onClick={() => setMainView('table')}
            className={cn(
              'inline-flex items-center gap-2 rounded-[8px] px-3.5 py-2 text-sm font-semibold transition',
              mainView === 'table'
                ? 'bg-[#073D2C] text-white'
                : 'text-slate-ui hover:text-[#073D2C]',
            )}
          >
            <Table2 className="h-4 w-4" />
            Table View
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-ui">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', legendDot('show'))} /> Show
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', legendDot('no_show'))} /> No Show
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', legendDot('pending'))} /> Pending
          </span>
        </div>
      </div>

      {mainView === 'calendar' ? (
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

          {calendarMode === 'month' ? (
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
                  const dayAppts = byDate.get(key) ?? []
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
                        {dayAppts.slice(0, 3).map((a) => {
                          const kind = legendForStatus(a.status)
                          return (
                            <span
                              key={a.id}
                              role="presentation"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedAppt(a)
                              }}
                              className={cn(
                                'truncate rounded-[6px] border px-1.5 py-0.5 text-[10px] font-medium leading-tight',
                                legendChip(kind),
                              )}
                            >
                              {new Date(a.startAt).toLocaleTimeString('en-PH', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}{' '}
                              {a.clientName.split(' ')[0]}
                            </span>
                          )
                        })}
                        {dayAppts.length > 3 ? (
                          <span className="text-[10px] font-medium text-slate-ui">
                            +{dayAppts.length - 3} more
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
              {monthAppointments.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-ui">
                  No schedules in{' '}
                  {monthCursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}.
                </p>
              ) : (
                monthAppointments.map((a) => {
                  const kind = legendForStatus(a.status)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAppt(a)}
                      className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-ivory-100"
                    >
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', legendDot(kind))} />
                      <div className="min-w-[140px]">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#C5A059]">
                          {new Date(a.startAt).toLocaleDateString('en-PH', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-sm font-medium text-[#073D2C]">
                          {new Date(a.startAt).toLocaleTimeString('en-PH', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#073D2C]">{a.clientName}</p>
                        <p className="truncate text-xs text-slate-ui">
                          {a.treatmentName} · {a.staffName ?? 'Unassigned'} · {a.branchName}
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
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-slate-ui">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Treatment</th>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-ui">
                      No appointments yet. Click Add Schedule to create one.
                    </td>
                  </tr>
                ) : (
                  appointments.map((a) => {
                    const kind = legendForStatus(a.status)
                    return (
                      <tr
                        key={a.id}
                        className="cursor-pointer border-t border-border/70 hover:bg-ivory-100"
                        onClick={() => setSelectedAppt(a)}
                      >
                        <td className="px-4 py-3 font-medium">{a.clientName}</td>
                        <td className="px-4 py-3">{a.treatmentName}</td>
                        <td className="px-4 py-3">{a.staffName ?? '—'}</td>
                        <td className="px-4 py-3">{new Date(a.startAt).toLocaleString()}</td>
                        <td className="px-4 py-3">{a.branchName}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', legendDot(kind))} />
                            <Badge
                              variant={
                                kind === 'show'
                                  ? 'success'
                                  : kind === 'no_show'
                                    ? 'danger'
                                    : 'warning'
                              }
                            >
                              {kind === 'show'
                                ? 'Show'
                                : kind === 'no_show'
                                  ? 'No Show'
                                  : 'Pending'}
                            </Badge>
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Drawer
        open={Boolean(selectedAppt)}
        onClose={() => setSelectedAppt(null)}
        title={selectedAppt?.clientName}
        footer={
          selectedAppt ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => void updateStatus(selectedAppt.id, 'completed')}
              >
                Mark Show
              </Button>
              <Button
                variant="secondary"
                onClick={() => void updateStatus(selectedAppt.id, 'no_show')}
              >
                Mark No Show
              </Button>
              <Button
                variant="secondary"
                onClick={() => void updateStatus(selectedAppt.id, 'pending')}
              >
                Mark Pending
              </Button>
              <Button onClick={() => void updateStatus(selectedAppt.id, 'confirmed')}>
                Confirm
              </Button>
              <Button
                variant="destructive"
                className="col-span-2"
                onClick={() => void updateStatus(selectedAppt.id, 'cancelled')}
              >
                Cancel Appointment
              </Button>
            </div>
          ) : null
        }
      >
        {selectedAppt ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-slate-ui">Treatment:</span> {selectedAppt.treatmentName}
            </p>
            <p>
              <span className="text-slate-ui">Branch:</span> {selectedAppt.branchName}
            </p>
            <p>
              <span className="text-slate-ui">Staff:</span> {selectedAppt.staffName ?? 'Unassigned'}
            </p>
            <p>
              <span className="text-slate-ui">When:</span>{' '}
              {new Date(selectedAppt.startAt).toLocaleString()}
            </p>
            <p>
              <span className="text-slate-ui">Status:</span> {selectedAppt.status.replace('_', ' ')}
            </p>
            {selectedAppt.notes ? (
              <p>
                <span className="text-slate-ui">Notes:</span> {selectedAppt.notes}
              </p>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <AddClientScheduleModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={handleAddSaved}
        defaultDate={selectedDate}
      />
    </div>
  )
}
