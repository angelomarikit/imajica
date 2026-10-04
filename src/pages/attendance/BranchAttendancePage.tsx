import { useEffect, useMemo, useState } from 'react'
import {
  Clock,
  FileSpreadsheet,
  Filter,
  MapPin,
  Search,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Navigate } from 'react-router-dom'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { useEffectiveBranchId, useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import {
  exportBranchAttendanceXlsx,
  formatAttendanceHours,
  formatManilaDateTime,
  formatManilaTime,
  listBranchAttendance,
  manilaDateKey,
  resolveAttendancePhotoUrl,
  subscribeAttendance,
  summarizeStaffAttendance,
  type AttendanceSession,
  type StaffAttendanceSummary,
} from '@/services/attendanceService'
import { listAccessUsers } from '@/services/userAccessService'
import { TIMECLOCK_ROLES, canAccessHqAdmin, isBranchOwner } from '@/utils/franchiseAccess'
import { cn } from '@/utils/cn'
import { formatRoleLabel } from '@/utils/roleLabels'
import type { AccessUser, UserRole } from '@/types'

function defaultRange() {
  const to = manilaDateKey()
  const d = new Date(`${to}T12:00:00+08:00`)
  d.setDate(1)
  const from = manilaDateKey(d)
  return { from, to }
}

function roleLabel(role: string) {
  return formatRoleLabel(role)
}

export function BranchAttendancePage() {
  const { user } = useAuth()
  const { branches } = useBranch()
  const forcedBranchId = useForcedBranchId()
  const effectiveBranchId = useEffectiveBranchId()
  const allowed = isBranchOwner(user) || canAccessHqAdmin(user)

  // Branch admins are always locked to their clinic; HQ must pick a branch (not "all")
  const branchId =
    forcedBranchId ??
    (effectiveBranchId === 'all' ? '' : effectiveBranchId)
  const branchName =
    branches.find((b) => b.id === branchId)?.name ??
    user?.branchName ??
    'Branch'

  const initial = defaultRange()
  const [fromDraft, setFromDraft] = useState(initial.from)
  const [toDraft, setToDraft] = useState(initial.to)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [summaries, setSummaries] = useState<StaffAttendanceSummary[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [sessionModal, setSessionModal] = useState<{
    staff: StaffAttendanceSummary
    session: AttendanceSession
  } | null>(null)

  async function load() {
    if (!branchId) {
      setSummaries([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [punches, users] = await Promise.all([
        listBranchAttendance(branchId, from, to),
        listAccessUsers(),
      ])

      // Strict: only this branch's timeclock staff (never other clinics)
      const branchStaff = users.filter(
        (u) =>
          u.branchId === branchId &&
          TIMECLOCK_ROLES.includes(u.role as UserRole),
      )

      const peopleMap = new Map<string, AccessUser>()
      for (const u of branchStaff) peopleMap.set(u.id, u)

      // Punches are already branch-scoped; attach unknown punchers only if
      // directory says they belong here (or directory has no branch conflict)
      for (const punch of punches) {
        if (peopleMap.has(punch.userId)) continue
        if (punch.branchId !== branchId) continue
        const known = users.find((u) => u.id === punch.userId)
        if (known?.branchId && known.branchId !== branchId) continue
        if (known && !TIMECLOCK_ROLES.includes(known.role as UserRole)) continue
        peopleMap.set(punch.userId, {
          id: punch.userId,
          fullName: known?.fullName ?? `Staff ${punch.userId.slice(0, 8)}`,
          email: known?.email ?? '',
          role: known?.role ?? 'STAFF',
          branchId,
          branchName,
          status: known?.status ?? 'active',
        })
      }

      // Only punches for people in this branch roster
      const rosterIds = new Set(peopleMap.keys())
      const scopedPunches = punches.filter(
        (p) => p.branchId === branchId && rosterIds.has(p.userId),
      )

      const next = summarizeStaffAttendance(
        scopedPunches,
        [...peopleMap.values()].map((u) => ({
          id: u.id,
          fullName: u.fullName,
          role: u.role,
          email: u.email,
        })),
      ).filter((s) => {
        const person = peopleMap.get(s.userId)
        return Boolean(person && person.branchId === branchId)
      })

      setSummaries(next)
      setSelectedUserId((prev) => {
        if (prev && next.some((s) => s.userId === prev)) return prev
        return next[0]?.userId ?? null
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load branch attendance')
      setSummaries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    return subscribeAttendance(() => {
      void load()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, from, to])

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return summaries
    return summaries.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        formatRoleLabel(s.role).toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q),
    )
  }, [summaries, query])

  const selected = summaries.find((s) => s.userId === selectedUserId) ?? null

  const branchTotals = useMemo(() => {
    const withActivity = summaries.filter((s) => s.sessionCount > 0)
    return {
      staffCount: summaries.length,
      activeCount: withActivity.length,
      totalHours: withActivity.reduce((sum, s) => sum + s.totalHours, 0),
      openSessions: withActivity.reduce((sum, s) => sum + s.openSessions, 0),
    }
  }, [summaries])

  if (!allowed) {
    return <Navigate to="/admin/dashboard" replace />
  }

  function applyFilter() {
    if (fromDraft > toDraft) {
      toast.error('Start date must be on or before end date')
      return
    }
    setFrom(fromDraft)
    setTo(toDraft)
  }

  async function handleExport() {
    if (!branchId) {
      toast.error('Select a branch first')
      return
    }
    if (!summaries.length) {
      toast.error('No staff attendance to export')
      return
    }
    setExporting(true)
    try {
      await exportBranchAttendanceXlsx({
        filename: `imajica-branch-attendance-${branchName.replace(/\s+/g, '-').toLowerCase()}-${from}-${to}.xlsx`,
        branchName,
        from,
        to,
        summaries,
      })
      toast.success('Exported branch attendance workbook')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Branch Attendance"
        description={`Review Time In / Time Out for ${branchName} staff only. Tap a session row to see selfie and punch details.`}
        stat={{
          value: formatAttendanceHours(branchTotals.totalHours),
          label: 'Total hours',
        }}
        actions={
          <Button
            type="button"
            variant="secondary"
            className="border-white/25 bg-white/10 text-white hover:bg-white/20"
            disabled={exporting || loading}
            onClick={() => void handleExport()}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export Excel'}
          </Button>
        }
      />

      {!forcedBranchId && !branchId ? (
        <Card className="p-5 text-sm text-slate-ui">
          Select a specific branch in the header to view attendance.
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Timeclock staff" value={String(branchTotals.staffCount)} icon={Users} />
        <Kpi
          label="With punches"
          value={String(branchTotals.activeCount)}
          icon={Clock}
        />
        <Kpi
          label="Total hours"
          value={formatAttendanceHours(branchTotals.totalHours)}
          icon={Clock}
        />
        <Kpi
          label="Open (no Time Out)"
          value={String(branchTotals.openSessions)}
          tone={branchTotals.openSessions > 0 ? 'warn' : 'default'}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="block min-w-[9rem] flex-1 text-xs font-medium text-slate-ui">
            From
            <input
              type="date"
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal"
            />
          </label>
          <label className="block min-w-[9rem] flex-1 text-xs font-medium text-slate-ui">
            To
            <input
              type="date"
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal"
            />
          </label>
          <Button type="button" onClick={applyFilter} className="lg:mb-0.5">
            <Filter className="h-4 w-4" />
            Apply
          </Button>
          <p className="text-xs text-slate-ui lg:ml-auto lg:self-center">
            Showing {from} → {to}
          </p>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <Card className="flex max-h-[70vh] flex-col overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-[#073D2C]">Staff</p>
            <p className="text-[11px] text-slate-ui">
              Select a person to review their punches
            </p>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-ui" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or role…"
                className="w-full rounded-[10px] border border-border bg-ivory-50 py-2 pl-8 pr-3 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-slate-ui">Loading attendance…</p>
            ) : filteredStaff.length === 0 ? (
              <p className="p-4 text-sm text-slate-ui">No staff found for this branch / range.</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {filteredStaff.map((s) => {
                  const active = s.userId === selectedUserId
                  return (
                    <li key={s.userId}>
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(s.userId)}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-3 text-left transition',
                          active ? 'bg-emerald-50' : 'hover:bg-ivory-50',
                        )}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-900">
                          {s.fullName.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-charcoal">
                              {s.fullName}
                            </p>
                            <span className="shrink-0 text-xs font-semibold text-[#073D2C]">
                              {formatAttendanceHours(s.totalHours)}
                            </span>
                          </div>
                          <p className="truncate text-[11px] capitalize text-slate-ui">
                            {roleLabel(s.role)}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {s.sessionCount === 0 ? (
                              <Badge variant="neutral">No punches</Badge>
                            ) : (
                              <>
                                <Badge variant="success">{s.daysPresent} day(s)</Badge>
                                {s.openSessions > 0 ? (
                                  <Badge variant="warning">{s.openSessions} open</Badge>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Card>

        <Card className="min-h-[24rem] p-4 sm:p-5">
          {!selected ? (
            <div className="grid h-full min-h-[18rem] place-items-center text-sm text-slate-ui">
              Select a staff member to view Time In / Time Out details.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#0a0a0a]">{selected.fullName}</h2>
                  <p className="text-sm capitalize text-slate-ui">
                    {roleLabel(selected.role)}
                    {selected.email ? ` · ${selected.email}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <MiniStat label="Days" value={String(selected.daysPresent)} />
                  <MiniStat label="Sessions" value={String(selected.sessionCount)} />
                  <MiniStat
                    label="Total hours"
                    value={formatAttendanceHours(selected.totalHours)}
                  />
                </div>
              </div>

              {selected.sessions.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-border bg-ivory-50 px-4 py-8 text-center text-sm text-slate-ui">
                  No Time In / Time Out records in this date range.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-ui">
                    Tap a row to open selfie and punch details.
                  </p>
                  <div className="overflow-x-auto rounded-[12px] border border-border">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-ivory-50 text-[11px] uppercase tracking-wide text-slate-ui">
                      <tr>
                        <th className="px-3 py-2.5 font-semibold">Date</th>
                        <th className="px-3 py-2.5 font-semibold">Time In</th>
                        <th className="px-3 py-2.5 font-semibold">Time Out</th>
                        <th className="px-3 py-2.5 font-semibold">Hours</th>
                        <th className="px-3 py-2.5 font-semibold">Location</th>
                        <th className="px-3 py-2.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {selected.sessions.map((session) => (
                        <tr
                          key={session.timeIn.id}
                          className="cursor-pointer bg-white transition hover:bg-emerald-50/70"
                          onClick={() => setSessionModal({ staff: selected, session })}
                        >
                          <td className="whitespace-nowrap px-3 py-3 font-medium text-charcoal">
                            {session.dateKey}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <p>{formatManilaTime(session.timeIn.punchedAt)}</p>
                            <p className="text-[11px] text-slate-ui">
                              {formatManilaDateTime(session.timeIn.punchedAt)}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            {session.timeOut ? (
                              <>
                                <p>{formatManilaTime(session.timeOut.punchedAt)}</p>
                                <p className="text-[11px] text-slate-ui">
                                  {formatManilaDateTime(session.timeOut.punchedAt)}
                                </p>
                              </>
                            ) : (
                              <span className="text-slate-ui">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-semibold text-[#073D2C]">
                            {formatAttendanceHours(session.hours)}
                          </td>
                          <td className="max-w-[14rem] px-3 py-3 text-xs text-slate-ui">
                            <span className="inline-flex items-start gap-1">
                              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>
                                {session.timeIn.locationLabel ?? '—'}
                                {session.timeOut?.locationLabel
                                  ? ` → ${session.timeOut.locationLabel}`
                                  : ''}
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {session.timeOut ? (
                              <Badge variant="success">Complete</Badge>
                            ) : (
                              <Badge variant="warning">Open</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {sessionModal ? (
        <AttendanceSessionModal
          staffName={sessionModal.staff.fullName}
          staffRole={sessionModal.staff.role}
          staffEmail={sessionModal.staff.email}
          branchName={branchName}
          session={sessionModal.session}
          onClose={() => setSessionModal(null)}
        />
      ) : null}
    </div>
  )
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string
  icon?: typeof Clock
  tone?: 'default' | 'warn'
}) {
  return (
    <Card
      className={cn(
        'p-4',
        tone === 'warn' && 'border-amber-200 bg-amber-50/60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-ui">{label}</p>
          <p className="mt-1 text-xl font-semibold text-[#073D2C]">{value}</p>
        </div>
        {Icon ? (
          <span className="rounded-full bg-emerald-50 p-2 text-emerald-800">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </Card>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-ivory-50 px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-slate-ui">{label}</p>
      <p className="text-sm font-semibold text-[#073D2C]">{value}</p>
    </div>
  )
}

function AttendanceSessionModal({
  staffName,
  staffRole,
  staffEmail,
  branchName,
  session,
  onClose,
}: {
  staffName: string
  staffRole: string
  staffEmail: string
  branchName: string
  session: AttendanceSession
  onClose: () => void
}) {
  const [timeInPhoto, setTimeInPhoto] = useState<string | null>(null)
  const [timeOutPhoto, setTimeOutPhoto] = useState<string | null>(null)
  const [loadingPhotos, setLoadingPhotos] = useState(true)

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
              {roleLabel(staffRole)}
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
                session.timeOut
                  ? formatManilaDateTime(session.timeOut.punchedAt)
                  : null
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
