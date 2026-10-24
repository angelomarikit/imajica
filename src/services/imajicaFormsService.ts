import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formPdfUrl } from '@/constants/imajicaFormTemplates'
import type { FormTemplateDef } from '@/constants/imajicaFormTemplates'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { isUuid } from '@/utils/uuid'

const LEGACY_STORAGE_KEY = 'imajica_generated_forms'
const SIG_BUCKET = 'form-signatures'
const CHANGE_EVENT = 'imajica:forms-changed'
/** Keep session list small — full payloads live in Supabase. */
const MAX_MEMORY_FORMS = 80

export type GeneratedFormRecord = {
  id: string
  clientName: string
  formType: string
  templateId: string
  templateFile: string
  branch: string
  submittedAt: string
  fieldValues: Record<string, unknown>
  /** In-memory / hydrated data URL for PDF stamping */
  clientSignature: string
  otherSignature?: string
  clientSignaturePath?: string
  otherSignaturePath?: string
}

const DEFAULT_HISTORY: GeneratedFormRecord[] = []

/** Session-only mirror of DB rows (never written to localStorage). */
let memoryCache: GeneratedFormRecord[] = []

function emit() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Wipe the key that was blowing browser quota on tablets. */
function clearLegacyBrowserStorage() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    localStorage.removeItem(`${LEGACY_STORAGE_KEY}_deleted`)
  } catch {
    /* ignore */
  }
  try {
    if (typeof indexedDB !== 'undefined') {
      indexedDB.deleteDatabase('imajica_forms_db')
    }
  } catch {
    /* ignore */
  }
}

clearLegacyBrowserStorage()

function sortBySubmitted(rows: GeneratedFormRecord[]): GeneratedFormRecord[] {
  return [...rows].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

function setMemory(rows: GeneratedFormRecord[]) {
  memoryCache = sortBySubmitted(rows).slice(0, MAX_MEMORY_FORMS)
}

/** Aggressive JPEG shrink — signatures only need to stamp a PDF. */
export async function compressSignatureDataUrl(
  dataUrl: string,
  maxWidth = 320,
  quality = 0.42,
): Promise<string> {
  if (!dataUrl?.startsWith('data:image/')) return dataUrl
  if (dataUrl.startsWith('data:image/jpeg') && dataUrl.length < 18_000) return dataUrl

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / Math.max(1, img.width))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(dataUrl)
          return
        }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i.exec(dataUrl)
  if (!match) return null
  const mime = match[1]!.toLowerCase().replace('jpg', 'jpeg')
  const binary = atob(match[2]!)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

async function uploadSignature(
  formId: string,
  kind: 'client' | 'other',
  dataUrl: string,
): Promise<string | null> {
  if (!supabase || !dataUrl) return null
  const blob = dataUrlToBlob(dataUrl)
  if (!blob) return null
  const ext = blob.type.includes('png') ? 'png' : 'jpg'
  const path = `${formId}/${kind}.${ext}`
  const { error } = await supabase.storage.from(SIG_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: blob.type,
    cacheControl: '3600',
  })
  if (error) {
    console.warn('[forms] signature upload failed', error.message)
    return null
  }
  return path
}

async function downloadSignatureDataUrl(path: string | undefined | null): Promise<string> {
  if (!path || !supabase) return ''
  // Already a data URL (legacy / memory)
  if (path.startsWith('data:image/')) return path
  const { data, error } = await supabase.storage.from(SIG_BUCKET).download(path)
  if (error || !data) {
    console.warn('[forms] signature download failed', error?.message)
    return ''
  }
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => resolve('')
    reader.readAsDataURL(data)
  })
}

/** Ensure signatures are data URLs before PDF build. */
export async function hydrateFormSignatures(
  record: GeneratedFormRecord,
): Promise<GeneratedFormRecord> {
  let clientSignature = record.clientSignature
  let otherSignature = record.otherSignature
  if ((!clientSignature || clientSignature.length < 32) && record.clientSignaturePath) {
    clientSignature = await downloadSignatureDataUrl(record.clientSignaturePath)
  }
  if ((!otherSignature || otherSignature.length < 32) && record.otherSignaturePath) {
    otherSignature = await downloadSignatureDataUrl(record.otherSignaturePath)
  }
  return { ...record, clientSignature, otherSignature }
}

