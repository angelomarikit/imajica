import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { getBranches } from '@/services/branchService'
import type { RecruitmentApplicant } from '@/services/recruitmentService'
import { isUuid } from '@/utils/uuid'

const KEY = 'imajica_new_hires'
const CHANGE = 'imajica:new-hires-changed'

export type NewHireStatus = 'onboarding' | 'ready' | 'cancelled'

export type NewHireRequirementId =
  | 'employment_contract'
  | 'government_ids'
  | 'sss_number'
  | 'pagibig_number'
  | 'philhealth_number'
  | 'tin'
  | 'bank_payroll'
  | 'emergency_contact'
  | 'medical_clearance'
  | 'nbi_clearance'
  | 'timeclock_biometrics'
  | 'deductions_benefits'
  | 'branch_assignment'
  | 'uniform_badge'
  | 'policies_signed'

export type NewHireRequirement = {
  id: NewHireRequirementId
  label: string
  group: 'documents' | 'benefits' | 'operations'
  hint: string
}

/** Fixed reminder checklist for every new hire (benefits + ops readiness). */
export const NEW_HIRE_REQUIREMENTS: NewHireRequirement[] = [
  {
    id: 'employment_contract',
    label: 'Employment contract signed',
    group: 'documents',
    hint: 'Signed offer / employment contract on file',
  },
  {
    id: 'government_ids',
    label: 'Government IDs on file',
    group: 'documents',
    hint: 'Valid ID copies (e.g. passport, driver license, UMID)',
  },
  {
    id: 'sss_number',
    label: 'SSS number',
    group: 'benefits',
    hint: 'SSS enrollment / number for statutory deductions',
  },
  {
    id: 'pagibig_number',
    label: 'Pag-IBIG number',
    group: 'benefits',
    hint: 'Pag-IBIG membership number',
  },
  {
    id: 'philhealth_number',
    label: 'PhilHealth number',
    group: 'benefits',
    hint: 'PhilHealth PIN for contributions',
  },
  {
    id: 'tin',
    label: 'TIN',
    group: 'benefits',
    hint: 'BIR TIN for tax withholding',
  },
  {
    id: 'bank_payroll',
    label: 'Bank account for payroll',
    group: 'benefits',
    hint: 'Payroll disbursement account details',
  },
  {
    id: 'emergency_contact',
    label: 'Emergency contact',
    group: 'documents',
    hint: 'Name and phone of emergency contact',
  },
  {
    id: 'medical_clearance',
    label: 'Medical clearance',
    group: 'documents',
    hint: 'Fit-to-work / medical certificate',
  },
  {
    id: 'nbi_clearance',
    label: 'NBI / police clearance',
    group: 'documents',
    hint: 'Background clearance document',
  },
  {
    id: 'timeclock_biometrics',
    label: 'Timeclock / biometrics enrolled',
    group: 'operations',
    hint: 'Can punch attendance at assigned clinic',
  },
  {
    id: 'deductions_benefits',
    label: 'Deductions & benefits rates set',
    group: 'benefits',
    hint: 'Recurring SSS / Pag-IBIG / PhilHealth / allowance in HR',
  },
  {
    id: 'branch_assignment',
    label: 'Clinic assignment confirmed',
    group: 'operations',
    hint: 'Home clinic / branch confirmed for scheduling',
  },
  {
    id: 'uniform_badge',
    label: 'Uniform / ID badge issued',
    group: 'operations',
    hint: 'Clinic uniform and staff ID ready',
  },
  {
    id: 'policies_signed',
    label: 'Company policies acknowledged',
    group: 'documents',
    hint: 'Handbook / confidentiality / clinic policies signed',
  },
]

export type ChecklistItemState = {
  done: boolean
  doneAt?: string | null
  note?: string | null
  /** Original file name for display */
  fileName?: string | null
  /** storage:new-hire-docs/{path} or local data URL fallback */
  fileUrl?: string | null
  fileMime?: string | null
  uploadedAt?: string | null
}

export type NewHireRecord = {
  id: string
  applicantId: string
  fullName: string
  email: string
  phone: string
  appliedRole: string
  branchId: string | null
  branchName: string
  hiredAt: string
  status: NewHireStatus
  checklist: Record<string, ChecklistItemState>
  notes?: string
  createdBy?: string | null
  createdAt: string
  updatedAt: string
}

const BUCKET = 'new-hire-docs'
const MAX_BYTES = 10 * 1024 * 1024

export function hasRequirementDocument(state?: ChecklistItemState | null) {
  return Boolean(state?.fileUrl)
}

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

