/**
 * Quick sanity check for pdfSafeText (run: node scripts/test-pdf-safe-text.mjs).
 * Full implementation lives in src/utils/pdfSafeText.ts (built via tsc in CI).
 */

function pdfSafeText(input) {
  if (input == null) return ''
  let s = String(input).normalize('NFKC')
  const replacements = {
    '\u2014': '-',
    '\u2013': '-',
    '\u201C': '"',
    '\u201D': '"',
    '\u00B7': '|',
  }
  for (const [from, to] of Object.entries(replacements)) {
    s = s.split(from).join(to)
  }
  s = s.normalize('NFKD').replace(/\p{M}+/gu, '').normalize('NFKC')
  return s
}

const samples = [
  ['09760939912', '09760939912'],
  ['u\u0308', 'u'],
  ['Test \u2014 dash', 'Test - dash'],
]

let failed = 0
for (const [input, expect] of samples) {
  const out = pdfSafeText(input)
  if (out !== expect) {
    console.error(`FAIL: "${input}" -> "${out}" expected "${expect}"`)
    failed++
  }
}
if (failed) process.exit(1)
console.log('[test-pdf-safe-text] OK')