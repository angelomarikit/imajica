import { useEffect, useState } from 'react'
import { Delete, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import logo from '@/assets/logo-imajica.jpg'
import { BRAND } from '@/constants/brand'
import {
  formatManilaClock,
  kioskAttendancePunch,
  kioskLookupEmployee,
  reverseGeocodeLabel,
  type KioskEmployeeLookup,
} from '@/services/attendanceService'
import type { AttendancePunchType } from '@/types'
import { cn } from '@/utils/cn'

type GeoState =
  | { status: 'loading' }
  | {
      status: 'ready'
      latitude: number
      longitude: number
      accuracyM: number | null
      locationLabel: string
    }
  | { status: 'error'; message: string }

/**
 * Shared clinic kiosk — no login.
 * Layout inspired by the Face Recognition terminal: clock + split card,
 * employee number instead of face, live location, Time In / Time Out.
 */
export function KioskTimeClockPage() {
  const [now, setNow] = useState(() => new Date())
  const [code, setCode] = useState('')
  const [employee, setEmployee] = useState<KioskEmployeeLookup | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [geo, setGeo] = useState<GeoState>({ status: 'loading' })
  const [saving, setSaving] = useState<AttendancePunchType | null>(null)
  const [lastSuccess, setLastSuccess] = useState<string | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadLocation() {
      setGeo({ status: 'loading' })
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported on this device'))
            return
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 30_000,
          })
        })
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        const accuracyM =
          typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null
        let locationLabel = `Near ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        try {
          locationLabel = await reverseGeocodeLabel(latitude, longitude)
        } catch {
          /* keep coords fallback */
        }
        if (!cancelled) {
          setGeo({ status: 'ready', latitude, longitude, accuracyM, locationLabel })
        }
      } catch (err) {
        if (!cancelled) {
          setGeo({
            status: 'error',
            message: err instanceof Error ? err.message : 'Could not fetch location',
          })
        }
      }
    }
    void loadLocation()
    const refreshId = window.setInterval(() => void loadLocation(), 5 * 60_000)
    return () => {
      cancelled = true
      window.clearInterval(refreshId)
    }
  }, [])

  useEffect(() => {
    setEmployee(null)
    setLookupError(null)
    setLastSuccess(null)
    const digits = code.replace(/\D/g, '')
    if (digits.length !== 3) return
    const handle = window.setTimeout(() => {
      void (async () => {
        setLookingUp(true)
        try {
          const found = await kioskLookupEmployee(digits)
          setEmployee(found)
          setLookupError(null)
        } catch (err) {
          setEmployee(null)
          setLookupError(err instanceof Error ? err.message : 'Not found')
        } finally {
          setLookingUp(false)
        }
      })()
    }, 200)
    return () => window.clearTimeout(handle)
  }, [code])

  function pressDigit(d: string) {
    setCode((prev) => {
      const next = (prev + d).replace(/\D/g, '').slice(0, 3)
      return next
    })
  }

  function backspace() {
    setCode((prev) => prev.slice(0, -1))
  }

  function clearCode() {
    setCode('')
    setEmployee(null)
    setLookupError(null)
    setLastSuccess(null)
  }

  async function punch(punchType: AttendancePunchType) {
    if (!employee) {
      toast.error('Enter a valid employee number first')
      return
    }
    if (geo.status !== 'ready') {
      toast.error('Wait for location before punching')
      return
    }
    if (punchType === 'time_in' && !employee.canTimeIn) {
      toast.error('Already timed in. Please Time Out first.')
      return
    }
    if (punchType === 'time_out' && !employee.canTimeOut) {
      toast.error('Time In is required before Time Out.')
      return
    }

    setSaving(punchType)
    try {
      const result = await kioskAttendancePunch({
        employeeCode: employee.employeeCode,
        punchType,
        latitude: geo.latitude,
        longitude: geo.longitude,
        accuracyM: geo.accuracyM,
        locationLabel: geo.locationLabel,
      })
      const label = punchType === 'time_in' ? 'Time In' : 'Time Out'
      toast.success(`${result.fullName} — ${label} recorded`)
      setLastSuccess(
        `${result.fullName} · ${label} · #${result.employeeCode} · ${result.branchName}`,
      )
      const refreshed = await kioskLookupEmployee(employee.employeeCode)
      setEmployee(refreshed)
      setCode('')
      window.setTimeout(() => {
        setEmployee(null)
        setLastSuccess(null)
      }, 4500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Punch failed')
    } finally {
      setSaving(null)
    }
  }

  const displayCode = code || '— — —'
  const locationText =
    geo.status === 'loading'
      ? 'Fetching Location…'
      : geo.status === 'error'
        ? geo.message
        : geo.locationLabel

  return (
    <div className="min-h-dvh bg-[linear-gradient(160deg,#F7F4EC_0%,#EFE8DA_45%,#E4DDD0_100%)] px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-4 text-center text-base font-semibold text-[#1a1a1a] sm:mb-6 sm:text-xl md:text-2xl">
          {formatManilaClock(now)}
        </p>

        <div className="overflow-hidden rounded-[18px] border border-[#073D2C]/10 bg-white shadow-[0_24px_60px_rgba(7,61,44,0.14)] md:grid md:grid-cols-2">
          {/* Left — controls */}
          <div className="flex flex-col px-5 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-[12px] border border-[#E8E2D6] bg-[#FAF8F2] sm:h-20 sm:w-20">
              <img src={logo} alt={BRAND.name} className="h-full w-full object-cover" />
            </div>

            <div className="rounded-[12px] bg-[#F3F0E8] px-4 py-3 text-center">
              <p className="text-sm font-semibold tracking-wide text-[#073D2C] sm:text-base">
                Employee Number
              </p>
              <p className="mt-2 font-mono text-3xl font-bold tracking-[0.2em] text-[#0a0a0a] sm:text-4xl">
                {displayCode || '— — —'}
              </p>
              <p className="mt-1 min-h-[1.25rem] text-xs text-slate-ui">
                {lookingUp
                  ? 'Looking up…'
                  : employee
                    ? `${employee.fullName} · ${employee.branchName}`
                    : lookupError && code.length === 3
                      ? lookupError
                      : 'Enter your 3-digit number'}
              </p>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-[#E8E2D6] bg-[#FAF8F2] px-3 py-2.5 text-sm text-[#073D2C]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A059]" />
              <span className="min-w-0 break-words leading-snug">{locationText}</span>
            </div>

            {/* Numpad */}
            <div className="mx-auto mt-5 grid w-full max-w-xs grid-cols-3 gap-2 sm:gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => pressDigit(d)}
                  className="h-12 rounded-full border border-[#073D2C]/15 bg-white text-lg font-semibold text-[#073D2C] shadow-sm transition hover:border-[#073D2C]/35 hover:bg-[#F7F4EC] active:scale-[0.98] sm:h-14"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={clearCode}
                className="h-12 rounded-full border border-[#073D2C]/15 bg-white text-xs font-semibold uppercase tracking-wide text-slate-ui transition hover:bg-[#F7F4EC] sm:h-14"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => pressDigit('0')}
                className="h-12 rounded-full border border-[#073D2C]/15 bg-white text-lg font-semibold text-[#073D2C] shadow-sm transition hover:bg-[#F7F4EC] active:scale-[0.98] sm:h-14"
              >
                0
              </button>
              <button
                type="button"
                onClick={backspace}
                aria-label="Backspace"
                className="grid h-12 place-items-center rounded-full border border-[#073D2C]/15 bg-white text-[#073D2C] transition hover:bg-[#F7F4EC] sm:h-14"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!employee || geo.status !== 'ready' || saving !== null || !employee.canTimeIn}
                onClick={() => void punch('time_in')}
                className={cn(
                  'h-12 rounded-full text-sm font-bold uppercase tracking-wide text-white transition sm:h-14',
                  'bg-[#073D2C] hover:bg-[#0a4f3a] disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                {saving === 'time_in' ? 'Saving…' : 'Time In'}
              </button>
              <button
                type="button"
                disabled={!employee || geo.status !== 'ready' || saving !== null || !employee.canTimeOut}
                onClick={() => void punch('time_out')}
                className={cn(
                  'h-12 rounded-full text-sm font-bold uppercase tracking-wide text-white transition sm:h-14',
                  'bg-[#0d5c45] hover:bg-[#0a4f3a] disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                {saving === 'time_out' ? 'Saving…' : 'Time Out'}
              </button>
            </div>

            {lastSuccess ? (
              <p className="mt-3 rounded-[10px] bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-900">
                {lastSuccess}
              </p>
            ) : null}

            <p className="mt-5 text-center text-[10px] leading-relaxed text-slate-ui sm:text-[11px]">
              By using the Imajica timekeeping kiosk, you agree that your employee number and device
              location are recorded for attendance. Photos are not required on this screen.
            </p>
          </div>

          {/* Right — brand panel */}
          <div className="relative hidden min-h-[280px] overflow-hidden md:block">
            <div className="absolute inset-0 bg-[linear-gradient(145deg,#0A2E26_0%,#073D2C_40%,#0d5c45_70%,#C5A059_160%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(197,160,89,0.28),transparent_55%)]" />
            <div className="relative flex h-full flex-col items-center justify-center px-8 py-10 text-center text-white">
              <p className="font-brand text-3xl tracking-[0.12em] text-[#E8D9B8] lg:text-4xl">
                IMAJICA
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.28em] text-white/70">
                Medical Aesthetics
              </p>
              <div className="my-6 h-px w-16 bg-[#C5A059]/70" />
              <p className="max-w-xs text-sm leading-relaxed text-white/85">
                Enter your employee number, confirm your location, then Time In or Time Out.
              </p>
              {employee ? (
                <p className="mt-6 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-[#E8D9B8]">
                  {employee.branchName}
                </p>
              ) : (
                <p className="mt-6 text-xs uppercase tracking-[0.2em] text-white/50">Staff kiosk</p>
              )}
            </div>
          </div>
        </div>

        {/* Mobile brand strip */}
        <div className="mt-4 rounded-[14px] bg-[linear-gradient(135deg,#073D2C,#0d5c45)] px-4 py-3 text-center md:hidden">
          <p className="font-brand text-lg tracking-wide text-[#E8D9B8]">IMAJICA</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/65">Staff timeclock</p>
        </div>
      </div>
    </div>
  )
}
