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
  const hasTimedInToday = punches.some((p) => p.punchType === 'time_in')
  /** Open session = last punch today is Time In (waiting for Time Out). */
  const openTimeIn = lastPunch?.punchType === 'time_in' ? lastPunch : null
  return {
    punches,
    lastPunch,
    // One Time In per Manila day — after Time Out, wait until tomorrow
    canTimeIn: !hasTimedInToday,
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
    throw new Error(
      status.openTimeIn
        ? 'Already timed in. Please Time Out first.'
        : 'You already completed attendance for today. Try again tomorrow.',
    )
  }
  if (input.punchType === 'time_out' && !status.canTimeOut) {
    throw new Error(
      status.punches.some((p) => p.punchType === 'time_out')
        ? 'You already timed out for today.'
        : 'Time In is required before Time Out.',
    )
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

/** Branch-wide punches (BRANCH_ADMIN / HQ via RLS). Optional Manila date range (inclusive). */
export async function listBranchAttendance(
  branchId: string,
  fromDateKey?: string,
  toDateKey?: string,
): Promise<AttendancePunch[]> {
  return listAttendanceForBranches([branchId], fromDateKey, toDateKey)
}

/** Multi-branch punches for HQ group attendance views. */
export async function listAttendanceForBranches(
  branchIds: string[],
  fromDateKey?: string,
  toDateKey?: string,
): Promise<AttendancePunch[]> {
  const ids = [...new Set(branchIds.filter(Boolean))]
  if (!ids.length) return []

  let rows: AttendancePunch[]
  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('staff_attendance_logs')
      .select(ATTENDANCE_SELECT)
      .in('branch_id', ids)
      .order('punched_at', { ascending: false })

    if (fromDateKey) {
      query = query.gte('punched_at', `${fromDateKey}T00:00:00+08:00`)
    }
    if (toDateKey) {
      query = query.lte('punched_at', `${toDateKey}T23:59:59.999+08:00`)
    }

    let { data, error } = await query

    if (error && /location_label/i.test(error.message)) {
      let fallback = supabase
        .from('staff_attendance_logs')
        .select(
          'id, user_id, branch_id, punch_type, punched_at, photo_url, latitude, longitude, accuracy_m, created_at',
        )
        .in('branch_id', ids)
        .order('punched_at', { ascending: false })
      if (fromDateKey) fallback = fallback.gte('punched_at', `${fromDateKey}T00:00:00+08:00`)
      if (toDateKey) fallback = fallback.lte('punched_at', `${toDateKey}T23:59:59.999+08:00`)
      const retry = await fallback
      data = (retry.data as DbRow[] | null)?.map((r) => ({
        ...r,
        location_label: null,
      })) as typeof data
      error = retry.error
    }

    if (error) throw new Error(error.message)
    rows = ((data as DbRow[] | null) ?? []).map(mapRow)
  } else {
    const idSet = new Set(ids)
    rows = readLocal()
      .filter((p) => idSet.has(p.branchId))
      .filter((p) => {
        const key = manilaDateKey(p.punchedAt)
        if (fromDateKey && key < fromDateKey) return false
        if (toDateKey && key > toDateKey) return false
        return true
      })
      .sort((a, b) => b.punchedAt.localeCompare(a.punchedAt))
  }
  return enrichAttendanceLabels(rows)
}

export type AttendanceSession = {
  dateKey: string
  timeIn: AttendancePunch
  timeOut: AttendancePunch | null
  /** Decimal hours; null when still open / incomplete */
  hours: number | null
}

/** Pair Time In → Time Out chronologically (per person). */
export function buildAttendanceSessions(punches: AttendancePunch[]): AttendanceSession[] {
  const sorted = [...punches].sort((a, b) => a.punchedAt.localeCompare(b.punchedAt))
  const sessions: AttendanceSession[] = []
  let open: AttendancePunch | null = null

  for (const p of sorted) {
    if (p.punchType === 'time_in') {
      if (open) {
        sessions.push({
          dateKey: manilaDateKey(open.punchedAt),
          timeIn: open,
          timeOut: null,
          hours: null,
        })
      }
      open = p
      continue
    }
    // time_out
    if (open) {
      const ms = new Date(p.punchedAt).getTime() - new Date(open.punchedAt).getTime()
      sessions.push({
        dateKey: manilaDateKey(open.punchedAt),
        timeIn: open,
        timeOut: p,
        hours: ms > 0 ? ms / (1000 * 60 * 60) : 0,
      })
      open = null
    }
  }
  if (open) {
    sessions.push({
      dateKey: manilaDateKey(open.punchedAt),
      timeIn: open,
      timeOut: null,
      hours: null,
    })
  }
  return sessions
}

