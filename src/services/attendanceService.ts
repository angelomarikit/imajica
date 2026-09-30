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
  location_label: string | null
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
    if (!Array.isArray(parsed)) return []
    return parsed.map((p) => ({
      ...p,
      locationLabel: p.locationLabel ?? null,
    }))
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
    locationLabel: row.location_label ?? null,
    createdAt: row.created_at,
  }
}

const ATTENDANCE_SELECT =
  'id, user_id, branch_id, punch_type, punched_at, photo_url, latitude, longitude, accuracy_m, location_label, created_at'

function looksLikeCoordinates(label: string | null | undefined): boolean {
  if (!label?.trim()) return true
  // "14.09518, 121.30232" or "Near 14.09518, 121.30232"
  return /^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(label.trim().replace(/^near\s+/i, ''))
}

async function geocodeBigDataCloud(latitude: number, longitude: number): Promise<string | null> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('localityLanguage', 'en')
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const data = (await res.json()) as {
    locality?: string
    city?: string
    principalSubdivision?: string
    countryName?: string
    plusCode?: string
    localityInfo?: {
      informative?: Array<{ name?: string; description?: string; order?: number }>
      administrative?: Array<{ name?: string; description?: string; order?: number }>
    }
  }

  const informative = [...(data.localityInfo?.informative ?? [])].sort(
    (a, b) => (a.order ?? 99) - (b.order ?? 99),
  )
  const administrative = [...(data.localityInfo?.administrative ?? [])].sort(
    (a, b) => (a.order ?? 99) - (b.order ?? 99),
  )

  const street = informative.find((x) =>
    /street|road|avenue|boulevard|highway|drive|lane/i.test(
      `${x.description ?? ''} ${x.name ?? ''}`,
    ),
  )?.name
  const barangay = informative.find((x) =>
    /barangay|neighbourhood|neighborhood|suburb|village/i.test(
      `${x.description ?? ''} ${x.name ?? ''}`,
    ),
  )?.name
  const cityish =
    data.city ||
    data.locality ||
    administrative.find((x) => /city|municipality|town/i.test(x.description ?? ''))?.name
  const province =
    data.principalSubdivision ||
    administrative.find((x) => /province|region|state/i.test(x.description ?? ''))?.name

  const parts = [street, barangay, cityish, province, data.countryName].filter(
    (p): p is string => Boolean(p && String(p).trim()),
  )
  const unique: string[] = []
  for (const p of parts) {
    if (!unique.some((u) => u.toLowerCase() === p.toLowerCase())) unique.push(p)
  }
  return unique.length ? unique.slice(0, 4).join(', ') : null
}

async function geocodePhoton(latitude: number, longitude: number): Promise<string | null> {
  const url = new URL('https://photon.komoot.io/reverse')
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const data = (await res.json()) as {
    features?: Array<{
      properties?: {
        name?: string
        street?: string
        housenumber?: string
        district?: string
        city?: string
        town?: string
        village?: string
        municipality?: string
        county?: string
        state?: string
        country?: string
      }
    }>
  }
  const p = data.features?.[0]?.properties
  if (!p) return null
  const streetLine = [p.housenumber, p.street || p.name].filter(Boolean).join(' ')
  const parts = [
    streetLine || null,
    p.district,
    p.city || p.town || p.village || p.municipality,
    p.county,
    p.state,
    p.country,
  ].filter((x): x is string => Boolean(x && String(x).trim()))
  const unique: string[] = []
  for (const part of parts) {
    if (!unique.some((u) => u.toLowerCase() === part.toLowerCase())) unique.push(part)
  }
  return unique.length ? unique.slice(0, 4).join(', ') : null
}