type RemoteFormRow = {
  id: string
  client_name: string | null
  form_type: string | null
  template_file: string | null
  branch_code: string | null
  field_values: Record<string, unknown> | null
  submitted_at: string | null
  title: string | null
  client_signature_path: string | null
  other_signature_path: string | null
}

function mapRemoteRow(row: RemoteFormRow): GeneratedFormRecord {
  const fv = (row.field_values || {}) as Record<string, unknown>
  const legacyClient =
    typeof fv.__clientSignature === 'string' ? fv.__clientSignature : ''
  const legacyOther =
    typeof fv.__otherSignature === 'string' ? fv.__otherSignature : undefined
  const { __clientSignature: _c, __otherSignature: _o, __templateId, ...rest } = fv
  void _c
  void _o
  return {
    id: String(row.id),
    clientName: row.client_name || row.title || 'Guest',
    formType: row.form_type || 'Form',
    templateId: typeof __templateId === 'string' ? __templateId : '',
    templateFile: row.template_file || '',
    branch: row.branch_code || '',
    submittedAt: row.submitted_at || new Date().toISOString(),
    fieldValues: rest,
    // Prefer storage paths; keep legacy base64 only if still in jsonb
    clientSignature: legacyClient,
    otherSignature: legacyOther,
    clientSignaturePath: row.client_signature_path || undefined,
    otherSignaturePath: row.other_signature_path || undefined,
  }
}

export function getGeneratedForms(): GeneratedFormRecord[] {
  const deleted = new Set<string>()
  try {
    const raw = localStorage.getItem(`${LEGACY_STORAGE_KEY}_deleted`)
    if (raw) {
      const parsed = JSON.parse(raw) as string[]
      if (Array.isArray(parsed)) parsed.forEach((id) => deleted.add(id))
    }
  } catch {
    /* ignore */
  }
  const seedIds = new Set(DEFAULT_HISTORY.map((r) => r.id))
  const customs = memoryCache.filter((r) => !seedIds.has(r.id))
  return [...customs, ...DEFAULT_HISTORY.filter((r) => !deleted.has(r.id))].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt),
  )
}

async function persistRemote(record: GeneratedFormRecord): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured — cannot save form to the database')
  }

  const id = isUuid(record.id) ? record.id : crypto.randomUUID()

  const [clientPath, otherPath] = await Promise.all([
    record.clientSignature
      ? uploadSignature(id, 'client', record.clientSignature)
      : Promise.resolve(record.clientSignaturePath || null),
    record.otherSignature
      ? uploadSignature(id, 'other', record.otherSignature)
      : Promise.resolve(record.otherSignaturePath || null),
  ])

  // Prefer storage paths; only embed tiny legacy sigs in jsonb as last resort
  const fieldValues: Record<string, unknown> = {
    ...record.fieldValues,
    __templateId: record.templateId,
  }
  if (!clientPath && record.clientSignature && record.clientSignature.length < 25_000) {
    fieldValues.__clientSignature = record.clientSignature
  }
  if (!otherPath && record.otherSignature && record.otherSignature.length < 25_000) {
    fieldValues.__otherSignature = record.otherSignature
  }

  const { error } = await supabase.from('imajica_forms').upsert(
    {
      id,
      title: `${record.formType} — ${record.clientName}`,
      form_type: record.formType,
      client_name: record.clientName,
      template_file: record.templateFile,
      branch_code: record.branch,
      field_values: fieldValues,
      client_signature_path: clientPath,
      other_signature_path: otherPath,
      submitted_at: record.submittedAt,
      status: 'active',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error) {
    throw new Error(error.message || 'Could not save form to the database')
  }

  record.id = id
  record.clientSignaturePath = clientPath || undefined
  record.otherSignaturePath = otherPath || undefined
}

export async function preloadGeneratedForms(): Promise<void> {
  clearLegacyBrowserStorage()

  if (!isSupabaseConfigured || !supabase) {
    emit()
    return
  }

  const { data, error } = await supabase
    .from('imajica_forms')
    .select(
      'id, client_name, form_type, template_file, branch_code, field_values, submitted_at, title, client_signature_path, other_signature_path',
    )
    .order('submitted_at', { ascending: false })
    .limit(80)

  if (error) {
    console.warn('[forms] preload failed', error.message)
    emit()
    return
  }

  setMemory((data as RemoteFormRow[] | null)?.map(mapRemoteRow) ?? [])
  emit()
}