export function formatAttendanceHours(hours: number | null | undefined): string {
  if (hours == null || Number.isNaN(hours)) return '—'
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export type StaffAttendanceSummary = {
  userId: string
  fullName: string
  role: string
  email: string
  branchId?: string | null
  branchName?: string | null
  daysPresent: number
  sessionCount: number
  completedSessions: number
  openSessions: number
  totalHours: number
  sessions: AttendanceSession[]
  punches: AttendancePunch[]
}

export function summarizeStaffAttendance(
  punches: AttendancePunch[],
  people: Array<{
    id: string
    fullName: string
    role: string
    email: string
    branchId?: string | null
    branchName?: string | null
  }>,
): StaffAttendanceSummary[] {
  const byUser = new Map<string, AttendancePunch[]>()
  for (const p of punches) {
    const list = byUser.get(p.userId) ?? []
    list.push(p)
    byUser.set(p.userId, list)
  }

  const peopleById = new Map(people.map((p) => [p.id, p]))
  const ids = new Set([...peopleById.keys(), ...byUser.keys()])

  const rows: StaffAttendanceSummary[] = []
  for (const id of ids) {
    const person = peopleById.get(id)
    const userPunches = byUser.get(id) ?? []
    const sessions = buildAttendanceSessions(userPunches)
    const days = new Set(sessions.map((s) => s.dateKey))
    const completed = sessions.filter((s) => s.timeOut)
    const open = sessions.filter((s) => !s.timeOut)
    const totalHours = completed.reduce((sum, s) => sum + (s.hours ?? 0), 0)
    rows.push({
      userId: id,
      fullName: person?.fullName ?? `Staff ${id.slice(0, 8)}`,
      role: person?.role ?? 'STAFF',
      email: person?.email ?? '',
      branchId: person?.branchId ?? userPunches[0]?.branchId ?? null,
      branchName: person?.branchName ?? null,
      daysPresent: days.size,
      sessionCount: sessions.length,
      completedSessions: completed.length,
      openSessions: open.length,
      totalHours,
      sessions: [...sessions].reverse(),
      punches: userPunches,
    })
  }

  return rows.sort((a, b) => a.fullName.localeCompare(b.fullName))
}

/** Excel export: Summary + Detail sheets for branch attendance review. */
export async function exportBranchAttendanceXlsx(input: {
  filename: string
  branchName: string
  from: string
  to: string
  summaries: StaffAttendanceSummary[]
}) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()

  const summaryRows = [
    ['Branch', input.branchName],
    ['Period', `${input.from} to ${input.to}`],
    [],
    [
      'Staff',
      'Branch',
      'Role',
      'Email',
      'Days Present',
      'Sessions',
      'Completed',
      'Open (no Time Out)',
      'Total Hours',
      'Total Hours (decimal)',
    ],
    ...input.summaries.map((s) => [
      s.fullName,
      s.branchName ?? input.branchName,
      s.role.replaceAll('_', ' '),
      s.email,
      s.daysPresent,
      s.sessionCount,
      s.completedSessions,
      s.openSessions,
      formatAttendanceHours(s.totalHours),
      Number(s.totalHours.toFixed(2)),
    ]),
  ]
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(summaryRows),
    'Summary',
  )

  const detailRows: (string | number)[][] = [
    [
      'Staff',
      'Branch',
      'Role',
      'Date',
      'Time In',
      'Time Out',
      'Hours',
      'Hours (decimal)',
      'Location In',
      'Location Out',
      'Status',
    ],
  ]
  for (const s of input.summaries) {
    for (const session of [...s.sessions].reverse()) {
      detailRows.push([
        s.fullName,
        s.branchName ?? input.branchName,
        s.role.replaceAll('_', ' '),
        session.dateKey,
        formatManilaDateTime(session.timeIn.punchedAt),
        session.timeOut ? formatManilaDateTime(session.timeOut.punchedAt) : '',
        formatAttendanceHours(session.hours),
        session.hours == null ? '' : Number(session.hours.toFixed(2)),
        session.timeIn.locationLabel ?? '',
        session.timeOut?.locationLabel ?? '',
        session.timeOut ? 'Complete' : 'Open',
      ])
    }
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(detailRows), 'Detail')

  const name = input.filename.toLowerCase().endsWith('.xlsx')
    ? input.filename
    : `${input.filename}.xlsx`
  XLSX.writeFile(workbook, name)
}

export type KioskEmployeeLookup = {
  ok: true
  userId: string
  fullName: string
  employeeCode: string
  branchId: string | null
  branchName: string
  role: string
  canTimeIn: boolean
  canTimeOut: boolean
}

export type KioskPunchResult = {
  ok: true
  id: string
  fullName: string
  employeeCode: string
  punchType: AttendancePunchType
  punchedAt: string
  branchName: string
  locationLabel: string | null
}

