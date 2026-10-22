import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formPdfUrl } from '@/constants/imajicaFormTemplates'
import type { FormTemplateDef } from '@/constants/imajicaFormTemplates'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { isUuid } from '@/utils/uuid'

const STORAGE_KEY = 'imajica_generated_forms'
const CHANGE_EVENT = 'imajica:forms-changed'
/** Keep local history small — signatures are large even when compressed. */
const MAX_LOCAL_FORMS = 25

export type GeneratedFormRecord = {
  id: string
  clientName: string
  formType: string
  templateId: string
  templateFile: string
  branch: string
  submittedAt: string
  fieldValues: Record<string, unknown>
  clientSignature: string
  otherSignature?: string
}

const DEFAULT_HISTORY: GeneratedFormRecord[] = []

function emit() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function readStored(): GeneratedFormRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GeneratedFormRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Corrupt / truncated JSON after a prior quota failure
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    return []
  }
}

function readDeleted(): Set<string> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_deleted`)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

/** Shrink signature data URLs so localStorage / DB stay under quota. */
export async function compressSignatureDataUrl(
  dataUrl: string,
  maxWidth = 480,
  quality = 0.65,
): Promise<string> {
  if (!dataUrl?.startsWith('data:image/')) return dataUrl
  // Already a small JPEG — skip re-encode if under ~40KB
  if (dataUrl.startsWith('data:image/jpeg') && dataUrl.length < 40_000) return dataUrl

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

function estimateBytes(rows: GeneratedFormRecord[]): number {
  try {
    return new Blob([JSON.stringify(rows)]).size
  } catch {
    return JSON.stringify(rows).length
  }
}

/** Write forms history; prune oldest on QuotaExceededError until it fits. */
function persistLocal(rows: GeneratedFormRecord[]): void {
  let next = rows.slice(0, MAX_LOCAL_FORMS)
  // Soft cap ~3.5MB to leave room for other keys
  while (next.length > 1 && estimateBytes(next) > 3_500_000) {
    next = next.slice(0, -1)
  }
  for (;;) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return
    } catch (err) {
      const quota =
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          err.code === 22)
      if (!quota || next.length <= 1) {
        // Last resort: drop signatures from remaining rows and retry once
        if (next.length > 0) {
          const slim = next.map((r) => ({
            ...r,
            clientSignature: r.clientSignature ? '[signature-omitted-quota]' : '',
            otherSignature: undefined,
          }))
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(slim.slice(0, 5)))
            return
          } catch {
            try {
              localStorage.removeItem(STORAGE_KEY)
            } catch {
              /* ignore */
            }
            throw new Error(
              'Browser storage is full. Clear site data for this app, or delete old forms, then try again.',
            )
          }
        }
        throw err instanceof Error
          ? err
          : new Error('Could not save form history — browser storage is full')
      }
      next = next.slice(0, -1)
    }
  }
}

/** One-time cleanup of oversized history already on this device. */
function pruneIfBloated() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    if (raw.length > 4_000_000) {
      const rows = readStored()
      const slim = rows.slice(0, MAX_LOCAL_FORMS).map((r) => ({
        ...r,
        // Drop huge legacy PNG signatures from old records
        clientSignature:
          r.clientSignature && r.clientSignature.length > 80_000
            ? ''
            : r.clientSignature,
        otherSignature:
          r.otherSignature && r.otherSignature.length > 80_000
            ? undefined
            : r.otherSignature,
      }))
      persistLocal(slim)
    }
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }
}

pruneIfBloated()

export function getGeneratedForms(): GeneratedFormRecord[] {
  const extra = readStored()
  const deleted = readDeleted()
  const seedIds = new Set(DEFAULT_HISTORY.map((r) => r.id))
  const customs = extra.filter((r) => !seedIds.has(r.id))
  return [...customs, ...DEFAULT_HISTORY.filter((r) => !deleted.has(r.id))].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt),
  )
}

async function persistRemote(record: GeneratedFormRecord): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const id = isUuid(record.id) ? record.id : crypto.randomUUID()
  const { error } = await supabase.from('imajica_forms').upsert(
    {
      id,
      title: `${record.formType} — ${record.clientName}`,
      form_type: record.formType,
      client_name: record.clientName,
      template_file: record.templateFile,
      branch_code: record.branch,
      field_values: {
        ...record.fieldValues,
        __templateId: record.templateId,
        __clientSignature: record.clientSignature || null,
        __otherSignature: record.otherSignature || null,
      },
      submitted_at: record.submittedAt,
      status: 'active',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error) {
    console.warn('[forms] supabase save skipped:', error.message)
  }
}

export async function preloadGeneratedForms(): Promise<void> {
  pruneIfBloated()
  if (!isSupabaseConfigured || !supabase) return
  const { data, error } = await supabase
    .from('imajica_forms')
    .select(
      'id, client_name, form_type, template_file, branch_code, field_values, submitted_at, title',
    )
    .order('submitted_at', { ascending: false })
    .limit(80)
  if (error || !data) return

  const remote: GeneratedFormRecord[] = data.map((row) => {
    const fv = (row.field_values || {}) as Record<string, unknown>
    const clientSig =
      typeof fv.__clientSignature === 'string' ? fv.__clientSignature : ''
    const otherSig =
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
      clientSignature: clientSig,
      otherSignature: otherSig,
    }
  })

  const local = readStored()
  const byId = new Map<string, GeneratedFormRecord>()
  for (const r of [...remote, ...local]) byId.set(r.id, r)
  persistLocal(
    [...byId.values()].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
  )
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

  persistLocal([record, ...readStored()])
  emit()
  void persistRemote(record)
  return record
}

export function deleteGeneratedForm(id: string) {
  if (!DEFAULT_HISTORY.some((r) => r.id === id)) {
    persistLocal(readStored().filter((r) => r.id !== id))
  } else {
    const deleted = readDeleted()
    deleted.add(id)
    try {
      localStorage.setItem(`${STORAGE_KEY}_deleted`, JSON.stringify([...deleted]))
    } catch {
      /* ignore */
    }
  }
  emit()
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    void supabase.from('imajica_forms').delete().eq('id', id)
  }
}

export function subscribeGeneratedForms(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === `${STORAGE_KEY}_deleted`) listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
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

async function embedSignature(
  pdfDoc: PDFDocument,
  dataUrl: string,
) {
  const parsed = dataUrlToBytes(dataUrl)
  if (!parsed) return null
  return parsed.kind === 'png'
    ? pdfDoc.embedPng(parsed.bytes)
    : pdfDoc.embedJpg(parsed.bytes)
}

/** Stamp name, date, and signatures onto the last page of the consent PDF. */
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

  const entries = Object.entries(record.fieldValues)
  for (const [key, value] of entries) {
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

/** Build the final PDF: original template + stamped signature/date (+ answers page if needed). */
export async function buildGeneratedFormPdf(record: GeneratedFormRecord): Promise<Uint8Array> {
  const url = formPdfUrl(record.templateFile)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Could not load template PDF (${record.templateFile})`)
  }
  const templateBytes = await res.arrayBuffer()
  const pdfDoc = await PDFDocument.load(templateBytes)

  await stampConsentPage(pdfDoc, record)
  await appendAnswersPage(pdfDoc, record)

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

/** Download the full signed template PDF (not a summary HTML page). */
export async function downloadGeneratedPacket(record: GeneratedFormRecord) {
  const bytes = await buildGeneratedFormPdf(record)
  const safeName = record.clientName.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_')
  triggerDownload(bytes, `${record.formType}-${safeName || 'client'}.pdf`)
}

/** Open the generated PDF in a new tab for viewing. */
export async function openGeneratedFormPdf(record: GeneratedFormRecord): Promise<string> {
  const bytes = await buildGeneratedFormPdf(record)
  return URL.createObjectURL(toPdfBlob(bytes))
}
