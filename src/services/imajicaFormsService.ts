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

export function downloadGeneratedPacket(record: GeneratedFormRecord) {
  const rows = Object.entries(record.fieldValues)
    .map(([k, v]) => {
      const val = Array.isArray(v) ? v.join(', ') : typeof v === 'object' && v ? JSON.stringify(v) : String(v ?? '')
      return `<tr><td style="padding:6px;border-bottom:1px solid #e8e4dc;text-transform:uppercase;font-size:11px;color:#64748b">${k.replaceAll('_', ' ')}</td><td style="padding:6px;border-bottom:1px solid #e8e4dc">${val}</td></tr>`
    })
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${record.formType} — ${record.clientName}</title>
    <style>body{font-family:system-ui,sans-serif;color:#073D2C;padding:28px}h1{color:#C5A059;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}img{max-width:280px;border:1px solid #e8e4dc;margin-top:8px}</style></head><body>
    <h1>Imajica Medical Aesthetics</h1>
    <p>${record.formType}</p>
    <p><strong>Client:</strong> ${record.clientName} · <strong>Branch:</strong> ${record.branch}</p>
    <p><strong>Submitted:</strong> ${new Date(record.submittedAt).toLocaleString()}</p>
    <p><strong>Template:</strong> ${record.templateFile}</p>
    <table>${rows || '<tr><td colspan="2">No extra fields</td></tr>'}</table>
    ${record.clientSignature ? `<h3>Client Signature</h3><img src="${record.clientSignature}" alt="signature"/>` : ''}
    ${record.otherSignature ? `<h3>Other Signature</h3><img src="${record.otherSignature}" alt="other signature"/>` : ''}
    <p style="margin-top:24px;font-size:12px;color:#64748b">Original template PDF: /imajica_forms/${record.templateFile}</p>
    </body></html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${record.formType}-${record.clientName.replace(/\s+/g, '_')}.html`
  a.click()
  URL.revokeObjectURL(url)
}
