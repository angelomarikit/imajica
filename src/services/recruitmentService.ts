import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { getBranches } from '@/services/branchService'
import { ensureNewHireFromApplicant } from '@/services/newHireService'
import { isUuid } from '@/utils/uuid'

const KEY = 'imajica_recruitment_applicants'
const EVENTS_KEY = 'imajica_recruitment_stage_events'
const CHANGE = 'imajica:recruitment-changed'

export type ApplicantStatus =
  | 'applied'
  | 'screening'
  | 'initial_interview'
  | 'technical_interview'
  | 'final_interview'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn'

export const APPLICANT_STATUS_ORDER: ApplicantStatus[] = [
  'applied',
  'screening',
  'initial_interview',
  'technical_interview',
  'final_interview',
  'offer',
  'hired',
]

export const APPLICANT_STATUS_LABELS: Record<ApplicantStatus, string> = {
  applied: 'Applied',
  screening: 'Screening',
  initial_interview: 'Initial interview',
  technical_interview: 'Technical interview',
  final_interview: 'Final interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

export type RecruitmentApplicant = {
  id: string
  fullName: string
  email: string
  phone: string
  appliedRole: string
  branchId: string | null
  branchName: string
  status: ApplicantStatus
  currentStage: ApplicantStatus
  source?: string
  resumeUrl?: string
  notes?: string
  stageNotes?: string
  appliedAt: string
  createdBy?: string | null
  createdAt: string
  updatedAt: string
}

export type RecruitmentStageEvent = {
  id: string
  applicantId: string
  stage: ApplicantStatus
  status: ApplicantStatus
  note?: string
  scheduledAt?: string
  completedAt?: string
  createdBy?: string | null
  createdByName?: string
  createdAt: string
}

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

export function subscribeRecruitment(listener: () => void) {
  window.addEventListener(CHANGE, listener)
  return () => window.removeEventListener(CHANGE, listener)
}

function readApplicants(): RecruitmentApplicant[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecruitmentApplicant[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeApplicants(rows: RecruitmentApplicant[], silent = false) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 2000)))
  if (!silent) emit()
}

function readEvents(): RecruitmentStageEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecruitmentStageEvent[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeEvents(rows: RecruitmentStageEvent[], silent = false) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(rows.slice(0, 5000)))
  if (!silent) emit()
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function branchName(id: string | null | undefined) {
  if (!id) return ''
  return getBranches().find((b) => b.id === id)?.name || ''
}

function mapApplicant(row: {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  applied_role: string
  branch_id: string | null
  status: string
  current_stage: string | null
  source: string | null
  resume_url: string | null
  notes: string | null
  stage_notes: string | null
  applied_at: string
  created_by: string | null
  created_at: string
  updated_at: string
}): RecruitmentApplicant {
  const status = (row.status || 'applied') as ApplicantStatus
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email || '',
    phone: row.phone || '',
    appliedRole: row.applied_role,
    branchId: row.branch_id,
    branchName: branchName(row.branch_id),
    status,
    currentStage: ((row.current_stage || status) as ApplicantStatus) || status,
    source: row.source || undefined,
    resumeUrl: row.resume_url || undefined,
    notes: row.notes || undefined,
    stageNotes: row.stage_notes || undefined,
    appliedAt: row.applied_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapEvent(row: {
  id: string
  applicant_id: string
  stage: string
  status: string
  note: string | null
  scheduled_at: string | null
  completed_at: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: string
}): RecruitmentStageEvent {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    stage: row.stage as ApplicantStatus,
    status: row.status as ApplicantStatus,
    note: row.note || undefined,
    scheduledAt: row.scheduled_at || undefined,
    completedAt: row.completed_at || undefined,
    createdBy: row.created_by,
    createdByName: row.created_by_name || undefined,
    createdAt: row.created_at,
  }
}

