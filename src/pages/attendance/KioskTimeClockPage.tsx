import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Delete, MapPin, X } from 'lucide-react'
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
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready'
      latitude: number
      longitude: number
      accuracyM: number | null
      locationLabel: string
    }
  | { status: 'error'; message: string }

type PendingSelfie = {
  punchType: AttendancePunchType
  photoBlob: Blob
  photoPreview: string
  latitude: number
  longitude: number
  accuracyM: number | null
  locationLabel: string
}

/** Prefer front/user camera on phones; fall back until something works. */
async function openSelfieCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not supported in this browser')
  }
  if (!window.isSecureContext && location.hostname !== 'localhost') {
    throw new Error('Camera needs HTTPS (or localhost). Open this page on a secure link.')
  }

  const attempts: MediaStreamConstraints[] = [
    {
      audio: false,
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    { audio: false, video: { facingMode: 'user' } },
    { audio: false, video: { facingMode: { exact: 'user' } } },
    { audio: false, video: true },
  ]

  let lastError: unknown
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Camera permission is required to take a selfie')
}

/**
 * Shared clinic kiosk — no login.
 * Same camera flow as staff Time In / Out: live phone front-camera preview,
 * Take selfie (manual), then Confirm with location.
 */
export function KioskTimeClockPage() {
  const [now, setNow] = useState(() => new Date())
  const [code, setCode] = useState('')
  const [employee, setEmployee] = useState<KioskEmployeeLookup | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [geo, setGeo] = useState<GeoState>({ status: 'loading' })
  const [saving, setSaving] = useState(false)
  const [lastSuccess, setLastSuccess] = useState<string | null>(null)

  const [punchType, setPunchType] = useState<AttendancePunchType | null>(null)
  const [livePreview, setLivePreview] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [pending, setPending] = useState<PendingSelfie | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const punchTypeRef = useRef<AttendancePunchType | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function loadLocation() {
    setGeo({ status: 'loading' })
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported on this device'))
          return
        }
        navigator.geolocation.getCurrentPosition(
          resolve,
          () => reject(new Error('Location permission is required to Time In / Out')),
          {
            enableHighAccuracy: true,
            timeout: 25000,
            maximumAge: 0,
          },
        )
      })
      const latitude = position.coords.latitude
      const longitude = position.coords.longitude
      const accuracyM = position.coords.accuracy ?? null
      const locationLabel = await reverseGeocodeLabel(latitude, longitude)
      setGeo({ status: 'ready', latitude, longitude, accuracyM, locationLabel })
    } catch (err) {
      setGeo({
        status: 'error',
        message: err instanceof Error ? err.message : 'Could not get location',
      })
    }
  }

  useEffect(() => {
    void loadLocation()
    const refreshId = window.setInterval(() => void loadLocation(), 5 * 60_000)
    return () => window.clearInterval(refreshId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraReady(false)
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const attachStreamToVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node
    const stream = streamRef.current
    if (!node || !stream) return
    if (node.srcObject !== stream) {
      node.srcObject = stream
      void node
        .play()
        .then(() => setCameraReady(true))
        .catch(() => setCameraReady(true))
    }
  }, [])

  // When location finishes after selfie was taken, merge into pending
  useEffect(() => {
    if (!pending || pending.locationLabel) return
    if (geo.status !== 'ready') return
    setPending((prev) =>
      prev
        ? {
            ...prev,
            latitude: geo.latitude,
            longitude: geo.longitude,
            accuracyM: geo.accuracyM,
            locationLabel: geo.locationLabel,
          }
        : prev,
    )
  }, [geo, pending])

  async function beginSession(nextPunch: AttendancePunchType) {
    if (!employee) {
      toast.error('Enter a valid employee number first')
      return
    }
    if (nextPunch === 'time_in' && !employee.canTimeIn) {
      toast.error(
        employee.canTimeOut
          ? 'Already timed in. Please Time Out first.'
          : 'You already completed attendance for today. Try again tomorrow.',
      )
      return
    }
    if (nextPunch === 'time_out' && !employee.canTimeOut) {
      toast.error(
        employee.canTimeIn
          ? 'Time In is required before Time Out.'
          : 'You already timed out for today.',
      )
      return
    }

    if (pending?.photoPreview) URL.revokeObjectURL(pending.photoPreview)
    setPending(null)
    stopCamera()
    punchTypeRef.current = nextPunch
    setPunchType(nextPunch)
    setLivePreview(true)
    setCameraReady(false)
    void loadLocation()

    // Let the <video> mount before requesting the stream (same as staff timeclock)
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve())
    })

    try {
      const stream = await openSelfieCamera()
      if (punchTypeRef.current !== nextPunch) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
        setCameraReady(true)
      }
      // If video not mounted yet, callback ref will attach
    } catch (err) {
      stopCamera()
      setLivePreview(false)
      setPunchType(null)
      punchTypeRef.current = null
      toast.error(
        err instanceof Error
          ? err.message
          : 'Camera permission is required to take a selfie',
      )
    }
  }

  /** ONLY from Take selfie — never auto-capture */
  function handleTakeSelfieClick() {
    const activePunch = punchTypeRef.current
    if (!activePunch || !livePreview) return
    const video = videoRef.current
    if (!video || !streamRef.current) {
      toast.error('Camera is not ready yet — wait for the live preview')
      return
    }
    if (video.videoWidth < 2) {
      toast.error('Camera is still warming up — try again in a moment')
      return
    }

    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not capture selfie')
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            toast.error('Failed to create selfie image')
            return
          }
          const photoPreview = URL.createObjectURL(blob)
          stopCamera()
          setLivePreview(false)

          if (geo.status === 'ready') {
            setPending({
              punchType: activePunch,
              photoBlob: blob,
              photoPreview,
              latitude: geo.latitude,
              longitude: geo.longitude,
              accuracyM: geo.accuracyM,
              locationLabel: geo.locationLabel,
            })
            return
          }

          setPending({
            punchType: activePunch,
            photoBlob: blob,
            photoPreview,
            latitude: 0,
            longitude: 0,
            accuracyM: null,
            locationLabel: '',
          })
        },
        'image/jpeg',
        0.9,
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not take selfie')
    }
  }

  async function confirmPunch() {
    if (!pending || !employee) return
    if (!pending.locationLabel || geo.status === 'loading') {
      toast.error('Wait for your place name to finish loading')
      return
    }
    if (geo.status === 'error') {
      toast.error(geo.message)
      return
    }

    setSaving(true)
    try {
      let label = pending.locationLabel
      let lat = pending.latitude
      let lng = pending.longitude
      let accuracy = pending.accuracyM
      if (geo.status === 'ready') {
        label = geo.locationLabel
        lat = geo.latitude
        lng = geo.longitude
        accuracy = geo.accuracyM
      }
      if (!label) {
        label = await reverseGeocodeLabel(lat, lng)
      }

      const result = await kioskAttendancePunch({
        employeeCode: employee.employeeCode,
        punchType: pending.punchType,
        photoBlob: pending.photoBlob,
        latitude: lat,
        longitude: lng,
        accuracyM: accuracy,
        locationLabel: label,
      })

      const punchLabel = pending.punchType === 'time_in' ? 'Time In' : 'Time Out'
      toast.success(`${result.fullName} — ${punchLabel} recorded`)
      setLastSuccess(
        `${result.fullName} · ${punchLabel} · #${result.employeeCode} · ${result.branchName}`,
      )
      URL.revokeObjectURL(pending.photoPreview)
      setPending(null)
      setPunchType(null)
      punchTypeRef.current = null
      setCode('')
      setEmployee(null)
      window.setTimeout(() => setLastSuccess(null), 4500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Punch failed')
    } finally {
      setSaving(false)
    }
  }

  function cancelAll() {
    if (pending?.photoPreview) URL.revokeObjectURL(pending.photoPreview)
    stopCamera()
    setPending(null)
    setLivePreview(false)
    setPunchType(null)
    punchTypeRef.current = null
  }

  function retake() {
    if (!pending) return
    const next = pending.punchType
    URL.revokeObjectURL(pending.photoPreview)
    setPending(null)
    void beginSession(next)
  }

  function pressDigit(d: string) {
    if (livePreview || pending) return
    setCode((prev) => (prev + d).replace(/\D/g, '').slice(0, 3))
  }

  function backspace() {
    if (livePreview || pending) return
    setCode((prev) => prev.slice(0, -1))
  }

  function clearCode() {
    if (livePreview || pending) return
    setCode('')
    setEmployee(null)
    setLookupError(null)
    setLastSuccess(null)
  }

  const displayCode = code || '— — —'
  const locationReady =
    geo.status === 'ready' && Boolean(pending?.locationLabel || geo.locationLabel)
  const inCapture = livePreview || Boolean(pending)

  return (
    <div className="min-h-dvh bg-[linear-gradient(160deg,#F7F4EC_0%,#EFE8DA_45%,#E4DDD0_100%)] px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-4 text-center text-base font-semibold text-[#1a1a1a] sm:mb-6 sm:text-xl md:text-2xl">
          {formatManilaClock(now)}
        </p>

        <div className="overflow-hidden rounded-[18px] border border-[#073D2C]/10 bg-white shadow-[0_24px_60px_rgba(7,61,44,0.14)] md:grid md:grid-cols-2">
          <div className="flex flex-col px-5 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[14px] border border-[#E8E2D6] bg-[#0A2E26] shadow-sm sm:h-24 sm:w-24">
              <img
                src={logo}
                alt={BRAND.name}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="rounded-[12px] bg-[#F3F0E8] px-4 py-3 text-center">
              <p className="text-sm font-semibold tracking-wide text-[#073D2C] sm:text-base">
                Employee Number
              </p>
              <p className="mt-2 font-mono text-3xl font-bold tracking-[0.2em] text-[#0a0a0a] sm:text-4xl">
                {displayCode}
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

            <LocationPanel geo={geo} onRetry={() => void loadLocation()} />

            {!inCapture ? (
              <>
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
                    disabled={!employee || !employee.canTimeIn}
                    onClick={() => void beginSession('time_in')}
                    className={cn(
                      'h-12 rounded-full text-sm font-bold uppercase tracking-wide text-white transition sm:h-14',
                      'bg-[#073D2C] hover:bg-[#0a4f3a] disabled:cursor-not-allowed disabled:opacity-40',
                    )}
                  >
                    Time In
                  </button>
                  <button
                    type="button"
                    disabled={!employee || !employee.canTimeOut}
                    onClick={() => void beginSession('time_out')}
                    className={cn(
                      'h-12 rounded-full text-sm font-bold uppercase tracking-wide text-white transition sm:h-14',
                      'bg-[#0d5c45] hover:bg-[#0a4f3a] disabled:cursor-not-allowed disabled:opacity-40',
                    )}
                  >
                    Time Out
                  </button>
                </div>
              </>
            ) : null}

            {livePreview ? (
              <div className="mt-5 space-y-3">
                <p className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
                  Live preview only — nothing is saved until you press{' '}
                  <span className="font-bold">Take selfie</span>, then Confirm.
                </p>
                <p className="text-sm text-[#073D2C]">
                  {punchType === 'time_in' ? 'Time In' : 'Time Out'}: allow camera access if asked,
                  center your face, then tap Take selfie.
                </p>
                <div className="relative overflow-hidden rounded-[14px] border border-border bg-black">
                  <video
                    ref={attachStreamToVideo}
                    playsInline
                    muted
                    autoPlay
                    className="mx-auto max-h-[420px] min-h-[240px] w-full scale-x-[-1] object-cover"
                  />
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs text-white">
                    <Camera className="h-3.5 w-3.5" />
                    {cameraReady ? 'Waiting for you to take selfie' : 'Detecting camera…'}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={!cameraReady}
                    onClick={handleTakeSelfieClick}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#073D2C] text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
                  >
                    <Camera className="h-5 w-5" />
                    Take selfie
                  </button>
                  <button
                    type="button"
                    onClick={cancelAll}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#073D2C]/20 bg-white px-5 text-sm font-semibold text-[#073D2C]"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {pending ? (
              <div className="mt-5 space-y-4">
                <p className="text-sm font-medium text-[#073D2C]">
                  Confirm your {pending.punchType === 'time_in' ? 'Time In' : 'Time Out'}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <img
                    src={pending.photoPreview}
                    alt="Selfie preview"
                    className="h-56 w-full rounded-[14px] border border-border object-cover"
                  />
                  <div className="space-y-3 rounded-[14px] border border-border bg-[#FAF8F2] p-4 text-sm">
                    <LocationPanel geo={geo} onRetry={() => void loadLocation()} />
                    {pending.locationLabel ? (
                      <p className="font-medium text-[#073D2C]">{pending.locationLabel}</p>
                    ) : null}
                    <p className="text-xs text-slate-ui">
                      Time is recorded when you press Confirm ({formatManilaClock(now)}).
                    </p>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-3">
                  <button
                    type="button"
                    disabled={saving || !locationReady}
                    onClick={() => void confirmPunch()}
                    className="inline-flex h-16 w-full items-center justify-center rounded-full bg-[#073D2C] px-6 text-base font-bold uppercase tracking-wide text-white shadow-md transition hover:bg-[#0a4f3a] disabled:cursor-not-allowed disabled:opacity-40 sm:h-[4.25rem] sm:text-lg"
                  >
                    {saving ? 'Saving…' : locationReady ? 'Confirm' : 'Waiting for location…'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={retake}
                    className="inline-flex h-14 w-full items-center justify-center rounded-full border border-[#073D2C]/25 bg-white px-5 text-sm font-semibold text-[#073D2C] sm:h-14 sm:text-base"
                  >
                    Retake selfie
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={cancelAll}
                    className="inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-slate-ui"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {lastSuccess ? (
              <p className="mt-3 rounded-[10px] bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-900">
                {lastSuccess}
              </p>
            ) : null}

            <p className="mt-5 text-center text-[10px] leading-relaxed text-slate-ui sm:text-[11px]">
              By using the Imajica timekeeping kiosk, you agree that your employee number, selfie,
              and device location are recorded for attendance. Use your phone’s front camera for
              the selfie.
            </p>
          </div>

          <div className="relative hidden min-h-[420px] overflow-hidden md:block">
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
                Enter your number, tap Time In or Time Out, allow the camera, take a selfie, then
                Confirm.
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

        <div className="mt-4 rounded-[14px] bg-[linear-gradient(135deg,#073D2C,#0d5c45)] px-4 py-3 text-center md:hidden">
          <p className="font-brand text-lg tracking-wide text-[#E8D9B8]">IMAJICA</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/65">Staff timeclock</p>
        </div>
      </div>
    </div>
  )
}

function LocationPanel({
  geo,
  onRetry,
}: {
  geo: GeoState
  onRetry: () => void
}) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-[#E8E2D6] bg-[#FAF8F2] px-3 py-2.5 text-sm text-[#073D2C]">
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A059]" />
      <div className="min-w-0 flex-1">
        {geo.status === 'loading' || geo.status === 'idle' ? (
          <p className="leading-snug">Fetching Location…</p>
        ) : geo.status === 'error' ? (
          <div className="space-y-1">
            <p className="leading-snug text-red-700">{geo.message}</p>
            <button
              type="button"
              onClick={onRetry}
              className="text-xs font-semibold text-[#073D2C] underline"
            >
              Retry location
            </button>
          </div>
        ) : (
          <p className="min-w-0 break-words leading-snug">{geo.locationLabel}</p>
        )}
      </div>
    </div>
  )
}
