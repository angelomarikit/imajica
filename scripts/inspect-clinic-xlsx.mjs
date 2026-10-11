/** Quick sheet stats for clinic Sales Data xlsx */
import XLSX from 'xlsx'

const path = process.argv[2]
if (!path) {
  console.error('Usage: node scripts/inspect-clinic-xlsx.mjs <file.xlsx>')
  process.exit(1)
}

const MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

function parseDisplayDate(s) {
  const m = String(s).match(/^([A-Za-z]+)\s+(\d+),\s+(\d+)$/)
  if (!m) return null
  const mon = MONTHS[m[1].slice(0, 3)]
  if (mon === undefined) return null
  const y = Number(m[3])
  const d = Number(m[2])
  return `${y}-${String(mon + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const wb = XLSX.readFile(path)
const sheet = wb.Sheets['Sales Data'] || wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
const byBranch = {}
const payStatus = {}
let fromApr = 0
let beforeApr = 0
let bad = 0
let min = null
let max = null

for (const r of rows) {
  const key = parseDisplayDate(r.Date)
  if (!key) {
    bad++
    continue
  }
  if (!min || key < min) min = key
  if (!max || key > max) max = key
  if (key >= '2026-04-01') fromApr++
  else beforeApr++
  const b = String(r.Branch || '').trim() || '(none)'
  byBranch[b] = (byBranch[b] || 0) + 1
  const ps = `${String(r.Payment).trim()}|${String(r.Status).trim()}`
  payStatus[ps] = (payStatus[ps] || 0) + 1
}

console.log(
  JSON.stringify(
    { file: path, rows: rows.length, bad, min, max, beforeApr, fromApr, byBranch, payStatus },
    null,
    2,
  ),
)