/** Reverse-geocode coords to a street / place label (multi-provider). */
export async function reverseGeocodeLabel(
  latitude: number,
  longitude: number,
): Promise<string> {
  const providers = [geocodePhoton, geocodeBigDataCloud]
  for (const provider of providers) {
    try {
      const label = await provider(latitude, longitude)
      if (label && !looksLikeCoordinates(label)) return label
    } catch {
      /* try next */
    }
  }
  return `Near ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

/** Fill missing place names for punches that only have coordinates. */
export async function enrichAttendanceLabels(
  punches: AttendancePunch[],
): Promise<AttendancePunch[]> {
  const next = [...punches]
  let changed = false
  for (let i = 0; i < next.length; i++) {
    const p = next[i]!
    if (p.latitude == null || p.longitude == null) continue
    if (p.locationLabel && !looksLikeCoordinates(p.locationLabel)) continue
    try {
      const label = await reverseGeocodeLabel(p.latitude, p.longitude)
      if (!label || looksLikeCoordinates(label)) continue
      next[i] = { ...p, locationLabel: label }
      changed = true
      await persistAttendanceLabel(p.id, label)
    } catch {
      /* keep coords fallback */
    }
  }
  if (changed && !isSupabaseConfigured) {
    const byId = new Map(next.map((p) => [p.id, p]))
    writeLocal(readLocal().map((p) => byId.get(p.id) ?? p))
  }
  return next
}

async function persistAttendanceLabel(id: string, locationLabel: string) {
  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('staff_attendance_logs')
      .update({ location_label: locationLabel })
      .eq('id', id)
    return
  }
  writeLocal(
    readLocal().map((p) => (p.id === id ? { ...p, locationLabel } : p)),
  )
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
  let rows: AttendancePunch[]
  if (isSupabaseConfigured && supabase) {
    let { data, error } = await supabase
      .from('staff_attendance_logs')
      .select(ATTENDANCE_SELECT)
      .eq('user_id', userId)
      .order('punched_at', { ascending: false })

    if (error && /location_label/i.test(error.message)) {
      const fallback = await supabase
        .from('staff_attendance_logs')
        .select(
          'id, user_id, branch_id, punch_type, punched_at, photo_url, latitude, longitude, accuracy_m, created_at',
        )
        .eq('user_id', userId)
        .order('punched_at', { ascending: false })
      data = (fallback.data as DbRow[] | null)?.map((r) => ({
        ...r,
        location_label: null,
      })) as typeof data
      error = fallback.error
    }

    if (error) throw new Error(error.message)
    rows = ((data as DbRow[] | null) ?? []).map(mapRow)
  } else {
    rows = readLocal()
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.punchedAt.localeCompare(a.punchedAt))
  }
  return enrichAttendanceLabels(rows)
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
  locationLabel: string
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
    const payload = {
      user_id: input.userId,
      branch_id: input.branchId,
      punch_type: input.punchType,
      punched_at: punchedAt,
      photo_url: photoUrl,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy_m: input.accuracyM,
      location_label: input.locationLabel,
    }
    let { data, error } = await supabase
      .from('staff_attendance_logs')
      .insert(payload)
      .select(ATTENDANCE_SELECT)
      .single()

    // Column may be missing if migration 38 not applied yet — retry without label
    if (error && /location_label/i.test(error.message)) {
      const { location_label: _omit, ...withoutLabel } = payload
      void _omit
      const retry = await supabase
        .from('staff_attendance_logs')
        .insert(withoutLabel)
        .select(
          'id, user_id, branch_id, punch_type, punched_at, photo_url, latitude, longitude, accuracy_m, created_at',
        )
        .single()
      data = retry.data
        ? ({ ...retry.data, location_label: input.locationLabel } as DbRow)
        : null
      error = retry.error
    }

    if (error) throw new Error(error.message)
    emit()
    return mapRow({
      ...(data as DbRow),
      location_label: (data as DbRow).location_label ?? input.locationLabel,
    })
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
    locationLabel: input.locationLabel,
    createdAt: punchedAt,
  }
  writeLocal([row, ...readLocal()])
  return row
}

/** Staff may delete their own punch (accidental Time In / Out). */
export async function deleteAttendancePunch(input: {
  id: string
  userId: string
}): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('staff_attendance_logs')
      .delete()
      .eq('id', input.id)
      .eq('user_id', input.userId)
    if (error) throw new Error(error.message)
    emit()
    return
  }
  writeLocal(readLocal().filter((p) => !(p.id === input.id && p.userId === input.userId)))
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