export async function createGeneratedForm(input: {
  template: FormTemplateDef
  clientName: string
  branch?: string
  fieldValues: Record<string, unknown>
  clientSignature: string
  otherSignature?: string
}): Promise<GeneratedFormRecord> {
  clearLegacyBrowserStorage()

  const [clientSignature, otherSignature] = await Promise.all([
    compressSignatureDataUrl(input.clientSignature),
    input.otherSignature
      ? compressSignatureDataUrl(input.otherSignature)
      : Promise.resolve(undefined),
  ])

  const record: GeneratedFormRecord = {
    id: crypto.randomUUID(),
    clientName: input.clientName.trim() || 'Guest',
    formType: input.template.typeLabel,
    templateId: input.template.id,
    templateFile: input.template.fileName,
    branch: input.branch ?? 'BR01',
    submittedAt: new Date().toISOString(),
    fieldValues: input.fieldValues,
    clientSignature,
    otherSignature,
  }

  // Database is the source of truth — never write form payloads to localStorage
  await persistRemote(record)

  setMemory([record, ...memoryCache.filter((r) => r.id !== record.id)])
  emit()
  return record
}

export function deleteGeneratedForm(id: string) {
  setMemory(memoryCache.filter((r) => r.id !== id))
  emit()

  if (!isSupabaseConfigured || !supabase || !isUuid(id)) return

  void (async () => {
    try {
      await supabase.storage.from(SIG_BUCKET).remove([`${id}/client.jpg`, `${id}/client.png`, `${id}/other.jpg`, `${id}/other.png`])
    } catch {
      /* ignore */
    }
    const { error } = await supabase.from('imajica_forms').delete().eq('id', id)
    if (error) console.warn('[forms] remote delete failed', error.message)
  })()
}

export function subscribeGeneratedForms(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener)
  return () => window.removeEventListener(CHANGE_EVENT, listener)
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; kind: 'png' | 'jpg' } | null {
  if (dataUrl === '[signature-omitted-quota]') return null
  const match = /^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i.exec(dataUrl)
  if (!match) return null
  const mime = match[1]!.toLowerCase()
  const b64 = match[2]!
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return { bytes, kind: mime.includes('png') ? 'png' : 'jpg' }
}

function formatFieldValue(value: unknown): string {
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    if ('client' in o || 'family' in o || 'comments' in o) {
      const parts = [
        o.client != null && o.client !== '' ? `Client: ${o.client}` : '',
        o.family != null && o.family !== '' ? `Family: ${o.family}` : '',
        o.comments != null && o.comments !== '' ? `Comments: ${o.comments}` : '',
      ].filter(Boolean)
      return parts.join(' · ') || '—'
    }
    return JSON.stringify(value)
  }
  return String(value)
}

function hasFilledFields(fieldValues: Record<string, unknown>) {
  return Object.values(fieldValues).some((v) => {
    if (v == null || v === '') return false
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'object') {
      return Object.values(v as Record<string, unknown>).some((x) => x != null && x !== '')
    }
    return true
  })
}

async function embedSignature(pdfDoc: PDFDocument, dataUrl: string) {
  const parsed = dataUrlToBytes(dataUrl)
  if (!parsed) return null
  return parsed.kind === 'png'
    ? pdfDoc.embedPng(parsed.bytes)
    : pdfDoc.embedJpg(parsed.bytes)
}

