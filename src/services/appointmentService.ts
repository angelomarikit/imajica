import { getBranches } from '@/services/branchService'
import { getClients, registerClient, saveClient } from '@/services/clientService'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Appointment, AppointmentStatus } from '@/types'

const STORAGE_KEY = 'imajica_appointments'
const CHANGE_EVENT = 'imajica:appointments-changed'

export type CreateAppointmentInput = {
  clientId?: string
  clientName: string
  clientEmail?: string
  clientPhone?: string
  branchId: string
  treatmentId?: string
  treatmentName: string
  treatmentName2?: string
  staffId?: string
  staffName?: string
  /** YYYY-MM-DD appointment date */
  date: string
  /** YYYY-MM-DD booking taken date */
  bookingDate?: string
  /** e.g. "09:00 AM" or "14:30" */
  timeLabel: string
  notes?: string
  status?: AppointmentStatus
  clientStatus?: string
  clinic?: string
  campaignPromo?: string
  promoCode?: string
  downPayment?: number
  leadSource?: string
}

/** Parse "09:00 AM" or "14:30" → { hours, minutes } in 24h */
export function parseTimeLabel(timeLabel: string): { hours: number; minutes: number } {
  const twelve = timeLabel.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (twelve) {
    let hours = Number(twelve[1])
    const minutes = Number(twelve[2])
    const period = twelve[3].toUpperCase()
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    return { hours, minutes }
  }
  const twentyFour = timeLabel.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (twentyFour) {
    return { hours: Number(twentyFour[1]), minutes: Number(twentyFour[2]) }
  }
  return { hours: 9, minutes: 0 }
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

function formatTimeLabel(timeLabel: string): string {
  const { hours, minutes } = parseTimeLabel(timeLabel)
  const period = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours % 12 || 12
  return `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`
}

/** Find existing client or register a lightweight schedule client. */
export function resolveScheduleClient(input: {
  clientId?: string
  fullName: string
  email?: string
  phone?: string
  branchId: string
  branchName: string
}): { id: string; fullName: string; email?: string; phone?: string } {
  if (input.clientId) {
    const existing = getClients().find((c) => c.id === input.clientId)
    if (existing) {
      const patched = saveClient({
        ...existing,
        email: input.email?.trim() || existing.email,
        phone: input.phone?.trim() || existing.phone,
      })
      return {
        id: patched.id,
        fullName: patched.fullName,
        email: patched.email,
        phone: patched.phone,
      }
    }
  }

  const name = input.fullName.trim()
  const phone = input.phone?.trim() || ''
  const email = input.email?.trim() || ''
  const match = getClients().find((c) => {
    if (phone && c.phone && c.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')) return true
    if (email && c.email && c.email.toLowerCase() === email.toLowerCase()) return true
    return c.fullName.trim().toLowerCase() === name.toLowerCase()
  })
  if (match) {
    const patched = saveClient({
      ...match,
      email: email || match.email,
      phone: phone || match.phone,
    })
    return {
      id: patched.id,
      fullName: patched.fullName,
      email: patched.email,
      phone: patched.phone,
    }
  }

  const parts = name.split(/\s+/)
  const firstName = parts[0] || name
  const lastName = parts.slice(1).join(' ') || firstName
  const created = registerClient({
    firstName,
    lastName,
    email: email || `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}@schedule.local`,
    phone: phone || '0000000000',
    dateOfBirth: '',
    gender: 'prefer_not_to_say',
    branchId: input.branchId,
    branchName: input.branchName,
    address: '',
  })
  return {
    id: created.id,
    fullName: created.fullName,
    email: created.email,
    phone: created.phone,
  }
}

const SELECT_FIELDS = `
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
  booking_date,
  treatment_name,
  treatment_name_2,
  campaign_promo,
  promo_code,
  client_status,
  clinic,
  down_payment,
  staff_name,
  lead_source,
  client_phone,
  client_email,
  clients ( full_name ),
  branches ( name ),
  treatments ( name ),
  staff ( full_name )
`

export async function listAppointments(): Promise<Appointment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('appointments')
      .select(SELECT_FIELDS)
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

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const branch = getBranches().find((b) => b.id === input.branchId)
  if (!branch) throw new Error('Select a valid branch')

  const treatmentName = input.treatmentName.trim() || 'Consultation'
  const durationMinutes = 60
  const timeLabel = formatTimeLabel(input.timeLabel)
  const { startAt, endAt } = buildStartEnd(input.date, timeLabel, durationMinutes)

  const client = resolveScheduleClient({
    clientId: input.clientId,
    fullName: input.clientName,
    email: input.clientEmail,
    phone: input.clientPhone,
    branchId: branch.id,
    branchName: branch.name,
  })

  const appointment: Appointment = {
    id: `ap-${Date.now()}`,
    clientId: client.id,
    clientName: client.fullName,
    clientPhone: input.clientPhone?.trim() || client.phone,
    clientEmail: input.clientEmail?.trim() || client.email,
    branchId: branch.id,
    branchName: branch.name,
    treatmentId: input.treatmentId || '',
    treatmentName,
    treatmentName2: input.treatmentName2?.trim() || undefined,
    staffId: input.staffId,
    staffName: input.staffName?.trim() || undefined,
    startAt,
    endAt,
    durationMinutes,
    status: input.status ?? 'pending',
    clientStatus: input.clientStatus?.trim() || 'New',
    bookingDate: input.bookingDate || toDateKey(new Date()),
    clinic: input.clinic?.trim() || undefined,
    campaignPromo: input.campaignPromo?.trim() || undefined,
    promoCode: input.promoCode?.trim() || undefined,
    downPayment: input.downPayment ?? 0,
    leadSource: input.leadSource?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    price: input.downPayment ?? 0,
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        client_id: appointment.clientId,
        branch_id: appointment.branchId,
        treatment_id: input.treatmentId || null,
        staff_id: input.staffId || null,
        start_at: startAt,
        end_at: endAt,
        duration_minutes: durationMinutes,
        status: appointment.status,
        notes: appointment.notes ?? null,
        price: appointment.price,
        booking_date: appointment.bookingDate ?? null,
        treatment_name: appointment.treatmentName,
        treatment_name_2: appointment.treatmentName2 ?? null,
        campaign_promo: appointment.campaignPromo ?? null,
        promo_code: appointment.promoCode ?? null,
        client_status: appointment.clientStatus ?? null,
        clinic: appointment.clinic ?? null,
        down_payment: appointment.downPayment ?? 0,
        staff_name: appointment.staffName ?? null,
        lead_source: appointment.leadSource ?? null,
        client_phone: appointment.clientPhone ?? null,
        client_email: appointment.clientEmail ?? null,
      })
      .select(SELECT_FIELDS)
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
      .select(SELECT_FIELDS)
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

export function getBookedDateKeys(appointments: Appointment[]): Set<string> {
  const keys = new Set<string>()
  for (const a of appointments) {
    keys.add(toDateKey(new Date(a.startAt)))
  }
  return keys
}

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
  booking_date?: string | null
  treatment_name?: string | null
  treatment_name_2?: string | null
  campaign_promo?: string | null
  promo_code?: string | null
  client_status?: string | null
  clinic?: string | null
  down_payment?: number | null
  staff_name?: string | null
  lead_source?: string | null
  client_phone?: string | null
  client_email?: string | null
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
    clientPhone: row.client_phone ?? undefined,
    clientEmail: row.client_email ?? undefined,
    branchId: row.branch_id,
    branchName: branch?.name ?? 'Branch',
    treatmentId: row.treatment_id ?? '',
    treatmentName: row.treatment_name || treatment?.name || 'Treatment',
    treatmentName2: row.treatment_name_2 ?? undefined,
    staffId: row.staff_id ?? undefined,
    staffName: row.staff_name || staff?.full_name || undefined,
    roomId: row.room_id ?? undefined,
    startAt: row.start_at,
    endAt: row.end_at,
    durationMinutes: row.duration_minutes,
    status: row.status,
    clientStatus: row.client_status ?? undefined,
    bookingDate: row.booking_date ?? undefined,
    clinic: row.clinic ?? undefined,
    campaignPromo: row.campaign_promo ?? undefined,
    promoCode: row.promo_code ?? undefined,
    downPayment: row.down_payment != null ? Number(row.down_payment) : undefined,
    leadSource: row.lead_source ?? undefined,
    notes: row.notes ?? undefined,
    price: Number(row.price),
  }
}
