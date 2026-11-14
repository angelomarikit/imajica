/**
 * Sanitize strings for pdf-lib StandardFonts (WinAnsi / Helvetica).
 * Prevents "WinAnsi cannot encode" crashes from Unicode punctuation and combining marks.
 */
const REPLACEMENTS: Record<string, string> = {
  '\u2014': '-', // em dash
  '\u2013': '-', // en dash
  '\u2212': '-', // minus
  '\u2018': "'",
  '\u2019': "'",
  '\u201C': '"',
  '\u201D': '"',
  '\u00B7': '|', // middle dot
  '\u2022': '*', // bullet
  '\u2026': '...',
  '\u00A0': ' ',
  '\u2012': '-',
  '\u2044': '/',
  '\u00AD': '',
}

/** WinAnsi code points pdf-lib accepts for Helvetica (subset of Windows-1252). */
const WIN_ANSI_RANGES: Array<[number, number]> = [
  [0x20, 0x7e],
  [0xa0, 0xff],
]

function isWinAnsiCodePoint(code: number): boolean {
  for (const [lo, hi] of WIN_ANSI_RANGES) {
    if (code >= lo && code <= hi) return true
  }
  return false
}

export function pdfSafeText(input: unknown): string {
  if (input == null) return ''
  let s = String(input).normalize('NFKC')

  for (const [from, to] of Object.entries(REPLACEMENTS)) {
    s = s.split(from).join(to)
  }

  // Strip combining marks (e.g. decomposed u + diaeresis 0x0308)
  s = s.normalize('NFKD').replace(/\p{M}+/gu, '').normalize('NFKC')

  let out = ''
  for (const ch of s) {
    const code = ch.codePointAt(0)!
    if (isWinAnsiCodePoint(code)) {
      out += ch
    } else if (code <= 0xffff) {
      out += '?'
    }
  }

  return out
}