/** Resolve employee by kiosk number (works offline via seed; online via RPC). */
export async function kioskLookupEmployee(employeeCode: string): Promise<KioskEmployeeLookup> {
  const { findKioskStaffByCode, normalizeEmployeeCode } = await import('@/constants/kioskStaffSeed')
  const code = normalizeEmployeeCode(employeeCode)

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('kiosk_lookup_employee', {
      p_employee_code: code,
    })
    if (error) throw new Error(error.message)
    const row = data as Record<string, unknown> | null
    if (!row || row.ok !== true) {
      throw new Error(String(row?.error ?? 'Employee number not found'))
    }
    return {
      ok: true,
      userId: String(row.userId),
      fullName: String(row.fullName),
      employeeCode: String(row.employeeCode),
      branchId: row.branchId ? String(row.branchId) : null,
      branchName: String(row.branchName ?? 'Branch'),
      role: String(row.role ?? 'STAFF'),
      canTimeIn: Boolean(row.canTimeIn),
      canTimeOut: Boolean(row.canTimeOut),
    }
  }

  const staff = findKioskStaffByCode(code)
  if (!staff) throw new Error('Employee number not found')
  const status = await getTodayAttendanceStatus(staff.id)
  return {
    ok: true,
    userId: staff.id,
    fullName: staff.fullName,
    employeeCode: staff.employeeCode,
    branchId: staff.branchId,
    branchName: staff.branchName,
    role: staff.role,
    canTimeIn: status.canTimeIn,
    canTimeOut: status.canTimeOut,
  }
}

/** Shared kiosk punch — employee number + GPS + required selfie (no login). */
export async function kioskAttendancePunch(input: {
  employeeCode: string
  punchType: AttendancePunchType
  photoBlob: Blob
  latitude: number
  longitude: number
  accuracyM: number | null
  locationLabel: string
}): Promise<KioskPunchResult> {
  const { findKioskStaffByCode, normalizeEmployeeCode } = await import('@/constants/kioskStaffSeed')
  const code = normalizeEmployeeCode(input.employeeCode)
  const photoUrl = await uploadKioskSelfie(code, input.photoBlob)

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('kiosk_attendance_punch', {
      p_employee_code: code,
      p_punch_type: input.punchType,
      p_latitude: input.latitude,
      p_longitude: input.longitude,
      p_accuracy_m: input.accuracyM,
      p_location_label: input.locationLabel,
      p_photo_url: photoUrl,
    })
    if (error) throw new Error(error.message)
    const row = data as Record<string, unknown> | null
    if (!row || row.ok !== true) {
      throw new Error(String(row?.error ?? 'Punch failed'))
    }
    emit()
    return {
      ok: true,
      id: String(row.id),
      fullName: String(row.fullName),
      employeeCode: String(row.employeeCode),
      punchType: row.punchType as AttendancePunchType,
      punchedAt: String(row.punchedAt),
      branchName: String(row.branchName ?? 'Branch'),
      locationLabel: row.locationLabel ? String(row.locationLabel) : null,
    }
  }

  const staff = findKioskStaffByCode(code)
  if (!staff) throw new Error('Employee number not found')
  const status = await getTodayAttendanceStatus(staff.id)
  if (input.punchType === 'time_in' && !status.canTimeIn) {
    throw new Error(
      status.openTimeIn
        ? 'Already timed in. Please Time Out first.'
        : 'You already completed attendance for today. Try again tomorrow.',
    )
  }
  if (input.punchType === 'time_out' && !status.canTimeOut) {
    throw new Error(
      status.punches.some((p) => p.punchType === 'time_out')
        ? 'You already timed out for today.'
        : 'Time In is required before Time Out.',
    )
  }

  const punchedAt = new Date().toISOString()
  const row: AttendancePunch = {
    id: `att-${crypto.randomUUID()}`,
    userId: staff.id,
    branchId: staff.branchId,
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
  return {
    ok: true,
    id: row.id,
    fullName: staff.fullName,
    employeeCode: staff.employeeCode,
    punchType: input.punchType,
    punchedAt,
    branchName: staff.branchName,
    locationLabel: input.locationLabel,
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Failed to read selfie'))
    reader.readAsDataURL(blob)
  })
}

/** Upload kiosk selfie (anon-friendly path). Falls back to data URL if storage fails. */
async function uploadKioskSelfie(employeeCode: string, blob: Blob): Promise<string> {
  const day = manilaDateKey()
  const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
  const path = `kiosk/${employeeCode}/${day}/${crypto.randomUUID()}.${ext}`

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.storage.from('attendance-selfies').upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false,
    })
    if (!error) {
      const { data: signed, error: signErr } = await supabase.storage
        .from('attendance-selfies')
        .createSignedUrl(path, 60 * 60 * 24 * 365)
      if (!signErr && signed?.signedUrl) return signed.signedUrl
      return `storage:attendance-selfies/${path}`
    }
    // Fall through to data URL when bucket policy not applied yet
  }

  return blobToDataUrl(blob)
}