export function subscribeNewHires(listener: () => void) {
  window.addEventListener(CHANGE, listener)
  return () => window.removeEventListener(CHANGE, listener)
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `nh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function branchName(id: string | null | undefined) {
  if (!id) return ''
  return getBranches().find((b) => b.id === id)?.name || ''
}

function emptyChecklist(): Record<string, ChecklistItemState> {
  const out: Record<string, ChecklistItemState> = {}
  for (const req of NEW_HIRE_REQUIREMENTS) {
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

function normalizeChecklist(raw: unknown): Record<string, ChecklistItemState> {
  const base = emptyChecklist()
  if (!raw || typeof raw !== 'object') return base
  const obj = raw as Record<string, Partial<ChecklistItemState> | boolean>
  for (const req of NEW_HIRE_REQUIREMENTS) {
    const v = obj[req.id]
    if (typeof v === 'boolean') {
      base[req.id] = {
        done: v,
        doneAt: v ? new Date().toISOString() : null,
        note: null,
        fileName: null,
        fileUrl: null,
        fileMime: null,
        uploadedAt: null,
      }
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

/** Strip bulky local data URLs before writing checklist to Supabase. */
function checklistForDb(checklist: Record<string, ChecklistItemState>) {
  const out: Record<string, ChecklistItemState> = {}
  for (const [key, item] of Object.entries(checklist)) {
    const url = item.fileUrl || null
    const isLocalData = Boolean(url && url.startsWith('data:'))
    out[key] = {
      ...item,
      fileUrl: isLocalData ? null : url,
      fileName: isLocalData ? item.fileName : item.fileName,
    }
  }
  return out
}

function readLocal(): NewHireRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as NewHireRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(rows: NewHireRecord[], silent = false) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 2000)))
  if (!silent) emit()
}

function mapRow(row: {
  id: string
  applicant_id: string
  full_name: string
  email: string | null
  phone: string | null
  applied_role: string
  branch_id: string | null
  hired_at: string
  status: string
  checklist: unknown
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}): NewHireRecord {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    fullName: row.full_name,
    email: row.email || '',
    phone: row.phone || '',
    appliedRole: row.applied_role,
    branchId: row.branch_id,
    branchName: branchName(row.branch_id),
    hiredAt: row.hired_at,
    status: (row.status || 'onboarding') as NewHireStatus,
    checklist: normalizeChecklist(row.checklist),
    notes: row.notes || undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function checklistProgress(hire: NewHireRecord) {
  const total = NEW_HIRE_REQUIREMENTS.length
  const done = NEW_HIRE_REQUIREMENTS.filter((r) => hire.checklist[r.id]?.done).length
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) }
}

export function pendingRequirements(hire: NewHireRecord) {
  return NEW_HIRE_REQUIREMENTS.filter((r) => !hire.checklist[r.id]?.done)
}

function deriveStatus(checklist: Record<string, ChecklistItemState>, current: NewHireStatus): NewHireStatus {
  if (current === 'cancelled') return 'cancelled'
  const allDone = NEW_HIRE_REQUIREMENTS.every((r) => checklist[r.id]?.done)
  return allDone ? 'ready' : 'onboarding'
}

export async function listNewHires(): Promise<NewHireRecord[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('new_hires')
      .select('*')
      .order('hired_at', { ascending: false })
      .limit(500)
    if (!error && data) {
      const mapped = (data as Parameters<typeof mapRow>[0][]).map(mapRow)
      writeLocal(mapped, true)
      return mapped
    }
  }
  return readLocal().sort((a, b) => b.hiredAt.localeCompare(a.hiredAt))
}

/** Called when recruitment marks an applicant as hired. */
export async function ensureNewHireFromApplicant(
  applicant: RecruitmentApplicant,
  createdBy?: string | null,
): Promise<NewHireRecord> {
  const existing =
    readLocal().find((h) => h.applicantId === applicant.id) ||
    (await listNewHires()).find((h) => h.applicantId === applicant.id)
  if (existing) return existing

  const now = new Date().toISOString()
  const row: NewHireRecord = {
    id: newId(),
    applicantId: applicant.id,
    fullName: applicant.fullName,
    email: applicant.email,
    phone: applicant.phone,
    appliedRole: applicant.appliedRole,
    branchId: applicant.branchId,
    branchName: applicant.branchName || branchName(applicant.branchId),
    hiredAt: now.slice(0, 10),
    status: 'onboarding',
    checklist: emptyChecklist(),
    createdBy: createdBy ?? applicant.createdBy ?? null,
    createdAt: now,
    updatedAt: now,
  }

  if (isSupabaseConfigured && supabase && isUuid(row.id) && isUuid(row.applicantId)) {
    const payload = {
      id: row.id,
      applicant_id: row.applicantId,
      full_name: row.fullName,
      email: row.email || null,
      phone: row.phone || null,
      applied_role: row.appliedRole,
      branch_id: row.branchId && isUuid(row.branchId) ? row.branchId : null,
      hired_at: row.hiredAt,
      status: row.status,
      checklist: row.checklist,
      created_by: row.createdBy && isUuid(row.createdBy) ? row.createdBy : null,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    }
    const { data, error } = await supabase
      .from('new_hires')
      .upsert(payload, { onConflict: 'applicant_id' })
      .select('*')
      .single()
    if (error) {
      // Table may not be pushed yet — still keep local so UI works
      if (!/does not exist|schema cache|relation/i.test(error.message)) {
        throw new Error(error.message)
      }
    } else if (data) {
      const mapped = mapRow(data as Parameters<typeof mapRow>[0])
      writeLocal([mapped, ...readLocal().filter((h) => h.applicantId !== mapped.applicantId)])
      return mapped
    }
  }

  writeLocal([row, ...readLocal().filter((h) => h.applicantId !== row.applicantId)])
  return row
}

export async function setNewHireRequirement(input: {
  id: string
  requirementId: NewHireRequirementId
  done: boolean
  note?: string
}): Promise<NewHireRecord> {
  const all = await listNewHires()
  const found = all.find((h) => h.id === input.id) || readLocal().find((h) => h.id === input.id)
  if (!found) throw new Error('New hire not found')

  const prev = found.checklist[input.requirementId] || emptyChecklist()[input.requirementId]
  if (input.done && !hasRequirementDocument(prev)) {
    throw new Error('Upload a document before marking this requirement complete')
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
  return persistChecklist(found, checklist, now)
}

async function persistChecklist(
  found: NewHireRecord,
  checklist: Record<string, ChecklistItemState>,
  now = new Date().toISOString(),
): Promise<NewHireRecord> {
  const status = deriveStatus(checklist, found.status)
  const next: NewHireRecord = {
    ...found,
    checklist,
    status,
    updatedAt: now,
  }

  if (isSupabaseConfigured && supabase && isUuid(next.id)) {
    const { data, error } = await supabase
      .from('new_hires')
      .update({
        checklist: checklistForDb(next.checklist),
        status: next.status,
        updated_at: now,
      })
      .eq('id', next.id)
      .select('*')
      .single()
    if (error && !/does not exist|schema cache|relation/i.test(error.message)) {
      throw new Error(error.message)
    }
    if (data) {
      const mapped = mapRow(data as Parameters<typeof mapRow>[0])
      // Keep any local-only data URLs that were not stored in DB
      for (const req of NEW_HIRE_REQUIREMENTS) {
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
      writeLocal([mapped, ...readLocal().filter((h) => h.id !== mapped.id)])
      return mapped
    }
  }

  writeLocal([next, ...readLocal().filter((h) => h.id !== next.id)])
  return next
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

export async function uploadNewHireDocument(input: {
  hireId: string
  requirementId: NewHireRequirementId
  file: File
}): Promise<NewHireRecord> {
  if (!input.file) throw new Error('Choose a file to upload')
  if (input.file.size > MAX_BYTES) throw new Error('File must be 10MB or smaller')

  const all = await listNewHires()
  const found = all.find((h) => h.id === input.hireId) || readLocal().find((h) => h.id === input.hireId)
  if (!found) throw new Error('New hire not found')

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

  if (!fileUrl) {
    fileUrl = await readFileAsDataUrl(input.file)
  }

  const checklist = {
    ...found.checklist,
    [input.requirementId]: {
      ...prev,
      fileName,
      fileUrl,
      fileMime,
      uploadedAt: now,
      // Uploading does not auto-complete; HR still checks after reviewing
      done: prev.done && Boolean(fileUrl),
      doneAt: prev.done && fileUrl ? prev.doneAt : null,
    },
  }
  return persistChecklist(found, checklist, now)
}

export async function resolveNewHireDocumentUrl(fileUrl: string | null | undefined): Promise<string | null> {
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

/** Sync any hired applicants missing from New Hires (e.g. hired before this feature). */
export async function syncHiredApplicantsIntoNewHires(
  applicants: RecruitmentApplicant[],
): Promise<void> {
  const hired = applicants.filter((a) => a.status === 'hired')
  for (const a of hired) {
    await ensureNewHireFromApplicant(a)
  }
}
