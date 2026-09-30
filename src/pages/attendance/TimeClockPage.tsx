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
}

export function TimeClockPage() {
  const { user } = useAuth()
  const { selectedBranch } = useBranch()
  const [now, setNow] = useState(() => new Date())
  const [status, setStatus] = useState<TodayAttendanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pending, setPending] = useState<CaptureState | null>(null)
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
    if (videoRef.current) videoRef.current.srcObject = null
  }

  async function startCapture(punchType: AttendancePunchType) {
    if (!user?.branchId && !selectedBranch?.id) {
      toast.error('Your account has no branch assigned')
      return
    }
    setCapturing(true)
    setPending(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

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

      // Wait a beat so camera preview is warm
      await new Promise((r) => setTimeout(r, 400))

      const video = videoRef.current
      if (!video) throw new Error('Camera not ready')
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not capture selfie')
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
        punchType,
        photoBlob: blob,
        photoPreview,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyM: position.coords.accuracy ?? null,
      })
    } catch (err) {
      await stopCamera()
      toast.error(err instanceof Error ? err.message : 'Camera or location failed')
      setCapturing(false)
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
      })
      toast.success(
        pending.punchType === 'time_in' ? 'Timed in successfully' : 'Timed out successfully',
      )
      URL.revokeObjectURL(pending.photoPreview)
      setPending(null)
      setCapturing(false)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save punch')
    } finally {
      setSaving(false)
    }
  }

  function cancelCapture() {
    if (pending?.photoPreview) URL.revokeObjectURL(pending.photoPreview)
    void stopCamera()
    setPending(null)
    setCapturing(false)
  }

  const branchName = selectedBranch?.name || user?.branchName || 'Your branch'

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Time In / Time Out"
        description={`Clock in and out for ${branchName}. Selfie and location are required.`}
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
                  status?.openTimeIn
                    ? 'active'
                    : status?.lastPunch
                      ? 'done'
                      : 'idle'
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

          {!capturing && !pending ? (
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                size="lg"
                disabled={!status?.canTimeIn || loading}
                onClick={() => void startCapture('time_in')}
                className="min-w-[140px]"
              >
                Time In
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                disabled={!status?.canTimeOut || loading}
                onClick={() => void startCapture('time_out')}
                className="min-w-[140px]"
              >
                Time Out
              </Button>
            </div>
          ) : null}

          {capturing && !pending ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#073D2C]">
                Look at the camera for your selfie. Location is being captured…
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
                  Selfie in progress
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={cancelCapture}>
                Cancel
              </Button>
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
                  className="h-56 w-full rounded-[14px] border border-border object-cover scale-x-[-1]"
                />
                <div className="space-y-3 rounded-[14px] border border-border bg-ivory-100/60 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />
                    <div>
                      <p className="font-semibold text-[#073D2C]">Location captured</p>
                      <p className="mt-1 text-slate-ui">
                        {pending.latitude.toFixed(6)}, {pending.longitude.toFixed(6)}
                      </p>
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
                    Time will be recorded at the moment you press Confirm ({formatManilaClock(now)}).
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={saving} onClick={() => void confirmPunch()}>
                  {saving ? 'Saving…' : 'Confirm'}
                </Button>
                <Button type="button" variant="secondary" disabled={saving} onClick={cancelCapture}>
                  Retake
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
                    className="flex items-center justify-between rounded-[10px] border border-border/70 bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-[#073D2C]">
                      {p.punchType === 'time_in' ? 'Time In' : 'Time Out'}
                    </span>
                    <span className="text-slate-ui">{formatManilaTime(p.punchedAt)}</span>
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
