import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { AttendancePunch, AttendancePunchType } from '@/types'

const KEY = 'imajica_attendance_punches'
const CHANGE = 'imajica:attendance-changed'
const MANILA_TZ = 'Asia/Manila'

type DbRow = {
  id: string
  user_id: string
  branch_id: string
  punch_type: AttendancePunchType
  punched_at: string
  photo_url: string | null
  latitude: number | null
  longitude: number | null
  accuracy_m: number | null
  created_at: string
}

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

function readLocal(): AttendancePunch[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AttendancePunch[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(rows: AttendancePunch[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
  emit()
}

function mapRow(row: DbRow): AttendancePunch {
  return {
    id: row.id,
    userId: row.user_id,
    branchId: row.branch_id,
    punchType: row.punch_type,
    punchedAt: row.punched_at,
    photoUrl: row.photo_url,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    accuracyM: row.accuracy_m == null ? null : Number(row.accuracy_m),
    createdAt: row.created_at,
  }
}

/** Manila calendar date key YYYY-MM-DD for a timestamp */
export function manilaDateKey(iso: string | Date = new Date()): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function formatManilaTime(iso: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}

export function formatManilaDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}

export function formatManilaClock(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TZ,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(now)
}

export function subscribeAttendance(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener()
  }
  window.addEventListener(CHANGE, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE, listener)
    window.removeEventListener('storage', onStorage)
  }
}

export async function listMyAttendance(userId: string): Promise<AttendancePunch[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('staff_attendance_logs')
      .select(
        'id, user_id, branch_id, punch_type, punched_at, photo_url, latitude, longitude, accuracy_m, created_at',
      )
      .eq('user_id', userId)
      .order('punched_at', { ascending: false })
    if (error) throw new Error(error.message)
    return ((data as DbRow[] | null) ?? []).map(mapRow)
  }
  return readLocal()
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.punchedAt.localeCompare(a.punchedAt))
}

export async function listMyAttendanceForDay(
  userId: string,
  dateKey: string,
): Promise<AttendancePunch[]> {
  const all = await listMyAttendance(userId)
  return all
    .filter((p) => manilaDateKey(p.punchedAt) === dateKey)
    .sort((a, b) => a.punchedAt.localeCompare(b.punchedAt))
}

export type TodayAttendanceStatus = {
  punches: AttendancePunch[]
  lastPunch: AttendancePunch | null
  canTimeIn: boolean
  canTimeOut: boolean
  openTimeIn: AttendancePunch | null
}

export async function getTodayAttendanceStatus(userId: string): Promise<TodayAttendanceStatus> {
  const today = manilaDateKey()
  const punches = await listMyAttendanceForDay(userId, today)
  const lastPunch = punches.length ? punches[punches.length - 1]! : null
  const openTimeIn =
    lastPunch?.punchType === 'time_in'
      ? lastPunch
      : null
  return {
    punches,
    lastPunch,
    canTimeIn: !openTimeIn,
    canTimeOut: Boolean(openTimeIn),
    openTimeIn,
  }
}

async function uploadSelfie(
  userId: string,
  blob: Blob,
): Promise<string> {
  const day = manilaDateKey()
  const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
  const path = `${userId}/${day}/${crypto.randomUUID()}.${ext}`

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.storage.from('attendance-selfies').upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false,
    })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('attendance-selfies').getPublicUrl(path)
    // Bucket is private — store path; signed URL resolved on read when needed
    // Prefer creating a durable path reference; for display use createSignedUrl
    void data
    const { data: signed, error: signErr } = await supabase.storage
      .from('attendance-selfies')
      .createSignedUrl(path, 60 * 60 * 24 * 365)
    if (signErr) {
      // Fall back to storage path marker
      return `storage:attendance-selfies/${path}`
    }
    return signed.signedUrl
  }

  // Offline: data URL
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Failed to read selfie'))
    reader.readAsDataURL(blob)
  })
}

export async function resolveAttendancePhotoUrl(photoUrl: string | null): Promise<string | null> {
  if (!photoUrl) return null
  if (photoUrl.startsWith('data:') || photoUrl.startsWith('http')) return photoUrl
  if (photoUrl.startsWith('storage:attendance-selfies/') && supabase) {
    const path = photoUrl.replace('storage:attendance-selfies/', '')
    const { data, error } = await supabase.storage
      .from('attendance-selfies')
      .createSignedUrl(path, 3600)
    if (error) return null
    return data.signedUrl
  }
  return photoUrl
}

export async function recordAttendancePunch(input: {
  userId: string
  branchId: string
  punchType: AttendancePunchType
  photoBlob: Blob
  latitude: number
  longitude: number
  accuracyM: number | null
}): Promise<AttendancePunch> {
  const status = await getTodayAttendanceStatus(input.userId)
  if (input.punchType === 'time_in' && !status.canTimeIn) {
    throw new Error('You already timed in. Please Time Out first.')
  }
  if (input.punchType === 'time_out' && !status.canTimeOut) {
    throw new Error('Time In is required before Time Out.')
  }

  const punchedAt = new Date().toISOString()
  const photoUrl = await uploadSelfie(input.userId, input.photoBlob)

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('staff_attendance_logs')
      .insert({
        user_id: input.userId,
        branch_id: input.branchId,
        punch_type: input.punchType,
        punched_at: punchedAt,
        photo_url: photoUrl,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy_m: input.accuracyM,
      })
      .select(
        'id, user_id, branch_id, punch_type, punched_at, photo_url, latitude, longitude, accuracy_m, created_at',
      )
      .single()
    if (error) throw new Error(error.message)
    emit()
    return mapRow(data as DbRow)
  }

  const row: AttendancePunch = {
    id: `att-${crypto.randomUUID()}`,
    userId: input.userId,
    branchId: input.branchId,
    punchType: input.punchType,
    punchedAt,
    photoUrl,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyM: input.accuracyM,
    createdAt: punchedAt,
  }
  writeLocal([row, ...readLocal()])
  return row
}

/** Days in a Manila month that have at least one punch */
export function daysWithPunches(
  punches: AttendancePunch[],
  year: number,
  monthIndex: number,
): Set<string> {
  const set = new Set<string>()
  for (const p of punches) {
    const key = manilaDateKey(p.punchedAt)
    const [y, m] = key.split('-').map(Number)
    if (y === year && m === monthIndex + 1) set.add(key)
  }
  return set
}
