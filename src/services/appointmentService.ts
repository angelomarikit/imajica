import { demoBranches, demoStaff, demoTreatments } from '@/constants/demoData'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Appointment, AppointmentStatus } from '@/types'

const STORAGE_KEY = 'imajica_appointments'
const CHANGE_EVENT = 'imajica:appointments-changed'

export type CreateAppointmentInput = {
  clientId: string
  clientName: string
  clientEmail?: string
  branchId: string
  treatmentId: string
  staffId?: string
  /** YYYY-MM-DD */
  date: string
  /** e.g. "09:00 AM" */
  timeLabel: string
  notes?: string
  status?: AppointmentStatus
}

/** Parse "09:00 AM" → { hours, minutes } in 24h */
export function parseTimeLabel(timeLabel: string): { hours: number; minutes: number } {
  const match = timeLabel.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return { hours: 9, minutes: 0 }
  let hours = Number(match[1])
  const minutes = Number(match[2])
  const period = match[3].toUpperCase()
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return { hours, minutes }
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildStartEnd(dateKey: string, timeLabel: string, durationMinutes: number) {
  const { hours, minutes } = parseTimeLabel(timeLabel)
  const start = new Date(`${dateKey}T00:00:00`)
  start.setHours(hours, minutes, 0, 0)
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  }
}

function readLocal(): Appointment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Appointment[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(items: Appointment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/**
 * List appointments.
 * When Supabase is configured, reads from `appointments` (+ related names).
 * Until then, localStorage bookings only (empty when no data).
 */
export async function listAppointments(): Promise<Appointment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        client_id,
        branch_id,
        treatment_id,
        staff_id,
        room_id,
        start_at,
        end_at,
        duration_minutes,
        status,
        notes,
        price,
        clients ( full_name ),
        branches ( name ),
        treatments ( name ),
        staff ( full_name )
      `,
      )
      .order('start_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(mapJoinedRowToAppointment)
  }
  return readLocal().sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  )
}

export async function listAppointmentsByClient(clientId: string): Promise<Appointment[]> {
  const all = await listAppointments()
  return all.filter((a) => a.clientId === clientId)
}

/**
 * Create appointment — ready for Supabase `appointments` insert.
 * Demo mode persists to localStorage so Admin Appointments / Client portal update.
 */
export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const branch = demoBranches.find((b) => b.id === input.branchId)
  const treatment = demoTreatments.find((t) => t.id === input.treatmentId)
  if (!branch || !treatment) {
    throw new Error('Invalid branch or treatment')
  }

  const staff = input.staffId ? demoStaff.find((s) => s.id === input.staffId) : undefined
  const durationMinutes = treatment.durationMinutes
  const { startAt, endAt } = buildStartEnd(input.date, input.timeLabel, durationMinutes)

  const appointment: Appointment = {
    id: `ap-${Date.now()}`,
    clientId: input.clientId,
    clientName: input.clientName,
    branchId: branch.id,
    branchName: branch.name,
    treatmentId: treatment.id,
    treatmentName: treatment.name,
    staffId: staff?.id,
    staffName: staff?.fullName,
    startAt,
    endAt,
    durationMinutes,
    status: input.status ?? 'pending',
    notes: input.notes,
    price: treatment.price,
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        client_id: input.clientId,
        branch_id: input.branchId,
        treatment_id: input.treatmentId,
        staff_id: input.staffId ?? null,
        start_at: startAt,
        end_at: endAt,
        duration_minutes: durationMinutes,
        status: input.status ?? 'pending',
        notes: input.notes ?? null,
        price: treatment.price,
      })
      .select(
        `
        id,
        client_id,
        branch_id,
        treatment_id,
        staff_id,
        room_id,
        start_at,
        end_at,
        duration_minutes,
        status,
        notes,
        price,
        clients ( full_name ),
        branches ( name ),
        treatments ( name ),
        staff ( full_name )
      `,
      )
      .single()
    if (error) throw error
    const saved = mapJoinedRowToAppointment(data)
    window.dispatchEvent(new Event(CHANGE_EVENT))
    return saved
  }

  const next = [...readLocal().filter((a) => a.id !== appointment.id), appointment]
  writeLocal(next)
  return appointment
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<Appointment | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(
        `
        id,
        client_id,
        branch_id,
        treatment_id,
        staff_id,
        room_id,
        start_at,
        end_at,
        duration_minutes,
        status,
        notes,
        price,
        clients ( full_name ),
        branches ( name ),
        treatments ( name ),
        staff ( full_name )
      `,
      )
      .single()
    if (error) throw error
    window.dispatchEvent(new Event(CHANGE_EVENT))
    return mapJoinedRowToAppointment(data)
  }

  const local = readLocal()
  const inLocal = local.find((a) => a.id === id)
  if (!inLocal) return null
  const updated = { ...inLocal, status }
  writeLocal(local.map((a) => (a.id === id ? updated : a)))
  return updated
}

/** Subscribe to appointment list changes (localStorage / future realtime). */
export function subscribeAppointments(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Dates (YYYY-MM-DD) that already have at least one appointment. */
export function getBookedDateKeys(appointments: Appointment[]): Set<string> {
  const keys = new Set<string>()
  for (const a of appointments) {
    const d = new Date(a.startAt)
    keys.add(toDateKey(d))
  }
  return keys
}

// --- Supabase row mapping (matches supabase/migrations appointments schema) ---

type JoinedName = { full_name?: string; name?: string } | null

type AppointmentJoinedRow = {
  id: string
  client_id: string
  branch_id: string
  treatment_id: string | null
  staff_id?: string | null
  room_id?: string | null
  start_at: string
  end_at: string
  duration_minutes: number
  status: AppointmentStatus
  notes?: string | null
  price: number
  clients?: JoinedName | JoinedName[]
  branches?: JoinedName | JoinedName[]
  treatments?: JoinedName | JoinedName[]
  staff?: JoinedName | JoinedName[]
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapJoinedRowToAppointment(row: AppointmentJoinedRow): Appointment {
  const client = one(row.clients)
  const branch = one(row.branches)
  const treatment = one(row.treatments)
  const staff = one(row.staff)
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: client?.full_name ?? 'Client',
    branchId: row.branch_id,
    branchName: branch?.name ?? 'Branch',
    treatmentId: row.treatment_id ?? '',
    treatmentName: treatment?.name ?? 'Treatment',
    staffId: row.staff_id ?? undefined,
    staffName: staff?.full_name ?? undefined,
    roomId: row.room_id ?? undefined,
    startAt: row.start_at,
    endAt: row.end_at,
    durationMinutes: row.duration_minutes,
    status: row.status,
    notes: row.notes ?? undefined,
    price: Number(row.price),
  }
}
