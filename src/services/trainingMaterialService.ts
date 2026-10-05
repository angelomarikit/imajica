import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { isUuid } from '@/utils/uuid'

const KEY = 'imajica_training_materials'
const ASSIGN_KEY = 'imajica_training_assignees'
const PROGRESS_KEY = 'imajica_training_progress'
const CHANGE = 'imajica:training-materials-changed'
const BUCKET = 'training-materials'
const MAX_BYTES = 50 * 1024 * 1024

export type TrainingAudience = 'all' | 'selected'
export type TrainingMaterialStatus = 'draft' | 'published' | 'archived'
export type TrainingProgressStatus = 'assigned' | 'in_progress' | 'completed'

export type TrainingMaterial = {
  id: string
  title: string
  description: string
  category: string
  fileName: string | null
  fileUrl: string | null
  fileMime: string | null
  fileSize: number | null
  audience: TrainingAudience
  status: TrainingMaterialStatus
  assigneeProfileIds: string[]
  createdBy?: string | null
  createdAt: string
  updatedAt: string
}

export type TrainingProgress = {
  id: string
  materialId: string
  profileId: string
  status: TrainingProgressStatus
  startedAt?: string | null
  completedAt?: string | null
  note?: string | null
  updatedAt: string
}

export type MyTrainingItem = TrainingMaterial & {
  progress: TrainingProgress | null
}

export const TRAINING_CATEGORIES = [
  'General',
  'Clinical',
  'Safety',
  'Customer service',
  'Systems / POS',
  'Compliance',
  'Onboarding',
  'Other',
] as const

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

export function subscribeTrainingMaterials(listener: () => void) {
  window.addEventListener(CHANGE, listener)
  return () => window.removeEventListener(CHANGE, listener)
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function readLocal(): TrainingMaterial[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TrainingMaterial[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(rows: TrainingMaterial[], silent = false) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 1000)))
  if (!silent) emit()
}

