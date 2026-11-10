/**
 * Fail the build if any shipped Imajica Forms PDF is missing or not a PDF.
 * Prevents Medical History / franchise 404 regressions on deploy.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(root, 'public', 'imajica_forms')
const templatesPath = path.join(root, 'src', 'constants', 'imajicaFormTemplates.ts')

const source = fs.readFileSync(templatesPath, 'utf8')
const block = source.match(/SHIPPED_FORM_PDF_FILES\s*=\s*\[([\s\S]*?)\]\s*as const/)
if (!block) {
  console.error('[check-form-pdfs] Could not find SHIPPED_FORM_PDF_FILES in imajicaFormTemplates.ts')
  process.exit(1)
}

const shipped = [...block[1].matchAll(/'([^']+\.pdf)'/g)].map((m) => m[1])
if (!shipped.length) {
  console.error('[check-form-pdfs] SHIPPED_FORM_PDF_FILES is empty')
  process.exit(1)
}

if (!fs.existsSync(dir)) {
  console.error('[check-form-pdfs] Missing folder public/imajica_forms')
  process.exit(1)
}

const errors = []
for (const file of shipped) {
  const full = path.join(dir, file)
  if (!fs.existsSync(full)) {
    errors.push(`missing: ${file}`)
    continue
  }
  const bytes = fs.readFileSync(full)
  if (bytes.length < 500) {
    errors.push(`too small (${bytes.length}b): ${file}`)
    continue
  }
  if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    errors.push(`not a PDF: ${file}`)
  }
}

if (errors.length) {
  console.error('[check-form-pdfs] Failed — fix before deploy so clinics/franchises do not 404:')
  for (const e of errors) console.error(' -', e)
  process.exit(1)
}

console.log(`[check-form-pdfs] OK — ${shipped.length} shipped form PDFs present`)