async function stampConsentPage(pdfDoc: PDFDocument, record: GeneratedFormRecord) {
  const pages = pdfDoc.getPages()
  const page = pages[pages.length - 1]!
  const { width, height } = page.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const submitted = new Date(record.submittedAt)
  const dateLabel = submitted.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  void height

  const sigWidth = Math.min(200, width * 0.34)
  const sigHeight = 52
  const sigX = width * 0.12
  const sigY = 118

  if (record.clientSignature) {
    const img = await embedSignature(pdfDoc, record.clientSignature)
    if (img) {
      page.drawImage(img, {
        x: sigX,
        y: sigY,
        width: sigWidth,
        height: sigHeight,
      })
    }
  }

  page.drawText('Patient / Client Signature', {
    x: sigX,
    y: sigY - 12,
    size: 8,
    font,
    color: rgb(0.35, 0.4, 0.45),
  })
  page.drawText(record.clientName, {
    x: sigX,
    y: sigY - 24,
    size: 9,
    font: fontBold,
    color: rgb(0.027, 0.239, 0.173),
  })

  const dateX = width * 0.58
  page.drawText(dateLabel, {
    x: dateX,
    y: sigY + 18,
    size: 10,
    font,
    color: rgb(0.05, 0.1, 0.12),
  })
  page.drawText('Date', {
    x: dateX,
    y: sigY - 12,
    size: 8,
    font,
    color: rgb(0.35, 0.4, 0.45),
  })

  if (record.otherSignature) {
    const other = await embedSignature(pdfDoc, record.otherSignature)
    if (other) {
      page.drawImage(other, {
        x: dateX,
        y: sigY + 40,
        width: Math.min(160, width * 0.28),
        height: 40,
      })
      page.drawText('Other signature', {
        x: dateX,
        y: sigY + 30,
        size: 7,
        font,
        color: rgb(0.35, 0.4, 0.45),
      })
    }
  }

  page.drawText(
    `Signed electronically · ${record.branch} · ${submitted.toLocaleString()}`,
    {
      x: 18,
      y: 28,
      size: 7,
      font,
      color: rgb(0.45, 0.48, 0.52),
    },
  )
}

async function appendAnswersPage(pdfDoc: PDFDocument, record: GeneratedFormRecord) {
  if (!hasFilledFields(record.fieldValues)) return

  const page = pdfDoc.addPage()
  const { width, height } = page.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const margin = 40
  let y = height - margin

  page.drawText('Imajica Medical Aesthetics', {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.773, 0.627, 0.349),
  })
  y -= 22
  page.drawText(`${record.formType} — Completed answers`, {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.027, 0.239, 0.173),
  })
  y -= 18
  page.drawText(
    `Client: ${record.clientName}  ·  Branch: ${record.branch}  ·  ${new Date(record.submittedAt).toLocaleString()}`,
    {
      x: margin,
      y,
      size: 9,
      font,
      color: rgb(0.3, 0.35, 0.4),
    },
  )
  y -= 24

  for (const [key, value] of Object.entries(record.fieldValues)) {
    if (y < 70) break
    const label = key.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const text = formatFieldValue(value)
    page.drawText(label, {
      x: margin,
      y,
      size: 8,
      font: fontBold,
      color: rgb(0.4, 0.45, 0.5),
    })
    y -= 12
    const lines = wrapText(text, 90)
    for (const line of lines) {
      if (y < 50) break
      page.drawText(line, {
        x: margin,
        y,
        size: 10,
        font,
        color: rgb(0.05, 0.1, 0.12),
        maxWidth: width - margin * 2,
      })
      y -= 13
    }
    y -= 8
  }

  if (record.clientSignature) {
    const img = await embedSignature(pdfDoc, record.clientSignature)
    if (img && y > 90) {
      y -= 10
      page.drawText('Client Signature', {
        x: margin,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.027, 0.239, 0.173),
      })
      y -= 58
      page.drawImage(img, {
        x: margin,
        y,
        width: 200,
        height: 50,
      })
    }
  }
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length) return ['—']
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function buildGeneratedFormPdf(record: GeneratedFormRecord): Promise<Uint8Array> {
  const hydrated = await hydrateFormSignatures(record)
  const url = formPdfUrl(hydrated.templateFile)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Could not load template PDF (${hydrated.templateFile})`)
  }
  const templateBytes = await res.arrayBuffer()
  const pdfDoc = await PDFDocument.load(templateBytes)

  await stampConsentPage(pdfDoc, hydrated)
  await appendAnswersPage(pdfDoc, hydrated)

  return pdfDoc.save()
}

function toPdfBlob(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy], { type: 'application/pdf' })
}

function triggerDownload(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(toPdfBlob(bytes))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadGeneratedPacket(record: GeneratedFormRecord) {
  const bytes = await buildGeneratedFormPdf(record)
  const safeName = record.clientName.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_')
  triggerDownload(bytes, `${record.formType}-${safeName || 'client'}.pdf`)
}

export async function openGeneratedFormPdf(record: GeneratedFormRecord): Promise<string> {
  const bytes = await buildGeneratedFormPdf(record)
  return URL.createObjectURL(toPdfBlob(bytes))
}
