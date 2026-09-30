import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, MapPin, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import {
  formatManilaClock,
  formatManilaTime,
  getTodayAttendanceStatus,
  recordAttendancePunch,
  reverseGeocodeLabel,
  subscribeAttendance,
  type TodayAttendanceStatus,
} from '@/services/attendanceService'
import type { AttendancePunchType } from '@/types'
import { cn } from '@/utils/cn'

type LiveSession = {
  punchType: AttendancePunchType
}

type CaptureState = {
  punchType: AttendancePunchType
  photoBlob: Blob
  photoPreview: string
  latitude: number
  longitude: number
  accuracyM: number | null
  locationLabel: string
}

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

export function TimeClockPage() {
  const { user } = useAuth()
  const { selectedBranch } = useBranch()
  const [now, setNow] = useState(() => new Date())
  const [status, setStatus] = useState<TodayAttendanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<LiveSession | null>(null)
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' })
  const [pending, setPending] = useState<CaptureState | null>(null)
  const [saving, setSaving] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const refresh = useCallback(async () => {
    if (!user) return
    try {
      setStatus(await getTodayAttendanceStatus(user.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
    return subscribeAttendance(() => {
      void refresh()
    })
  }, [refresh])

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraReady(false)
    if (videoRef.current) videoRef.current.srcObject = null
  }

  async function loadLocation() {
    setGeo({ status: 'loading' })
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported on this device'))
          return
        }
        navigator.geolocation.getCurrentPosition(resolve, () => {
          reject(new Error('Location permission is required to Time In / Out'))
        }, {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        })
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

  // Attach stream after the live video element mounts
  useEffect(() => {
    if (!session || pending) return
    let cancelled = false

    void (async () => {
      setCameraReady(false)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play()
          if (!cancelled) setCameraReady(true)
        }
      } catch (err) {
        if (cancelled) return
        await stopCamera()
        setSession(null)
        setGeo({ status: 'idle' })
        toast.error(
          err instanceof Error
            ? err.message
            : 'Camera permission is required to take a selfie',
        )
      }
    })()

    return () => {
      cancelled = true
    }
  }, [session, pending])

  function beginSession(punchType: AttendancePunchType) {
    if (!user?.branchId && !selectedBranch?.id) {
      toast.error('Your account has no branch assigned')
      return
    }
    if (pending?.photoPreview) URL.revokeObjectURL(pending.photoPreview)
    setPending(null)
    setSession({ punchType })
    void loadLocation()
  }

  async function takeSelfie() {
    if (!session) return
    if (geo.status !== 'ready') {
      toast.error(
        geo.status === 'loading'
          ? 'Wait for your location to finish loading'
          : geo.status === 'error'
            ? geo.message
            : 'Location is required before capturing',
      )
      return
    }
    const video = videoRef.current
    if (!video || !cameraReady) {
      toast.error('Camera is not ready yet')
      return
    }
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not capture selfie')
      // Mirror to match preview (scale-x-[-1])
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create selfie image'))),
          'image/jpeg',
          0.9,
        )
      })
      const photoPreview = URL.createObjectURL(blob)
      await stopCamera()
      setPending({
        punchType: session.punchType,
        photoBlob: blob,
        photoPreview,
        latitude: geo.latitude,
        longitude: geo.longitude,
        accuracyM: geo.accuracyM,
        locationLabel: geo.locationLabel,
      })
      setSession(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not take selfie')
    }
  }

  async function confirmPunch() {
    if (!pending || !user) return
    const branchId = user.branchId || selectedBranch?.id
    if (!branchId) {
      toast.error('Branch is required')
      return
    }
    setSaving(true)
    try {
      await recordAttendancePunch({
        userId: user.id,
        branchId,
        punchType: pending.punchType,
        photoBlob: pending.photoBlob,
        latitude: pending.latitude,
        longitude: pending.longitude,
        accuracyM: pending.accuracyM,
        locationLabel: pending.locationLabel,
      })
      toast.success(
        pending.punchType === 'time_in' ? 'Timed in successfully' : 'Timed out successfully',
      )
      URL.revokeObjectURL(pending.photoPreview)
      setPending(null)
      setGeo({ status: 'idle' })
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save punch')
    } finally {
      setSaving(false)
    }
  }

  function cancelAll() {
    if (pending?.photoPreview) URL.revokeObjectURL(pending.photoPreview)
    void stopCamera()
    setPending(null)
    setSession(null)
    setGeo({ status: 'idle' })
  }

  function retake() {
    if (!pending) return
    const punchType = pending.punchType
    URL.revokeObjectURL(pending.photoPreview)
    setPending(null)
    beginSession(punchType)
  }

  const branchName = selectedBranch?.name || user?.branchName || 'Your branch'
  const liveMode = Boolean(session) && !pending

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Time In / Time Out"
        description={`Clock in and out for ${branchName}. Take your selfie when ready — location is saved as a place name.`}
      />

      <Card className="overflow-hidden p-0">
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-[#0a3d2e] px-6 py-8 text-white">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-white/10 p-3">
              <Clock className="h-6 w-6 text-gold" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold/90">
                {branchName}
              </p>
              <p className="mt-2 font-brand text-2xl tracking-wide sm:text-3xl">
                {formatManilaClock(now)}
              </p>
              <p className="mt-1 text-sm text-white/70">Asia / Manila time</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {loading ? (
            <p className="text-sm text-slate-ui">Loading today’s status…</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <StatusPill
                label="Today"
                value={
                  status?.openTimeIn
                    ? 'Timed in'
                    : status?.lastPunch?.punchType === 'time_out'
                      ? 'Timed out'
                      : 'Not punched'
                }
                tone={
                  status?.openTimeIn ? 'active' : status?.lastPunch ? 'done' : 'idle'
                }
              />
              {status?.openTimeIn ? (
                <StatusPill
                  label="Time in since"
                  value={formatManilaTime(status.openTimeIn.punchedAt)}
                  tone="active"
                />
              ) : null}
            </div>
          )}

          {!liveMode && !pending ? (
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                size="lg"
                disabled={!status?.canTimeIn || loading}
                onClick={() => beginSession('time_in')}
                className="min-w-[140px]"
              >
                Time In
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                disabled={!status?.canTimeOut || loading}
                onClick={() => beginSession('time_out')}
                className="min-w-[140px]"
              >
                Time Out
              </Button>
            </div>
          ) : null}

          {liveMode ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#073D2C]">
                Position yourself for {session?.punchType === 'time_in' ? 'Time In' : 'Time Out'}, then
                press <span className="font-semibold">Take selfie</span> when ready.
              </p>
              <div className="relative overflow-hidden rounded-[14px] border border-border bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="mx-auto max-h-[360px] w-full scale-x-[-1] object-cover"
                />
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs text-white">
                  <Camera className="h-3.5 w-3.5" />
                  {cameraReady ? 'Live preview — you control the capture' : 'Starting camera…'}
                </div>
              </div>

              <LocationPanel geo={geo} onRetry={() => void loadLocation()} />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="lg"
                  disabled={!cameraReady || geo.status !== 'ready'}
                  onClick={() => void takeSelfie()}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Take selfie
                </Button>
                <Button type="button" variant="secondary" onClick={cancelAll}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {pending ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[#073D2C]">
                Confirm your {pending.punchType === 'time_in' ? 'Time In' : 'Time Out'} selfie and
                location
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <img
                  src={pending.photoPreview}
                  alt="Selfie preview"
                  className="h-56 w-full rounded-[14px] border border-border object-cover"
                />
                <div className="space-y-3 rounded-[14px] border border-border bg-ivory-100/60 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />
                    <div>
                      <p className="font-semibold text-[#073D2C]">Location</p>
                      <p className="mt-1 text-slate-ui">{pending.locationLabel}</p>
                      {pending.accuracyM != null ? (
                        <p className="mt-0.5 text-xs text-slate-ui">
                          Accuracy ±{Math.round(pending.accuracyM)} m
                        </p>
                      ) : null}
                      <a
                        className="mt-2 inline-block text-xs font-semibold text-emerald-800 underline"
                        href={`https://www.google.com/maps?q=${pending.latitude},${pending.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in Maps
                      </a>
                    </div>
                  </div>
                  <p className="text-xs text-slate-ui">
                    Time will be recorded when you press Confirm ({formatManilaClock(now)}).
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={saving} onClick={() => void confirmPunch()}>
                  {saving ? 'Saving…' : 'Confirm'}
                </Button>
                <Button type="button" variant="secondary" disabled={saving} onClick={retake}>
                  Retake selfie
                </Button>
                <Button type="button" variant="ghost" disabled={saving} onClick={cancelAll}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {status && status.punches.length > 0 ? (
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-ui">
                Today’s punches
              </p>
              <ul className="space-y-2">
                {status.punches.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-0.5 rounded-[10px] border border-border/70 bg-white px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-medium text-[#073D2C]">
                      {p.punchType === 'time_in' ? 'Time In' : 'Time Out'}
                    </span>
                    <span className="text-slate-ui">{formatManilaTime(p.punchedAt)}</span>
                    {p.locationLabel ? (
                      <span className="text-xs text-slate-ui sm:basis-full">{p.locationLabel}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Card>
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
    <div className="rounded-[12px] border border-border bg-ivory-100/50 px-3 py-2.5 text-sm">
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />
        <div className="min-w-0 flex-1">
          {geo.status === 'loading' || geo.status === 'idle' ? (
            <p className="text-slate-ui">Finding your location…</p>
          ) : null}
          {geo.status === 'ready' ? (
            <>
              <p className="font-medium text-[#073D2C]">{geo.locationLabel}</p>
              {geo.accuracyM != null ? (
                <p className="mt-0.5 text-xs text-slate-ui">
                  Accuracy ±{Math.round(geo.accuracyM)} m
                </p>
              ) : null}
            </>
          ) : null}
          {geo.status === 'error' ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-red-700">{geo.message}</p>
              <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
                Retry location
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'idle' | 'active' | 'done'
}) {
  return (
    <div
      className={cn(
        'rounded-[12px] border px-3 py-2',
        tone === 'active' && 'border-emerald-200 bg-emerald-50',
        tone === 'done' && 'border-slate-200 bg-slate-50',
        tone === 'idle' && 'border-amber-200 bg-amber-50',
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-ui">{label}</p>
      <p className="text-sm font-semibold text-[#073D2C]">{value}</p>
    </div>
  )
}
