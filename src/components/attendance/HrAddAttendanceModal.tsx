import { useEffect, useMemo, useState } from 'react'
import { Copy, MapPin, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import {
  createHrAttendanceSession,
  listEmployeeAttendanceLocations,
  listMyAttendance,
  manilaDateKey,
  type AttendanceLocationPick,
} from '@/services/attendanceService'
import { formatRoleLabel } from '@/utils/roleLabels'
import { cn } from '@/utils/cn'

function defaultTimeLocals(dateKey?: string) {
  const day = dateKey || manilaDateKey()
  return {
    timeIn: `${day}T09:45`,
    timeOut: `${day}T19:00`,
  }
}

function sameDayTimeOut(timeInLocal: string, timeOutLocal: string): string {
  const inDay = timeInLocal.slice(0, 10)
  const outTime = timeOutLocal.slice(11) || '19:00'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inDay)) return timeOutLocal
  return `${inDay}T${outTime}`
}

export function HrAddAttendanceModal({
  staffName,
  staffRole,
  staffEmail,
  userId,
  branchId,
  branchName,
  onClose,
  onSaved,
}: {
  staffName: string
  staffRole: string
  staffEmail: string
  userId: string
  branchId: string
  branchName: string
  onClose: () => void
  onSaved?: () => void
}) {
  const defaults = defaultTimeLocals()
  const [timeInLocal, setTimeInLocal] = useState(defaults.timeIn)
  const [timeOutLocal, setTimeOutLocal] = useState(defaults.timeOut)
  const [locationLabel, setLocationLabel] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [savedLocations, setSavedLocations] = useState<AttendanceLocationPick[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadingLocations(true)
    void (async () => {
      try {
        const punches = await listMyAttendance(userId)
        if (cancelled) return
        const locs = listEmployeeAttendanceLocations(punches)
        setSavedLocations(locs)
        if (locs[0]) applyLocation(locs[0])
      } catch {
        if (!cancelled) setSavedLocations([])
      } finally {
        if (!cancelled) setLoadingLocations(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  function applyLocation(loc: AttendanceLocationPick) {
    setLocationLabel(loc.label)
    setLatitude(loc.latitude != null ? String(loc.latitude) : '')
    setLongitude(loc.longitude != null ? String(loc.longitude) : '')
  }

  function onTimeInChange(value: string) {
    setTimeInLocal(value)
    setTimeOutLocal((prev) => sameDayTimeOut(value, prev))
  }

  async function copyLocationText() {
    const parts = [
      locationLabel.trim(),
      latitude.trim() && longitude.trim() ? `${latitude.trim()}, ${longitude.trim()}` : '',
    ].filter(Boolean)
    const text = parts.join(' · ') || branchName
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Location copied')
    } catch {
      toast.error('Could not copy location')
    }
  }

  async function handleSave(allowDuplicateDay = false) {
    if (!branchId) {
      toast.error('This employee has no clinic branch — cannot save attendance')
      return
    }
    if (!timeInLocal.trim() || !timeOutLocal.trim()) {
      toast.error('Enter both Time In and Time Out')
      return
    }
    if (!locationLabel.trim() && !(latitude.trim() && longitude.trim())) {
      toast.error('Add a location label or coordinates (or pick from past punches)')
      return
    }
    setSaving(true)
    try {
      const lat = latitude.trim() ? Number(latitude) : null
      const lng = longitude.trim() ? Number(longitude) : null
      if ((latitude.trim() || longitude.trim()) && (Number.isNaN(lat!) || Number.isNaN(lng!))) {
        throw new Error('Latitude / longitude must be valid numbers')
      }
      // Keep Time Out on the same Manila calendar day as Time In
      const syncedOut = sameDayTimeOut(timeInLocal, timeOutLocal)
      await createHrAttendanceSession({
        userId,
        branchId,
        timeInLocal,
        timeOutLocal: syncedOut,
        locationLabel: locationLabel.trim() || `HR add · ${branchName}`,
        latitude: lat,
        longitude: lng,
        allowDuplicateDay,
      })
      toast.success(
        `Time In + Time Out saved for ${staffName} — visible on ${branchName} for the clinic manager`,
      )
      onSaved?.()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not add attendance'
      if (
        !allowDuplicateDay &&
        (/already has a Time In/i.test(message) || /already has a complete attendance/i.test(message))
      ) {
        const ok = window.confirm(`${message}\n\nContinue anyway?`)
        if (ok) {
          setSaving(false)
          await handleSave(true)
          return
        }
      } else {
        toast.error(message)
      }
    } finally {
      setSaving(false)
    }
  }

  const locationPreview = useMemo(() => {
    if (locationLabel.trim()) return locationLabel.trim()
    if (latitude.trim() && longitude.trim()) return `${latitude.trim()}, ${longitude.trim()}`
    return 'Required — pick a past location or type one below'
  }, [locationLabel, latitude, longitude])

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
              HR · Add attendance
            </p>
            <h3 className="truncate font-display text-lg font-semibold text-charcoal">
              {staffName}
            </h3>
            <p className="truncate text-xs capitalize text-slate-ui">
              {formatRoleLabel(staffRole)}
              {staffEmail ? ` · ${staffEmail}` : ''}
            </p>
            <p className="mt-1 text-xs font-medium text-[#073D2C]">
              Branch: {branchName || '—'} (Clinic Manager can see this)
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
          <label className="block text-xs font-medium text-slate-ui">
            Time In (Manila)
            <input
              type="datetime-local"
              value={timeInLocal}
              onChange={(e) => onTimeInChange(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-emerald-700"
              required
            />
          </label>

          <label className="block text-xs font-medium text-slate-ui">
            Time Out (Manila)
            <input
              type="datetime-local"
              value={timeOutLocal}
              onChange={(e) => setTimeOutLocal(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-emerald-700"
              required
            />
            <span className="mt-1 block text-[11px] text-slate-ui">
              Both punches are saved together on this employee&apos;s clinic branch.
            </span>
          </label>

          <div className="rounded-[12px] border border-[#C5A059]/35 bg-[#FFFDF8] px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#6b5420]">Location (required)</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => void copyLocationText()}>
                <Copy className="h-3.5 w-3.5" />
                Copy location
              </Button>
            </div>
            <p className="mt-1 flex items-start gap-1.5 text-[11px] text-slate-ui">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[#C5A059]" />
              <span>{locationPreview}</span>
            </p>

            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-ui">
                Copy from this employee&apos;s past punches
              </p>
              {loadingLocations ? (
                <p className="text-xs text-slate-ui">Loading locations…</p>
              ) : savedLocations.length === 0 ? (
                <p className="text-xs text-slate-ui">
                  No prior locations on file — type an address or coordinates below.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {savedLocations.map((loc, i) => (
                    <button
                      key={`${loc.label}-${i}`}
                      type="button"
                      onClick={() => applyLocation(loc)}
                      className={cn(
                        'rounded-[10px] border border-border bg-white px-3 py-2 text-left text-xs transition hover:border-emerald-700/40 hover:bg-emerald-50/50',
                        locationLabel === loc.label && 'border-emerald-700/50 bg-emerald-50/70',
                      )}
                    >
                      <span className="font-medium text-[#073D2C]">{loc.label}</span>
                      {loc.latitude != null && loc.longitude != null ? (
                        <span className="mt-0.5 block text-[10px] text-slate-ui">
                          {loc.latitude}, {loc.longitude}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="mt-3 block text-xs font-medium text-slate-ui">
              Location label
              <input
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder="e.g. General A. Luna Street, San Mateo, Rizal"
                className="mt-1 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-emerald-700"
              />
            </label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-ui">
                Latitude
                <input
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="14.6799"
                  className="mt-1 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-emerald-700"
                />
              </label>
              <label className="block text-xs font-medium text-slate-ui">
                Longitude
                <input
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="121.1134"
                  className="mt-1 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-emerald-700"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3 sm:px-5">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 gap-1.5"
            disabled={saving || !timeInLocal || !timeOutLocal || !branchId}
            onClick={() => void handleSave(false)}
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Saving…' : 'Add Time In + Out'}
          </Button>
        </div>
      </div>
    </div>
  )
}
