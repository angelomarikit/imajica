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

/**
 * Live camera session — photo is ONLY taken when the user presses Take selfie.
 * Location resolves in parallel and is required only to Confirm.
 */
export function TimeClockPage() {
  const { user } = useAuth()
  const { selectedBranch } = useBranch()
  const [now, setNow] = useState(() => new Date())
  const [status, setStatus] = useState<TodayAttendanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [punchType, setPunchType] = useState<AttendancePunchType | null>(null)
  const [livePreview, setLivePreview] = useState(false)
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' })
  const [pending, setPending] = useState<CaptureState | null>(null)
  const [saving, setSaving] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const punchTypeRef = useRef<AttendancePunchType | null>(null)

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
      void node.play().then(() => setCameraReady(true)).catch(() => {
        setCameraReady(true)
      })
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
        navigator.geolocation.getCurrentPosition(resolve, () => {
          reject(new Error('Location permission is required to Time In / Out'))
        }, {
          enableHighAccuracy: true,
          timeout: 25000,
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

  async function beginSession(nextPunch: AttendancePunchType) {
    if (!user?.branchId && !selectedBranch?.id) {
      toast.error('Your account has no branch assigned')
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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      // User cancelled while permission dialog was open
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
      setGeo({ status: 'idle' })
      toast.error(
        err instanceof Error
          ? err.message
          : 'Camera permission is required to take a selfie',
      )
    }
  }

  /** ONLY called from the Take selfie button — never automatically */
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

          // Location still loading — hold photo and wait; Confirm stays disabled until geo ready
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

  async function confirmPunch() {
    if (!pending || !user) return
    if (!pending.locationLabel || geo.status === 'loading') {
      toast.error('Wait for your place name to finish loading')
      return
    }
    if (geo.status === 'error') {
      toast.error(geo.message)
      return
    }
    const branchId = user.branchId || selectedBranch?.id
    if (!branchId) {
      toast.error('Branch is required')
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
      await recordAttendancePunch({
        userId: user.id,
        branchId,
        punchType: pending.punchType,
        photoBlob: pending.photoBlob,
        latitude: lat,
        longitude: lng,
        accuracyM: accuracy,
        locationLabel: label,
      })
      toast.success(
        pending.punchType === 'time_in' ? 'Timed in successfully' : 'Timed out successfully',
      )
      URL.revokeObjectURL(pending.photoPreview)
      setPending(null)
      setPunchType(null)
      punchTypeRef.current = null
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
    stopCamera()
    setPending(null)
    setLivePreview(false)
    setPunchType(null)
    punchTypeRef.current = null
    setGeo({ status: 'idle' })
  }

  function retake() {
    if (!pending) return
    const next = pending.punchType
    URL.revokeObjectURL(pending.photoPreview)
    setPending(null)
    void beginSession(next)
  }

  const branchName = selectedBranch?.name || user?.branchName || 'Your branch'
  const locationReady = geo.status === 'ready' && Boolean(pending?.locationLabel || geo.locationLabel)

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Time In / Time Out"
        description={`Clock in and out for ${branchName}. Press Take selfie when you are ready — it does not capture automatically.`}
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

          {!livePreview && !pending ? (
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                size="lg"
                disabled={!status?.canTimeIn || loading}
                onClick={() => void beginSession('time_in')}
                className="min-w-[140px]"
              >
                Time In
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                disabled={!status?.canTimeOut || loading}
                onClick={() => void beginSession('time_out')}
                className="min-w-[140px]"
              >
                Time Out
              </Button>
            </div>
          ) : null}

          {livePreview ? (
            <div className="space-y-3">
              <p className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
                Live preview only — nothing is saved until you press{' '}
                <span className="font-bold">Take selfie</span>, then Confirm.
              </p>
              <p className="text-sm text-[#073D2C]">
                {punchType === 'time_in' ? 'Time In' : 'Time Out'}: center your face, then tap the
                button below when ready.
              </p>
              <div className="relative overflow-hidden rounded-[14px] border border-border bg-black">
                <video
                  ref={attachStreamToVideo}
                  playsInline
                  muted
                  autoPlay
                  className="mx-auto max-h-[360px] w-full scale-x-[-1] object-cover"
                />
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs text-white">
                  <Camera className="h-3.5 w-3.5" />
                  {cameraReady ? 'Waiting for you to take selfie' : 'Starting camera…'}
                </div>
              </div>

              <LocationPanel geo={geo} onRetry={() => void loadLocation()} />

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  size="lg"
                  disabled={!cameraReady}
                  onClick={handleTakeSelfieClick}
                  className="h-12 gap-2 text-base"
                >
                  <Camera className="h-5 w-5" />
                  Take selfie
                </Button>
                <Button type="button" variant="secondary" size="lg" onClick={cancelAll}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {pending ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[#073D2C]">
                Confirm your {pending.punchType === 'time_in' ? 'Time In' : 'Time Out'}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <img
                  src={pending.photoPreview}
                  alt="Selfie preview"
                  className="h-56 w-full rounded-[14px] border border-border object-cover"
                />
                <div className="space-y-3 rounded-[14px] border border-border bg-ivory-100/60 p-4 text-sm">
                  <LocationPanel geo={geo} onRetry={() => void loadLocation()} />
                  {pending.locationLabel ? (
                    <p className="text-sm font-medium text-[#073D2C]">{pending.locationLabel}</p>
                  ) : null}
                  <p className="text-xs text-slate-ui">
                    Time is recorded when you press Confirm ({formatManilaClock(now)}).
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={saving || !locationReady}
                  onClick={() => void confirmPunch()}
                >
                  {saving ? 'Saving…' : locationReady ? 'Confirm' : 'Waiting for location…'}
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
                    className="flex flex-col gap-0.5 rounded-[10px] border border-border/70 bg-white px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#073D2C]">
                        {p.punchType === 'time_in' ? 'Time In' : 'Time Out'}
                      </span>
                      <span className="text-slate-ui">{formatManilaTime(p.punchedAt)}</span>
                    </div>
                    {p.locationLabel ? (
                      <span className="text-xs text-slate-ui">{p.locationLabel}</span>
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
            <p className="text-slate-ui">Looking up street / place name…</p>
          ) : null}
          {geo.status === 'ready' ? (
            <>
              <p className="font-semibold text-[#073D2C]">Location</p>
              <p className="mt-0.5 font-medium text-[#073D2C]">{geo.locationLabel}</p>
              {geo.accuracyM != null ? (
                <p className="mt-0.5 text-xs text-slate-ui">
                  GPS accuracy ±{Math.round(geo.accuracyM)} m
                </p>
              ) : null}
              <a
                className="mt-1 inline-block text-xs font-semibold text-emerald-800 underline"
                href={`https://www.google.com/maps?q=${geo.latitude},${geo.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in Maps
              </a>
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