export function statusVariant(
  status: ApplicantStatus,
): 'info' | 'warning' | 'gold' | 'success' | 'danger' | 'neutral' {
  if (status === 'hired') return 'success'
  if (status === 'offer') return 'gold'
  if (status === 'rejected' || status === 'withdrawn') return 'danger'
  if (status === 'technical_interview' || status === 'final_interview') return 'warning'
  if (status === 'initial_interview' || status === 'screening') return 'info'
  return 'neutral'
}

export async function listApplicants(): Promise<RecruitmentApplicant[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('recruitment_applicants')
      .select('*')
      .order('applied_at', { ascending: false })
      .limit(500)
    if (!error && data) {
      const mapped = (data as Parameters<typeof mapApplicant>[0][]).map(mapApplicant)
      writeApplicants(mapped, true)
      return mapped
    }
  }
  return readApplicants().sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
}

export async function listStageEvents(applicantId: string): Promise<RecruitmentStageEvent[]> {
  if (isSupabaseConfigured && supabase && isUuid(applicantId)) {
    const { data, error } = await supabase
      .from('recruitment_stage_events')
      .select('*')
      .eq('applicant_id', applicantId)
      .order('created_at', { ascending: true })
    if (!error && data) {
      const mapped = (data as Parameters<typeof mapEvent>[0][]).map(mapEvent)
      const others = readEvents().filter((e) => e.applicantId !== applicantId)
      writeEvents([...others, ...mapped], true)
      return mapped
    }
  }
  return readEvents()
    .filter((e) => e.applicantId === applicantId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

async function persistEvent(event: RecruitmentStageEvent): Promise<void> {
  if (isSupabaseConfigured && supabase && isUuid(event.id) && isUuid(event.applicantId)) {
    const payload = {
      id: event.id,
      applicant_id: event.applicantId,
      stage: event.stage,
      status: event.status,
      note: event.note ?? null,
      scheduled_at: event.scheduledAt ?? null,
      completed_at: event.completedAt ?? null,
      created_by: event.createdBy && isUuid(event.createdBy) ? event.createdBy : null,
      created_by_name: event.createdByName ?? null,
      created_at: event.createdAt,
    }
    const { error } = await supabase.from('recruitment_stage_events').upsert(payload)
    if (error && !/does not exist|schema cache/i.test(error.message)) {
      throw new Error(error.message)
    }
  }
  const all = readEvents().filter((e) => e.id !== event.id)
  writeEvents([...all, event], true)
}

export async function createApplicant(input: {
  fullName: string
  email?: string
  phone?: string
  appliedRole: string
  branchId?: string | null
  source?: string
  notes?: string
  createdBy?: string | null
  createdByName?: string
}): Promise<RecruitmentApplicant> {
  const now = new Date().toISOString()
  const appliedAt = now.slice(0, 10)
  const row: RecruitmentApplicant = {
    id: newId(),
    fullName: input.fullName.trim(),
    email: (input.email || '').trim(),
    phone: (input.phone || '').trim(),
    appliedRole: input.appliedRole.trim(),
    branchId: input.branchId || null,
    branchName: branchName(input.branchId),
    status: 'applied',
    currentStage: 'applied',
    source: input.source?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    appliedAt,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  }

  if (isSupabaseConfigured && supabase && isUuid(row.id)) {
    const payload = {
      id: row.id,
      full_name: row.fullName,
      email: row.email || null,
      phone: row.phone || null,
      applied_role: row.appliedRole,
      branch_id: row.branchId && isUuid(row.branchId) ? row.branchId : null,
      status: row.status,
      current_stage: row.currentStage,
      source: row.source ?? null,
      notes: row.notes ?? null,
      applied_at: row.appliedAt,
      created_by: row.createdBy && isUuid(row.createdBy) ? row.createdBy : null,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    }
    const { data, error } = await supabase.from('recruitment_applicants').insert(payload).select('*').single()
    if (error) throw new Error(error.message)
    if (data) {
      const mapped = mapApplicant(data as Parameters<typeof mapApplicant>[0])
      writeApplicants([mapped, ...readApplicants().filter((a) => a.id !== mapped.id)])
      await persistEvent({
        id: newId(),
        applicantId: mapped.id,
        stage: 'applied',
        status: 'applied',
        note: 'Applicant added to pipeline',
        createdBy: input.createdBy,
        createdByName: input.createdByName,
        createdAt: now,
        completedAt: now,
      })
      emit()
      return mapped
    }
  }

  writeApplicants([row, ...readApplicants().filter((a) => a.id !== row.id)])
  await persistEvent({
    id: newId(),
    applicantId: row.id,
    stage: 'applied',
    status: 'applied',
    note: 'Applicant added to pipeline',
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: now,
    completedAt: now,
  })
  emit()
  return row
}

export async function updateApplicantStatus(input: {
  id: string
  status: ApplicantStatus
  note?: string
  scheduledAt?: string
  updatedBy?: string | null
  updatedByName?: string
}): Promise<RecruitmentApplicant> {
  const all = await listApplicants()
  const found = all.find((a) => a.id === input.id) || readApplicants().find((a) => a.id === input.id)
  if (!found) throw new Error('Applicant not found')

  const now = new Date().toISOString()
  const next: RecruitmentApplicant = {
    ...found,
    status: input.status,
    currentStage: input.status,
    stageNotes: input.note?.trim() || found.stageNotes,
    updatedAt: now,
  }

  if (isSupabaseConfigured && supabase && isUuid(next.id)) {
    const { data, error } = await supabase
      .from('recruitment_applicants')
      .update({
        status: next.status,
        current_stage: next.currentStage,
        stage_notes: next.stageNotes ?? null,
        updated_at: now,
      })
      .eq('id', next.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    if (data) {
      const mapped = mapApplicant(data as Parameters<typeof mapApplicant>[0])
      writeApplicants([mapped, ...readApplicants().filter((a) => a.id !== mapped.id)], true)
      await persistEvent({
        id: newId(),
        applicantId: mapped.id,
        stage: input.status,
        status: input.status,
        note: input.note?.trim() || `Moved to ${APPLICANT_STATUS_LABELS[input.status]}`,
        scheduledAt: input.scheduledAt,
        completedAt: now,
        createdBy: input.updatedBy,
        createdByName: input.updatedByName,
        createdAt: now,
      })
      if (input.status === 'hired') {
        await ensureNewHireFromApplicant(mapped, input.updatedBy)
      }
      emit()
      return mapped
    }
  }

  writeApplicants([next, ...readApplicants().filter((a) => a.id !== next.id)], true)
  await persistEvent({
    id: newId(),
    applicantId: next.id,
    stage: input.status,
    status: input.status,
    note: input.note?.trim() || `Moved to ${APPLICANT_STATUS_LABELS[input.status]}`,
    scheduledAt: input.scheduledAt,
    completedAt: now,
    createdBy: input.updatedBy,
    createdByName: input.updatedByName,
    createdAt: now,
  })
  if (input.status === 'hired') {
    await ensureNewHireFromApplicant(next, input.updatedBy)
  }
  emit()
  return next
}

export function processStepsFor(status: ApplicantStatus): {
  id: ApplicantStatus
  label: string
  state: 'done' | 'current' | 'upcoming' | 'closed'
}[] {
  if (status === 'rejected' || status === 'withdrawn') {
    return APPLICANT_STATUS_ORDER.map((id) => ({
      id,
      label: APPLICANT_STATUS_LABELS[id],
      state: 'closed' as const,
    }))
  }
  const idx = APPLICANT_STATUS_ORDER.indexOf(status)
  return APPLICANT_STATUS_ORDER.map((id, i) => ({
    id,
    label: APPLICANT_STATUS_LABELS[id],
    state: i < idx ? 'done' : i === idx ? 'current' : 'upcoming',
  }))
}
