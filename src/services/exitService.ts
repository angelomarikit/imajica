import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { getBranches } from '@/services/branchService'
import { isUuid } from '@/utils/uuid'

const KEY = 'imajica_employee_exits'
const CHANGE = 'imajica:employee-exits-changed'
const BUCKET = 'exit-docs'
const MAX_BYTES = 10 * 1024 * 1024

export type ExitStatus = 'in_progress' | 'cleared' | 'cancelled'

export type ExitRequirementId =
  | 'resignation_letter'
  | 'exit_interview'
  | 'access_revoked'
  | 'keys_cards_returned'
  | 'id_uniform_returned'
  | 'equipment_returned'
  | 'schedule_handover'
  | 'cases_docs_handover'
  | 'final_pay'
  | 'coe_clearance'
  | 'gov_contributions_note'
  | 'property_inventory'
  | 'knowledge_transfer'
  | 'exit_notes_filed'

export type ExitRequirement = {
  id: ExitRequirementId
  label: string
  group: 'interview' | 'clearance' | 'pay_docs'
  hint: string
  requiresDocument: boolean
}

export const EXIT_REQUIREMENTS: ExitRequirement[] = [
  {
    id: 'resignation_letter',
    label: 'Resignation letter received',
    group: 'interview',
    hint: 'Signed resignation letter / email on file',
    requiresDocument: true,
  },
  {
    id: 'exit_interview',
    label: 'Exit interview completed',
    group: 'interview',
    hint: 'HR conducted exit interview and saved answers below',
    requiresDocument: false,
  },
  {
    id: 'exit_notes_filed',
    label: 'Exit interview notes filed',
    group: 'interview',
    hint: 'Interview summary saved for HR records',
    requiresDocument: false,
  },
  {
    id: 'access_revoked',
    label: 'System / account access revoked',
    group: 'clearance',
    hint: 'Email, app login, POS, and shared drives disabled',
    requiresDocument: false,
  },
  {
    id: 'keys_cards_returned',
    label: 'Keys / access cards returned',
    group: 'clearance',
    hint: 'Clinic keys, RFID, locker keys turned in',
    requiresDocument: false,
  },
  {
    id: 'id_uniform_returned',
    label: 'ID badge / uniform returned',
    group: 'clearance',
    hint: 'Staff ID and clinic uniform returned',
    requiresDocument: false,
  },
  {
    id: 'equipment_returned',
    label: 'Equipment / devices returned',
    group: 'clearance',
    hint: 'Laptop, phone, tools, or clinic devices returned',
    requiresDocument: true,
  },
  {
    id: 'schedule_handover',
    label: 'Client / schedule handover',
    group: 'clearance',
    hint: 'Upcoming appointments reassigned',
    requiresDocument: false,
  },
  {
    id: 'cases_docs_handover',
    label: 'Pending cases / docs turned over',
    group: 'clearance',
    hint: 'Charts, forms, and open tasks handed to successor',
    requiresDocument: false,
  },
  {
    id: 'knowledge_transfer',
    label: 'Knowledge transfer completed',
    group: 'clearance',
    hint: 'Processes and passwords (where allowed) transferred',
    requiresDocument: false,
  },
  {
    id: 'property_inventory',
    label: 'Company property inventory signed',
    group: 'clearance',
    hint: 'Signed inventory / clearance form',
    requiresDocument: true,
  },
  {
    id: 'final_pay',
    label: 'Final pay / last payslip prepared',
    group: 'pay_docs',
    hint: 'Last salary, leave conversions, and deductions computed',
    requiresDocument: true,
  },
  {
    id: 'coe_clearance',
    label: 'COE / clearance certificate prepared',
    group: 'pay_docs',
    hint: 'Certificate of employment and clearance ready',
    requiresDocument: true,
  },
  {
    id: 'gov_contributions_note',
    label: 'Gov contributions / final remittance noted',
    group: 'pay_docs',
    hint: 'SSS / Pag-IBIG / PhilHealth exit remittance noted',
    requiresDocument: false,
  },
]

