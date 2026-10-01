import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  StickyNote,
  UserRound,
  Wallet,
  X,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Appointment, AppointmentStatus } from '@/types'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'

function statusMeta(status: AppointmentStatus): {
  label: string
  badge: 'success' | 'warning' | 'danger' | 'neutral'
  tone: string
} {
  switch (status) {
    case 'completed':
    case 'checked_in':
    case 'in_progress':
      return {
        label: status === 'completed' ? 'Showed up' : status.replace('_', ' '),
        badge: 'success',
        tone: 'border-emerald-200 bg-emerald-50',
      }
    case 'confirmed':
      return {
        label: 'Confirmed',
        badge: 'success',
        tone: 'border-emerald-200 bg-emerald-50/80',
      }
    case 'no_show':
      return { label: 'No show', badge: 'danger', tone: 'border-red-200 bg-red-50' }
    case 'cancelled':
      return { label: 'Cancelled', badge: 'danger', tone: 'border-red-200 bg-red-50' }
    case 'rescheduled':
      return { label: 'Rescheduled', badge: 'warning', tone: 'border-amber-200 bg-amber-50' }
    default:
      return { label: 'Pending', badge: 'warning', tone: 'border-[#E8D9B8] bg-[#FBF7F0]' }
  }
}

function formatWhen(startAt: string, endAt?: string, durationMinutes?: number) {
  const start = new Date(startAt)
  if (Number.isNaN(start.getTime())) return { date: '—', time: '—', range: '—' }
  const date = start.toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const time = start.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  let endLabel = ''
  if (endAt) {
    const end = new Date(endAt)
    if (!Number.isNaN(end.getTime())) {
      endLabel = end.toLocaleTimeString('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }
  } else if (durationMinutes) {
    const end = new Date(start.getTime() + durationMinutes * 60_000)
    endLabel = end.toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }
  return {
    date,
    time,
    range: endLabel ? `${time} – ${endLabel}` : time,
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Centered appointment detail modal — clear for front-desk staff. */
export function AppointmentDetailModal({
  appointment,
  onClose,
  onUpdateStatus,
  saving,
}: {
  appointment: Appointment | null
  onClose: () => void
  onUpdateStatus: (id: string, status: AppointmentStatus) => void | Promise<void>
  saving?: boolean
}) {
  if (!appointment) return null

  const meta = statusMeta(appointment.status)
  const when = formatWhen(appointment.startAt, appointment.endAt, appointment.durationMinutes)
  const treatments = [appointment.treatmentName, appointment.treatmentName2]
    .map((t) => t?.trim())
    .filter(Boolean) as string[]
  const busy = Boolean(saving)
  const isTerminal =
    appointment.status === 'cancelled' ||
    appointment.status === 'completed' ||
    appointment.status === 'no_show'

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-[#041c18]/45 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="appt-detail-title"
        className="relative z-10 flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-[18px] bg-white shadow-2xl"
      >
        {/* Header */}
        <div className={cn('shrink-0 border-b border-border px-4 py-4 sm:px-5', meta.tone)}>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#073D2C] text-sm font-semibold text-white">
              {initials(appointment.clientName) || 'C'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="appt-detail-title"
                  className="truncate font-display text-xl font-semibold tracking-tight text-[#073D2C]"
                >
                  {appointment.clientName}
                </h2>
                <Badge variant={meta.badge}>{meta.label}</Badge>
              </div>
              <p className="mt-0.5 text-sm text-slate-ui">
                {when.date} · {when.range}
              </p>
              {appointment.clientStatus ? (
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-ui">
                  Client: {appointment.clientStatus}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white/80 text-charcoal hover:bg-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <section className="rounded-[14px] border border-border bg-ivory-50/60 p-3.5">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-ui">
              Schedule
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <DetailRow icon={CalendarDays} label="Date" value={when.date} />
              <DetailRow icon={Clock3} label="Time" value={when.range} />
              <DetailRow icon={MapPin} label="Branch" value={appointment.branchName} />
              <DetailRow
                icon={UserRound}
                label="Staff"
                value={appointment.staffName || 'Unassigned'}
              />
            </div>
          </section>

          <section className="rounded-[14px] border border-border bg-white p-3.5">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-ui">
              Services
            </p>
            <ul className="space-y-2">
              {treatments.map((name) => (
                <li
                  key={name}
                  className="rounded-[10px] border border-border/80 bg-ivory-50 px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-[#073D2C]"
                >
                  {name}
                </li>
              ))}
            </ul>
            {appointment.durationMinutes ? (
              <p className="mt-2 text-xs text-slate-ui">
                Duration · about {appointment.durationMinutes} minutes
              </p>
            ) : null}
          </section>

          <section className="rounded-[14px] border border-border bg-white p-3.5">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-ui">
              Payment & notes
            </p>
            <div className="space-y-2 text-sm">
              {(appointment.downPayment ?? 0) > 0 ? (
                <DetailRow
                  icon={Wallet}
                  label="Amount"
                  value={formatPesoExact(appointment.downPayment ?? 0)}
                />
              ) : null}
              {appointment.leadSource ? (
                <p className="text-slate-ui">
                  Lead source · <span className="text-charcoal">{appointment.leadSource}</span>
                </p>
              ) : null}
              {appointment.clientPhone ? (
                <p className="text-slate-ui">
                  Phone · <span className="text-charcoal">{appointment.clientPhone}</span>
                </p>
              ) : null}
              {appointment.notes ? (
                <div className="flex gap-2 rounded-[10px] bg-sky-50 px-3 py-2.5 text-sky-950">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-sm leading-relaxed">{appointment.notes}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-ui">No extra notes on this booking.</p>
              )}
            </div>
          </section>
        </div>

        {/* Sticky actions — always visible */}
        <div className="shrink-0 space-y-2 border-t border-border bg-white px-4 py-3 sm:px-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-ui">
            Update attendance
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={busy || appointment.status === 'completed'}
              className="h-11"
              onClick={() => void onUpdateStatus(appointment.id, 'completed')}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              Came in (Show)
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || appointment.status === 'no_show'}
              className="h-11"
              onClick={() => void onUpdateStatus(appointment.id, 'no_show')}
            >
              <XCircle className="h-4 w-4 text-red-600" />
              No show
            </Button>
          </div>

          {!isTerminal ? (
            <div className="grid grid-cols-2 gap-2">
              {appointment.status !== 'confirmed' ? (
                <Button
                  type="button"
                  disabled={busy}
                  className="h-11"
                  onClick={() => void onUpdateStatus(appointment.id, 'confirmed')}
                >
                  Confirm booking
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  className="h-11"
                  onClick={() => void onUpdateStatus(appointment.id, 'pending')}
                >
                  Back to pending
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                className="h-11"
                onClick={() => void onUpdateStatus(appointment.id, 'cancelled')}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              className="h-11 w-full"
              onClick={() => void onUpdateStatus(appointment.id, 'pending')}
            >
              Reopen as pending
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 rounded-full bg-emerald-50 p-1.5 text-emerald-800">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-ui">{label}</p>
        <p className="truncate text-sm font-medium text-charcoal">{value}</p>
      </div>
    </div>
  )
}
