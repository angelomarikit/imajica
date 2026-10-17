import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formPdfUrl } from '@/constants/imajicaFormTemplates'
import type { FormTemplateDef } from '@/constants/imajicaFormTemplates'

const STORAGE_KEY = 'imajica_generated_forms'
const CHANGE_EVENT = 'imajica:forms-changed'

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

export function getGeneratedForms(): GeneratedFormRecord[] {
  const extra = readStored()
  const deleted = readDeleted()
  const seedIds = new Set(DEFAULT_HISTORY.map((r) => r.id))
  const customs = extra.filter((r) => !seedIds.has(r.id))
  return [...customs, ...DEFAULT_HISTORY.filter((r) => !deleted.has(r.id))].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt),
  )
}

export function createGeneratedForm(input: {
  template: FormTemplateDef
  clientName: string
  branch?: string
  fieldValues: Record<string, unknown>
  clientSignature: string
  otherSignature?: string
}): GeneratedFormRecord {
  const record: GeneratedFormRecord = {
    id: `gf-${Date.now()}`,
    clientName: input.clientName.trim() || 'Guest',
    formType: input.template.typeLabel,
    templateId: input.template.id,
    templateFile: input.template.fileName,
    branch: input.branch ?? 'BR01',
    submittedAt: new Date().toISOString(),
    fieldValues: input.fieldValues,
    clientSignature: input.clientSignature,
    otherSignature: input.otherSignature,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...readStored()]))
  emit()
  return record
}

export function deleteGeneratedForm(id: string) {
  if (id.startsWith('gf-') && !DEFAULT_HISTORY.some((r) => r.id === id)) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(readStored().filter((r) => r.id !== id)),
    )
  } else {
    const deleted = readDeleted()
    deleted.add(id)
    localStorage.setItem(`${STORAGE_KEY}_deleted`, JSON.stringify([...deleted]))
  }
  emit()
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

  // Signature area near bottom (matches typical Patient's Signature / Date lines)
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