export type ExitChecklistItem = {
  done: boolean
  doneAt?: string | null
  note?: string | null
  fileName?: string | null
  fileUrl?: string | null
  fileMime?: string | null
  uploadedAt?: string | null
}

export type ExitInterview = {
  conductedAt?: string
  interviewerName?: string
  reasonForLeaving?: string
  whatWentWell?: string
  whatCouldImprove?: string
  wouldRecommend?: 'yes' | 'no' | 'maybe' | ''
  rehireEligible?: 'yes' | 'no' | 'maybe' | ''
  additionalNotes?: string
}

export type EmployeeExitRecord = {
  id: string
  profileId: string | null
  staffId: string | null
  fullName: string
  email: string
  phone: string
  jobTitle: string
  branchId: string | null
  branchName: string
  resignationDate: string
  lastWorkingDay: string
  reason: string
  reasonNotes: string
  status: ExitStatus
  exitInterview: ExitInterview
  checklist: Record<string, ExitChecklistItem>
  notes?: string
  createdBy?: string | null
  createdAt: string
  updatedAt: string
}

export const EXIT_REASON_OPTIONS = [
  'Better opportunity',
  'Relocation',
  'Health / personal',
  'Career change',
  'Compensation',
  'Work schedule',
  'Management / culture',
  'End of contract',
  'Termination',
  'Other',
] as const

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