function readLocalAssignees(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(ASSIGN_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeLocalAssignees(map: Record<string, string[]>, silent = false) {
  localStorage.setItem(ASSIGN_KEY, JSON.stringify(map))
  if (!silent) emit()
}

function mapRow(
  row: {
    id: string
    title: string
    description: string | null
    category: string
    file_name: string | null
    file_url: string | null
    file_mime: string | null
    file_size: number | null
    audience: string
    status: string
    created_by: string | null
    created_at: string
    updated_at: string
  },
  assigneeProfileIds: string[],
): TrainingMaterial {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category || 'General',
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileMime: row.file_mime,
    fileSize: row.file_size,
    audience: (row.audience || 'all') as TrainingAudience,
    status: (row.status || 'draft') as TrainingMaterialStatus,
    assigneeProfileIds,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function formatBytes(n: number | null | undefined) {
  if (!n || n <= 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export { formatBytes }

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

async function uploadFile(materialId: string, file: File): Promise<{
  fileName: string
  fileUrl: string
  fileMime: string
  fileSize: number
}> {
  if (file.size > MAX_BYTES) throw new Error('File must be 50MB or smaller')
  const fileName = file.name
  const fileMime = file.type || 'application/octet-stream'
  const fileSize = file.size

  if (isSupabaseConfigured && supabase && isUuid(materialId)) {
    const path = `${materialId}/${Date.now()}-${safeFileName(fileName)}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: fileMime,
    })
    if (!error) {
      return {
        fileName,
        fileUrl: `storage:${BUCKET}/${path}`,
        fileMime,
        fileSize,
      }
    }
    if (!/bucket|not found|policy|row-level/i.test(error.message)) {
      throw new Error(error.message)
    }
  }

  return {
    fileName,
    fileUrl: await readFileAsDataUrl(file),
    fileMime,
    fileSize,
  }
}

async function replaceAssignees(materialId: string, profileIds: string[]) {
  const unique = [...new Set(profileIds.filter((id) => isUuid(id)))]
  const localMap = readLocalAssignees()
  localMap[materialId] = unique
  writeLocalAssignees(localMap, true)

  if (!isSupabaseConfigured || !supabase || !isUuid(materialId)) return unique

  await supabase.from('training_material_assignees').delete().eq('material_id', materialId)
  if (unique.length === 0) return unique

  const rows = unique.map((profile_id) => ({
    id: newId(),
    material_id: materialId,
    profile_id,
    assigned_at: new Date().toISOString(),
  }))
  const { error } = await supabase.from('training_material_assignees').insert(rows)
  if (error && !/does not exist|schema cache|relation|foreign key/i.test(error.message)) {
    throw new Error(error.message)
  }
  return unique
}

export async function listTrainingMaterials(): Promise<TrainingMaterial[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('training_materials')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500)
    if (!error && data) {
      const ids = data.map((r) => (r as { id: string }).id)
      let assignMap: Record<string, string[]> = {}
      if (ids.length) {
        const { data: assigns } = await supabase
          .from('training_material_assignees')
          .select('material_id, profile_id')
          .in('material_id', ids)
        for (const a of assigns || []) {
          const row = a as { material_id: string; profile_id: string }
          if (!assignMap[row.material_id]) assignMap[row.material_id] = []
          assignMap[row.material_id].push(row.profile_id)
        }
      }
      const mapped = (data as Parameters<typeof mapRow>[0][]).map((row) =>
        mapRow(row, assignMap[row.id] || []),
      )
      // Preserve local-only data URL files when DB stripped them
      const local = readLocal()
      for (const m of mapped) {
        const loc = local.find((l) => l.id === m.id)
        if (loc?.fileUrl?.startsWith('data:') && !m.fileUrl) {
          m.fileUrl = loc.fileUrl
          m.fileName = loc.fileName
          m.fileMime = loc.fileMime
          m.fileSize = loc.fileSize
        }
      }
      writeLocal(mapped, true)
      writeLocalAssignees(assignMap, true)
      return mapped
    }
  }

  const localAssign = readLocalAssignees()
  return readLocal()
    .map((m) => ({ ...m, assigneeProfileIds: localAssign[m.id] || m.assigneeProfileIds || [] }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function createTrainingMaterial(input: {
  title: string
  description?: string
  category?: string
  audience?: TrainingAudience
  status?: TrainingMaterialStatus
  assigneeProfileIds?: string[]
  file?: File | null
  createdBy?: string | null
}): Promise<TrainingMaterial> {
  if (!input.title.trim()) throw new Error('Title is required')
  const now = new Date().toISOString()
  const id = newId()
  let fileMeta = {
    fileName: null as string | null,
    fileUrl: null as string | null,
    fileMime: null as string | null,
    fileSize: null as number | null,
  }
  if (input.file) {
    const uploaded = await uploadFile(id, input.file)
    fileMeta = {
      fileName: uploaded.fileName,
      fileUrl: uploaded.fileUrl,
      fileMime: uploaded.fileMime,
      fileSize: uploaded.fileSize,
    }
  }

  const audience = input.audience || 'all'
  const assignees =
    audience === 'selected' ? [...new Set((input.assigneeProfileIds || []).filter(Boolean))] : []

  const row: TrainingMaterial = {
    id,
    title: input.title.trim(),
    description: (input.description || '').trim(),
    category: input.category || 'General',
    ...fileMeta,
    audience,
    status: input.status || 'draft',
    assigneeProfileIds: assignees,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  }

  if (isSupabaseConfigured && supabase && isUuid(row.id)) {
    const dbFileUrl = row.fileUrl?.startsWith('data:') ? null : row.fileUrl
    const payload = {
      id: row.id,
      title: row.title,
      description: row.description || null,
      category: row.category,
      file_name: row.fileName,
      file_url: dbFileUrl,
      file_mime: row.fileMime,
      file_size: row.fileSize,
      audience: row.audience,
      status: row.status,
      created_by: row.createdBy && isUuid(row.createdBy) ? row.createdBy : null,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    }
    const { data, error } = await supabase.from('training_materials').insert(payload).select('*').single()
    if (error) throw new Error(error.message)
    if (data) {
      await replaceAssignees(row.id, assignees)
      const mapped = mapRow(data as Parameters<typeof mapRow>[0], assignees)
      if (row.fileUrl?.startsWith('data:')) {
        mapped.fileUrl = row.fileUrl
        mapped.fileName = row.fileName
        mapped.fileMime = row.fileMime
        mapped.fileSize = row.fileSize
      }
      writeLocal([mapped, ...readLocal().filter((m) => m.id !== mapped.id)])
      return mapped
    }
  }

  await replaceAssignees(row.id, assignees)
  writeLocal([row, ...readLocal().filter((m) => m.id !== row.id)])
  return row
}

export async function updateTrainingMaterial(input: {
  id: string
  title?: string
  description?: string
  category?: string
  audience?: TrainingAudience
  status?: TrainingMaterialStatus
  assigneeProfileIds?: string[]
  file?: File | null
}): Promise<TrainingMaterial> {
  const all = await listTrainingMaterials()
  const found = all.find((m) => m.id === input.id) || readLocal().find((m) => m.id === input.id)
  if (!found) throw new Error('Training material not found')

  const now = new Date().toISOString()
  let next: TrainingMaterial = {
    ...found,
    title: input.title?.trim() ?? found.title,
    description: input.description !== undefined ? input.description.trim() : found.description,
    category: input.category ?? found.category,
    audience: input.audience ?? found.audience,
    status: input.status ?? found.status,
    updatedAt: now,
  }

  if (input.file) {
    const uploaded = await uploadFile(found.id, input.file)
    next = {
      ...next,
      fileName: uploaded.fileName,
      fileUrl: uploaded.fileUrl,
      fileMime: uploaded.fileMime,
      fileSize: uploaded.fileSize,
    }
  }

  if (next.audience === 'all') {
    next.assigneeProfileIds = []
  } else if (input.assigneeProfileIds) {
    next.assigneeProfileIds = [...new Set(input.assigneeProfileIds.filter(Boolean))]
  }

  if (isSupabaseConfigured && supabase && isUuid(next.id)) {
    const dbFileUrl = next.fileUrl?.startsWith('data:') ? null : next.fileUrl
    const { data, error } = await supabase
      .from('training_materials')
      .update({
        title: next.title,
        description: next.description || null,
        category: next.category,
        file_name: next.fileName,
        file_url: dbFileUrl,
        file_mime: next.fileMime,
        file_size: next.fileSize,
        audience: next.audience,
        status: next.status,
        updated_at: now,
      })
      .eq('id', next.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    if (data) {
      await replaceAssignees(next.id, next.assigneeProfileIds)
      const mapped = mapRow(data as Parameters<typeof mapRow>[0], next.assigneeProfileIds)
      if (next.fileUrl?.startsWith('data:')) {
        mapped.fileUrl = next.fileUrl
        mapped.fileName = next.fileName
        mapped.fileMime = next.fileMime
        mapped.fileSize = next.fileSize
      }
      writeLocal([mapped, ...readLocal().filter((m) => m.id !== mapped.id)])
      return mapped
    }
  }

  await replaceAssignees(next.id, next.assigneeProfileIds)
  writeLocal([next, ...readLocal().filter((m) => m.id !== next.id)])
  return next
}

export async function deleteTrainingMaterial(id: string): Promise<void> {
  const found = (await listTrainingMaterials()).find((m) => m.id === id) || readLocal().find((m) => m.id === id)

  if (isSupabaseConfigured && supabase && isUuid(id)) {
    // Remove storage objects under this material folder when possible
    if (found?.fileUrl?.startsWith(`storage:${BUCKET}/`)) {
      const path = found.fileUrl.replace(`storage:${BUCKET}/`, '')
      await supabase.storage.from(BUCKET).remove([path])
    }
    try {
      const { data: listed } = await supabase.storage.from(BUCKET).list(id)
      if (listed?.length) {
        await supabase.storage.from(BUCKET).remove(listed.map((f) => `${id}/${f.name}`))
      }
    } catch {
      // Storage cleanup is best-effort
    }

    const { error } = await supabase.from('training_materials').delete().eq('id', id)
    if (error && !/does not exist|schema cache|relation/i.test(error.message)) {
      throw new Error(error.message)
    }
  }

  writeLocal(readLocal().filter((m) => m.id !== id))
  const assignMap = readLocalAssignees()
  delete assignMap[id]
  writeLocalAssignees(assignMap, true)
  writeLocalProgress(
    readLocalProgress().filter((p) => p.materialId !== id),
    true,
  )
  emit()
}

export async function resolveTrainingFileUrl(fileUrl: string | null | undefined): Promise<string | null> {
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

export function audienceLabel(m: TrainingMaterial) {
  if (m.audience === 'all') return 'All employees'
  const n = m.assigneeProfileIds.length
  return n === 0 ? 'Selected (none yet)' : `${n} employee${n === 1 ? '' : 's'}`
}

function readLocalProgress(): TrainingProgress[] {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TrainingProgress[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalProgress(rows: TrainingProgress[], silent = false) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(rows.slice(0, 5000)))
  if (!silent) emit()
}

function mapProgress(row: {
  id: string
  material_id: string
  profile_id: string
  status: string
  started_at: string | null
  completed_at: string | null
  note: string | null
  updated_at: string
}): TrainingProgress {
  return {
    id: row.id,
    materialId: row.material_id,
    profileId: row.profile_id,
    status: (row.status || 'assigned') as TrainingProgressStatus,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    note: row.note,
    updatedAt: row.updated_at,
  }
}

export function isMaterialVisibleToEmployee(m: TrainingMaterial, profileId: string) {
  if (m.status !== 'published') return false
  if (m.audience === 'all') return true
  return m.assigneeProfileIds.includes(profileId)
}

export async function listMyTrainingMaterials(profileId: string): Promise<MyTrainingItem[]> {
  if (!profileId) return []
  const materials = (await listTrainingMaterials()).filter((m) =>
    isMaterialVisibleToEmployee(m, profileId),
  )
  const progress = await listProgressForProfile(profileId)
  const byMaterial = new Map(progress.map((p) => [p.materialId, p]))
  return materials.map((m) => ({
    ...m,
    progress: byMaterial.get(m.id) || null,
  }))
}

export async function listProgressForProfile(profileId: string): Promise<TrainingProgress[]> {
  if (isSupabaseConfigured && supabase && isUuid(profileId)) {
    const { data, error } = await supabase
      .from('training_material_progress')
      .select('*')
      .eq('profile_id', profileId)
    if (!error && data) {
      const mapped = (data as Parameters<typeof mapProgress>[0][]).map(mapProgress)
      const others = readLocalProgress().filter((p) => p.profileId !== profileId)
      writeLocalProgress([...others, ...mapped], true)
      return mapped
    }
  }
  return readLocalProgress().filter((p) => p.profileId === profileId)
}

export async function listProgressForMaterial(materialId: string): Promise<TrainingProgress[]> {
  if (isSupabaseConfigured && supabase && isUuid(materialId)) {
    const { data, error } = await supabase
      .from('training_material_progress')
      .select('*')
      .eq('material_id', materialId)
      .order('updated_at', { ascending: false })
    if (!error && data) {
      const mapped = (data as Parameters<typeof mapProgress>[0][]).map(mapProgress)
      const others = readLocalProgress().filter((p) => p.materialId !== materialId)
      writeLocalProgress([...others, ...mapped], true)
      return mapped
    }
  }
  return readLocalProgress().filter((p) => p.materialId === materialId)
}

export async function setTrainingProgress(input: {
  materialId: string
  profileId: string
  status: TrainingProgressStatus
  note?: string
}): Promise<TrainingProgress> {
  if (!input.profileId) throw new Error('Not signed in')
  const now = new Date().toISOString()
  const existing =
    (await listProgressForProfile(input.profileId)).find((p) => p.materialId === input.materialId) ||
    readLocalProgress().find(
      (p) => p.materialId === input.materialId && p.profileId === input.profileId,
    )

  const next: TrainingProgress = {
    id: existing?.id || newId(),
    materialId: input.materialId,
    profileId: input.profileId,
    status: input.status,
    startedAt:
      input.status === 'assigned'
        ? existing?.startedAt || null
        : existing?.startedAt || now,
    completedAt: input.status === 'completed' ? now : null,
    note: input.note?.trim() || existing?.note || null,
    updatedAt: now,
  }

  if (isSupabaseConfigured && supabase && isUuid(next.materialId) && isUuid(next.profileId)) {
    const payload = {
      id: isUuid(next.id) ? next.id : newId(),
      material_id: next.materialId,
      profile_id: next.profileId,
      status: next.status,
      started_at: next.startedAt,
      completed_at: next.completedAt,
      note: next.note,
      updated_at: now,
    }
    const { data, error } = await supabase
      .from('training_material_progress')
      .upsert(payload, { onConflict: 'material_id,profile_id' })
      .select('*')
      .single()
    if (error && !/does not exist|schema cache|relation/i.test(error.message)) {
      throw new Error(error.message)
    }
    if (data) {
      const mapped = mapProgress(data as Parameters<typeof mapProgress>[0])
      writeLocalProgress([
        mapped,
        ...readLocalProgress().filter(
          (p) => !(p.materialId === mapped.materialId && p.profileId === mapped.profileId),
        ),
      ])
      return mapped
    }
  }

  writeLocalProgress([
    next,
    ...readLocalProgress().filter(
      (p) => !(p.materialId === next.materialId && p.profileId === next.profileId),
    ),
  ])
  return next
}

export function progressStatusLabel(status: TrainingProgressStatus | null | undefined) {
  if (status === 'completed') return 'Completed'
  if (status === 'in_progress') return 'In progress'
  if (status === 'assigned') return 'Assigned'
  return 'Not started'
}

export function progressStatusVariant(
  status: TrainingProgressStatus | null | undefined,
): 'success' | 'warning' | 'info' | 'neutral' {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'warning'
  if (status === 'assigned') return 'info'
  return 'neutral'
}

export type TrainingProgressSummary = {
  completed: number
  inProgress: number
  assigned: number
  notStarted: number
  totalAudience: number
  rows: Array<{
    profileId: string
    fullName: string
    email: string
    status: TrainingProgressStatus | null
    completedAt?: string | null
    updatedAt?: string | null
  }>
}

/** Build HR-facing completion board for one material. */
export async function getTrainingProgressSummary(
  material: TrainingMaterial,
  people: Array<{ profileId?: string; id: string; fullName: string; email: string; status?: string }>,
): Promise<TrainingProgressSummary> {
  const progress = await listProgressForMaterial(material.id)
  const byProfile = new Map(progress.map((p) => [p.profileId, p]))

  const audiencePeople =
    material.audience === 'all'
      ? people.filter((p) => p.status !== 'inactive')
      : people.filter((p) => {
          const pid = p.profileId || p.id
          return material.assigneeProfileIds.includes(pid)
        })

  const rows = audiencePeople.map((p) => {
    const pid = p.profileId || p.id
    const prog = byProfile.get(pid) || null
    return {
      profileId: pid,
      fullName: p.fullName,
      email: p.email,
      status: prog?.status ?? null,
      completedAt: prog?.completedAt,
      updatedAt: prog?.updatedAt,
    }
  })

  return {
    completed: rows.filter((r) => r.status === 'completed').length,
    inProgress: rows.filter((r) => r.status === 'in_progress').length,
    assigned: rows.filter((r) => r.status === 'assigned').length,
    notStarted: rows.filter((r) => !r.status).length,
    totalAudience: rows.length,
    rows: rows.sort((a, b) => {
      const order = (s: TrainingProgressStatus | null) =>
        s === 'completed' ? 0 : s === 'in_progress' ? 1 : s === 'assigned' ? 2 : 3
      return order(a.status) - order(b.status) || a.fullName.localeCompare(b.fullName)
    }),
  }
}