export function subscribeExits(listener: () => void) {
  window.addEventListener(CHANGE, listener)
  return () => window.removeEventListener(CHANGE, listener)
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `ex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function branchName(id: string | null | undefined) {
  if (!id) return ''
  return getBranches().find((b) => b.id === id)?.name || ''
}

function emptyChecklist(): Record<string, ExitChecklistItem> {
  const out: Record<string, ExitChecklistItem> = {}
  for (const req of EXIT_REQUIREMENTS) {
    out[req.id] = {
      done: false,
      doneAt: null,
      note: null,
      fileName: null,
      fileUrl: null,
      fileMime: null,
      uploadedAt: null,
    }
  }
  return out
}

function emptyInterview(): ExitInterview {
  return {
    conductedAt: '',
    interviewerName: '',
    reasonForLeaving: '',
    whatWentWell: '',
    whatCouldImprove: '',
    wouldRecommend: '',
    rehireEligible: '',
    additionalNotes: '',
  }
}

function normalizeChecklist(raw: unknown): Record<string, ExitChecklistItem> {
  const base = emptyChecklist()
  if (!raw || typeof raw !== 'object') return base
  const obj = raw as Record<string, Partial<ExitChecklistItem> | boolean>
  for (const req of EXIT_REQUIREMENTS) {
    const v = obj[req.id]
    if (typeof v === 'boolean') {
      base[req.id] = { ...base[req.id], done: v, doneAt: v ? new Date().toISOString() : null }
    } else if (v && typeof v === 'object') {
      base[req.id] = {
        done: Boolean(v.done),
        doneAt: v.doneAt ?? null,
        note: v.note ?? null,
        fileName: v.fileName ?? null,
        fileUrl: v.fileUrl ?? null,
        fileMime: v.fileMime ?? null,
        uploadedAt: v.uploadedAt ?? null,
      }
    }
  }
  return base
}

function normalizeInterview(raw: unknown): ExitInterview {
  const base = emptyInterview()
  if (!raw || typeof raw !== 'object') return base
  return { ...base, ...(raw as ExitInterview) }
}

function checklistForDb(checklist: Record<string, ExitChecklistItem>) {
  const out: Record<string, ExitChecklistItem> = {}
  for (const [key, item] of Object.entries(checklist)) {
    const url = item.fileUrl || null
    const isLocalData = Boolean(url && url.startsWith('data:'))
    out[key] = { ...item, fileUrl: isLocalData ? null : url }
  }
  return out
}

function readLocal(): EmployeeExitRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as EmployeeExitRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(rows: EmployeeExitRecord[], silent = false) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 2000)))
  if (!silent) emit()
}

function mapRow(row: {
  id: string
  profile_id: string | null
  staff_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  branch_id: string | null
  resignation_date: string
  last_working_day: string | null
  reason: string | null
  reason_notes: string | null
  status: string
  exit_interview: unknown
  checklist: unknown
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}): EmployeeExitRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    staffId: row.staff_id,
    fullName: row.full_name,
    email: row.email || '',
    phone: row.phone || '',
    jobTitle: row.job_title || '',
    branchId: row.branch_id,
    branchName: branchName(row.branch_id),
    resignationDate: row.resignation_date,
    lastWorkingDay: row.last_working_day || '',
    reason: row.reason || '',
    reasonNotes: row.reason_notes || '',
    status: (row.status || 'in_progress') as ExitStatus,
    exitInterview: normalizeInterview(row.exit_interview),
    checklist: normalizeChecklist(row.checklist),
    notes: row.notes || undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function hasExitDocument(state?: ExitChecklistItem | null) {
  return Boolean(state?.fileUrl)
}

export function exitChecklistProgress(exit: EmployeeExitRecord) {
  const total = EXIT_REQUIREMENTS.length
  const done = EXIT_REQUIREMENTS.filter((r) => exit.checklist[r.id]?.done).length
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) }
}

export function pendingExitRequirements(exit: EmployeeExitRecord) {
  return EXIT_REQUIREMENTS.filter((r) => !exit.checklist[r.id]?.done)
}

export function isExitInterviewComplete(interview: ExitInterview) {
  return Boolean(
    interview.conductedAt &&
      interview.interviewerName?.trim() &&
      interview.reasonForLeaving?.trim() &&
      interview.rehireEligible,
  )
}

function deriveStatus(
  checklist: Record<string, ExitChecklistItem>,
  current: ExitStatus,
): ExitStatus {
  if (current === 'cancelled') return 'cancelled'
  const allDone = EXIT_REQUIREMENTS.every((r) => checklist[r.id]?.done)
  return allDone ? 'cleared' : 'in_progress'
}

function mergeLocalDataUrls(mapped: EmployeeExitRecord, next: EmployeeExitRecord) {
  for (const req of EXIT_REQUIREMENTS) {
    const localUrl = next.checklist[req.id]?.fileUrl
    if (localUrl?.startsWith('data:') && !mapped.checklist[req.id]?.fileUrl) {
      mapped.checklist[req.id] = {
        ...mapped.checklist[req.id],
        fileUrl: localUrl,
        fileName: next.checklist[req.id]?.fileName ?? mapped.checklist[req.id]?.fileName,
        fileMime: next.checklist[req.id]?.fileMime ?? mapped.checklist[req.id]?.fileMime,
        uploadedAt: next.checklist[req.id]?.uploadedAt ?? mapped.checklist[req.id]?.uploadedAt,
      }
    }
  }
  return mapped
}

async function resolveStaffTableId(
  profileId: string | null | undefined,
  candidateStaffId: string | null | undefined,
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) {
    // Offline / local only — do not pretend profile ids are staff ids
    if (candidateStaffId && isUuid(candidateStaffId) && candidateStaffId !== profileId) {
      return candidateStaffId
    }
    return null
  }

  if (candidateStaffId && isUuid(candidateStaffId)) {
    const { data } = await supabase.from('staff').select('id').eq('id', candidateStaffId).maybeSingle()
    if ((data as { id?: string } | null)?.id) return (data as { id: string }).id
  }

  if (profileId && isUuid(profileId)) {
    const { data } = await supabase
      .from('staff')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle()
    if ((data as { id?: string } | null)?.id) return (data as { id: string }).id
  }

  return null
}

async function resolveProfileId(profileId: string | null | undefined): Promise<string | null> {
  if (!profileId || !isUuid(profileId)) return null
  if (!isSupabaseConfigured || !supabase) return profileId
  const { data } = await supabase.from('profiles').select('id').eq('id', profileId).maybeSingle()
  return (data as { id?: string } | null)?.id ?? null
}

async function persistExit(next: EmployeeExitRecord): Promise<EmployeeExitRecord> {
  const [safeProfileId, safeStaffId] = await Promise.all([
    resolveProfileId(next.profileId),
    resolveStaffTableId(next.profileId, next.staffId),
  ])
  const toSave: EmployeeExitRecord = {
    ...next,
    profileId: safeProfileId,
    staffId: safeStaffId,
  }

  if (isSupabaseConfigured && supabase && isUuid(toSave.id)) {
    const payload = {
      id: toSave.id,
      profile_id: toSave.profileId,
      staff_id: toSave.staffId,
      full_name: toSave.fullName,
      email: toSave.email || null,
      phone: toSave.phone || null,
      job_title: toSave.jobTitle || null,
      branch_id: toSave.branchId && isUuid(toSave.branchId) ? toSave.branchId : null,
      resignation_date: toSave.resignationDate,
      last_working_day: toSave.lastWorkingDay || null,
      reason: toSave.reason || null,
      reason_notes: toSave.reasonNotes || null,
      status: toSave.status,
      exit_interview: toSave.exitInterview,
      checklist: checklistForDb(toSave.checklist),
      notes: toSave.notes ?? null,
      created_by: toSave.createdBy && isUuid(toSave.createdBy) ? toSave.createdBy : null,
      created_at: toSave.createdAt,
      updated_at: toSave.updatedAt,
    }
    const { data, error } = await supabase.from('employee_exits').upsert(payload).select('*').single()
    if (error && !/does not exist|schema cache|relation/i.test(error.message)) {
      throw new Error(error.message)
    }
    if (data) {
      const mapped = mergeLocalDataUrls(mapRow(data as Parameters<typeof mapRow>[0]), toSave)
      writeLocal([mapped, ...readLocal().filter((e) => e.id !== mapped.id)])
      return mapped
    }
  }
  writeLocal([toSave, ...readLocal().filter((e) => e.id !== toSave.id)])
  return toSave
}

export async function listExits(): Promise<EmployeeExitRecord[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('employee_exits')
      .select('*')
      .order('resignation_date', { ascending: false })
      .limit(500)
    if (!error && data) {
      const mapped = (data as Parameters<typeof mapRow>[0][]).map(mapRow)
      writeLocal(mapped, true)
      return mapped
    }
  }
  return readLocal().sort((a, b) => b.resignationDate.localeCompare(a.resignationDate))
}

export async function createExit(input: {
  profileId?: string | null
  staffId?: string | null
  fullName: string
  email?: string
  phone?: string
  jobTitle?: string
  branchId?: string | null
  resignationDate: string
  lastWorkingDay?: string
  reason?: string
  reasonNotes?: string
  createdBy?: string | null
}): Promise<EmployeeExitRecord> {
  if (!input.fullName.trim()) throw new Error('Employee name is required')
  const now = new Date().toISOString()
  const row: EmployeeExitRecord = {
    id: newId(),
    profileId: input.profileId || null,
    staffId: input.staffId || null,
    fullName: input.fullName.trim(),
    email: (input.email || '').trim(),
    phone: (input.phone || '').trim(),
    jobTitle: (input.jobTitle || '').trim(),
    branchId: input.branchId || null,
    branchName: branchName(input.branchId),
    resignationDate: input.resignationDate || now.slice(0, 10),
    lastWorkingDay: input.lastWorkingDay || '',
    reason: input.reason || '',
    reasonNotes: input.reasonNotes || '',
    status: 'in_progress',
    exitInterview: emptyInterview(),
    checklist: emptyChecklist(),
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  }
  return persistExit(row)
}

export async function updateExitDetails(
  id: string,
  patch: Partial<
    Pick<
      EmployeeExitRecord,
      'resignationDate' | 'lastWorkingDay' | 'reason' | 'reasonNotes' | 'notes' | 'status'
    >
  >,
): Promise<EmployeeExitRecord> {
  const all = await listExits()
  const found = all.find((e) => e.id === id) || readLocal().find((e) => e.id === id)
  if (!found) throw new Error('Exit record not found')
  const now = new Date().toISOString()
  return persistExit({ ...found, ...patch, updatedAt: now })
}

export async function saveExitInterview(
  id: string,
  interview: ExitInterview,
): Promise<EmployeeExitRecord> {
  const all = await listExits()
  const found = all.find((e) => e.id === id) || readLocal().find((e) => e.id === id)
  if (!found) throw new Error('Exit record not found')
  const now = new Date().toISOString()
  const checklist = { ...found.checklist }
  if (isExitInterviewComplete(interview)) {
    checklist.exit_interview = {
      ...checklist.exit_interview,
      done: true,
      doneAt: now,
    }
    checklist.exit_notes_filed = {
      ...checklist.exit_notes_filed,
      done: true,
      doneAt: now,
    }
  }
  const status = deriveStatus(checklist, found.status)
  return persistExit({
    ...found,
    exitInterview: interview,
    checklist,
    status,
    updatedAt: now,
  })
}

export async function setExitRequirement(input: {
  id: string
  requirementId: ExitRequirementId
  done: boolean
  note?: string
}): Promise<EmployeeExitRecord> {
  const all = await listExits()
  const found = all.find((e) => e.id === input.id) || readLocal().find((e) => e.id === input.id)
  if (!found) throw new Error('Exit record not found')

  const req = EXIT_REQUIREMENTS.find((r) => r.id === input.requirementId)
  const prev = found.checklist[input.requirementId] || emptyChecklist()[input.requirementId]

  if (input.requirementId === 'exit_interview' || input.requirementId === 'exit_notes_filed') {
    if (input.done && !isExitInterviewComplete(found.exitInterview)) {
      throw new Error('Complete the exit interview form first')
    }
  } else if (input.done && req?.requiresDocument && !hasExitDocument(prev)) {
    throw new Error('Upload a document before marking this item complete')
  }

  const now = new Date().toISOString()
  const checklist = {
    ...found.checklist,
    [input.requirementId]: {
      ...prev,
      done: input.done,
      doneAt: input.done ? now : null,
      note: input.note?.trim() || prev.note || null,
    },
  }
  const status = deriveStatus(checklist, found.status)
  return persistExit({ ...found, checklist, status, updatedAt: now })
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export async function uploadExitDocument(input: {
  exitId: string
  requirementId: ExitRequirementId
  file: File
}): Promise<EmployeeExitRecord> {
  if (!input.file) throw new Error('Choose a file to upload')
  if (input.file.size > MAX_BYTES) throw new Error('File must be 10MB or smaller')

  const all = await listExits()
  const found = all.find((e) => e.id === input.exitId) || readLocal().find((e) => e.id === input.exitId)
  if (!found) throw new Error('Exit record not found')

  const now = new Date().toISOString()
  const prev = found.checklist[input.requirementId] || emptyChecklist()[input.requirementId]
  let fileUrl: string | null = null
  const fileName = input.file.name
  const fileMime = input.file.type || 'application/octet-stream'

  if (isSupabaseConfigured && supabase && isUuid(found.id)) {
    const path = `${found.id}/${input.requirementId}/${Date.now()}-${safeFileName(fileName)}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, input.file, {
      cacheControl: '3600',
      upsert: true,
      contentType: fileMime,
    })
    if (!error) {
      fileUrl = `storage:${BUCKET}/${path}`
    } else if (!/bucket|not found|policy|row-level/i.test(error.message)) {
      throw new Error(error.message)
    }
  }

  if (!fileUrl) fileUrl = await readFileAsDataUrl(input.file)

  const checklist = {
    ...found.checklist,
    [input.requirementId]: {
      ...prev,
      fileName,
      fileUrl,
      fileMime,
      uploadedAt: now,
      done: prev.done && Boolean(fileUrl),
      doneAt: prev.done && fileUrl ? prev.doneAt : null,
    },
  }
  return persistExit({ ...found, checklist, updatedAt: now })
}

export async function resolveExitDocumentUrl(fileUrl: string | null | undefined): Promise<string | null> {
  if (!fileUrl) return null
  if (fileUrl.startsWith('data:') || fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl
  }
  if (fileUrl.startsWith(`storage:${BUCKET}/`) && isSupabaseConfigured && supabase) {
    const path = fileUrl.replace(`storage:${BUCKET}/`, '')
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
    if (error) throw new Error(error.message)
    return data.signedUrl
  }
  return fileUrl
}
