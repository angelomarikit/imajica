/**
 * Customer migration import — merge-safe.
 *
 * Rules (strict):
 * 1. Match existing: normalized phone → email → full name (only if unique).
 * 2. Matched: fill ONLY blank fields from the XLSX. Never overwrite existing values.
 * 3. Unmatched: insert one new customer.
 * 4. Never invent data; "-" / empty XLSX cells are skipped.
 */
import { normalizeClientName } from '@/constants/clientProfileSeed'
import { getBranches, resolveClinicBranchId } from '@/services/branchService'
import {
  createClientCode,
  getClients,
  persistClientToSupabase,
  saveClient,
} from '@/services/clientService'
import type { Client } from '@/types'

export type MigrationCustomerRow = {
  full_name?: string
  fullName?: string
  phone?: string | number | null
  email?: string | null
  gender?: string | null
  birthdate?: string | number | null
  date_of_birth?: string | null
  address?: string | null
  branch?: string | null
  total_spent?: string | number | null
  total_visits?: string | number | null
  notes?: string | null
  admin_notes?: string | null
  source_client_id?: string | null
  client_id?: string | null
  row_no?: number
}

export type MigrationImportAction = 'update' | 'insert' | 'skip'

export type MigrationImportPlanRow = {
  rowNo: number
  action: MigrationImportAction
  matchBy?: 'phone' | 'email' | 'name'
  existingId?: string
  existingName?: string
  fullName: string
  fieldsToFill: string[]
  reason?: string
}

export type MigrationImportSummary = {
  totalRows: number
  toUpdate: number
  toInsert: number
  skipped: number
  plans: MigrationImportPlanRow[]
}

export type MigrationImportResult = {
  updated: number
  inserted: number
  skipped: number
  syncedRemote: number
  errors: string[]
}

function isBlank(v: unknown): boolean {
  if (v == null) return true
  const s = String(v).trim()
  return !s || s === '-' || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'null'
}

function asText(v: unknown): string {
  if (isBlank(v)) return ''
  return String(v).trim()
}

/** Digits-only phone key for matching (+63 / 09 / 9xxxxxxxxx). */
export function normalizePhoneKey(value: unknown): string {
  if (value == null) return ''
  const digits = String(typeof value === 'number' ? Math.trunc(value) : value).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length >= 10) {
    const last10 = digits.slice(-10)
    if (last10.startsWith('9')) return last10
  }
  return digits
}

export function formatPhoneE164(value: unknown): string {
  const key = normalizePhoneKey(value)
  if (!key) return ''
  if (key.length === 10 && key.startsWith('9')) return `+63${key}`
  return key.startsWith('63') ? `+${key}` : `+${key}`
}

function normalizeEmailKey(value: unknown): string {
  const s = asText(value).toLowerCase()
  if (!s || s.endsWith('@imajica.local')) return ''
  return s
}

function mapGender(value: unknown): Client['gender'] | '' {
  const s = asText(value).toLowerCase()
  if (s === 'female' || s === 'f') return 'female'
  if (s === 'male' || s === 'm') return 'male'
  return ''
}

function excelSerialToIso(n: number): string {
  if (!Number.isFinite(n)) return ''
  const ms = (n - 25569) * 86400 * 1000
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  if (y < 1920 || y > 2035) return ''
  return `${y}-${m}-${day}`
}

function mapBirthdate(value: unknown): string {
  if (isBlank(value)) return ''
  if (typeof value === 'number') return excelSerialToIso(value)
  const s = asText(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d+(\.\d+)?$/.test(s)) return excelSerialToIso(Number(s))
  return ''
}

function mapNum(value: unknown): number | undefined {
  if (isBlank(value)) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function clientHasValue(client: Client, field: keyof Client): boolean {
  const v = client[field]
  if (v == null) return false
  if (typeof v === 'string') return Boolean(v.trim()) && v.trim() !== '-'
  if (typeof v === 'number') return true
  return Boolean(v)
}

/** Incoming patch with only fields that have real XLSX values. */
function rowToIncomingPatch(row: MigrationCustomerRow): Partial<Client> {
  const fullName = asText(row.full_name ?? row.fullName)
  const phone = formatPhoneE164(row.phone)
  const email = normalizeEmailKey(row.email)
  const gender = mapGender(row.gender)
  const dateOfBirth = mapBirthdate(row.birthdate ?? row.date_of_birth)
  const address = asText(row.address)
  const branchLabel = asText(row.branch)
  const clinicId = resolveClinicBranchId(branchLabel)
  const clinic = clinicId ? getBranches().find((b) => b.id === clinicId) : undefined
  const notes = asText(row.notes ?? row.admin_notes)
  const totalSpent = mapNum(row.total_spent)
  const totalVisits = mapNum(row.total_visits)

  const patch: Partial<Client> = {}
  if (fullName) patch.fullName = fullName
  if (phone) patch.phone = phone
  if (email) patch.email = email
  if (gender) patch.gender = gender
  if (dateOfBirth) patch.dateOfBirth = dateOfBirth
  if (address) patch.address = address
  if (clinicId) {
    patch.preferredBranchId = clinicId
    patch.preferredBranchName = clinic?.name || branchLabel
  } else if (branchLabel) {
    patch.preferredBranchName = branchLabel
  }
  if (notes) patch.adminNotes = notes
  if (totalSpent != null) patch.totalSpent = totalSpent
  if (totalVisits != null) patch.totalVisits = totalVisits
  return patch
}

/**
 * Fill blanks only. Existing non-empty values always win.
 * totalSpent / totalVisits take the max (never decrease).
 */
export function fillMissingClientFields(base: Client, incoming: Partial<Client>): {
  next: Client
  filled: string[]
} {
  const filled: string[] = []
  const next: Client = { ...base }

  const tryFill = <K extends keyof Client>(key: K, value: Client[K] | undefined) => {
    if (value == null || value === '') return
    if (typeof value === 'string' && !value.trim()) return
    if (clientHasValue(base, key)) return
    next[key] = value
    filled.push(String(key))
  }

  tryFill('fullName', incoming.fullName)
  tryFill('email', incoming.email)
  tryFill('phone', incoming.phone)
  tryFill('dateOfBirth', incoming.dateOfBirth)
  tryFill('address', incoming.address)
  tryFill('occupation', incoming.occupation)
  tryFill('middleName', incoming.middleName)
  tryFill('preferredBranchId', incoming.preferredBranchId)
  tryFill('preferredBranchName', incoming.preferredBranchName)
  tryFill('adminNotes', incoming.adminNotes)
  tryFill('emergencyContactName', incoming.emergencyContactName)
  tryFill('emergencyContactPhone', incoming.emergencyContactPhone)
  tryFill('medicalConcerns', incoming.medicalConcerns)
  tryFill('currentMedications', incoming.currentMedications)
  tryFill('avatarUrl', incoming.avatarUrl)

  if (
    incoming.gender &&
    (incoming.gender === 'female' || incoming.gender === 'male') &&
    base.gender !== 'female' &&
    base.gender !== 'male'
  ) {
    next.gender = incoming.gender
    filled.push('gender')
  }

  if (incoming.totalSpent != null && incoming.totalSpent > (base.totalSpent ?? 0)) {
    next.totalSpent = incoming.totalSpent
    filled.push('totalSpent')
  }
  if (incoming.totalVisits != null && incoming.totalVisits > (base.totalVisits ?? 0)) {
    next.totalVisits = incoming.totalVisits
    filled.push('totalVisits')
  }

  return { next, filled }
}

function buildIndexes(clients: Client[]) {
  const byPhone = new Map<string, Client[]>()
  const byEmail = new Map<string, Client[]>()
  const byName = new Map<string, Client[]>()

  const push = (map: Map<string, Client[]>, key: string, c: Client) => {
    if (!key) return
    const list = map.get(key) ?? []
    list.push(c)
    map.set(key, list)
  }

  for (const c of clients) {
    push(byPhone, normalizePhoneKey(c.phone), c)
    push(byEmail, normalizeEmailKey(c.email), c)
    push(byName, normalizeClientName(c.fullName), c)
  }
  return { byPhone, byEmail, byName }
}

function pickUnique(list: Client[] | undefined): Client | undefined {
  if (!list || list.length !== 1) return undefined
  return list[0]
}

function matchExisting(
  row: MigrationCustomerRow,
  indexes: ReturnType<typeof buildIndexes>,
): { client: Client; matchBy: 'phone' | 'email' | 'name' } | null {
  const phoneKey = normalizePhoneKey(row.phone)
  const emailKey = normalizeEmailKey(row.email)
  const nameKey = normalizeClientName(asText(row.full_name ?? row.fullName))

  const byPhone = pickUnique(indexes.byPhone.get(phoneKey))
  if (byPhone) return { client: byPhone, matchBy: 'phone' }

  const byEmail = pickUnique(indexes.byEmail.get(emailKey))
  if (byEmail) return { client: byEmail, matchBy: 'email' }

  const byName = pickUnique(indexes.byName.get(nameKey))
  if (byName) return { client: byName, matchBy: 'name' }

  // Ambiguous name — do not auto-merge (prevents doubling wrong profiles)
  if (nameKey && (indexes.byName.get(nameKey)?.length ?? 0) > 1) {
    return null
  }
  return null
}

export function planCustomerMigrationImport(
  rows: MigrationCustomerRow[],
  existing: Client[] = getClients(),
): MigrationImportSummary {
  const indexes = buildIndexes(existing)
  const plans: MigrationImportPlanRow[] = []
  let toUpdate = 0
  let toInsert = 0
  let skipped = 0

  // Track phones/emails/names we will insert in this batch to avoid intra-file doubles
  const seenPhone = new Set<string>()
  const seenEmail = new Set<string>()
  const seenName = new Set<string>()

  rows.forEach((row, i) => {
    const rowNo = row.row_no ?? i + 1
    const fullName = asText(row.full_name ?? row.fullName)
    if (!fullName) {
      skipped += 1
      plans.push({
        rowNo,
        action: 'skip',
        fullName: '',
        fieldsToFill: [],
        reason: 'Missing full_name',
      })
      return
    }

    const patch = rowToIncomingPatch(row)
    const matched = matchExisting(row, indexes)

    if (matched) {
      const { next, filled } = fillMissingClientFields(matched.client, patch)
      if (filled.length === 0) {
        skipped += 1
        plans.push({
          rowNo,
          action: 'skip',
          matchBy: matched.matchBy,
          existingId: matched.client.id,
          existingName: matched.client.fullName,
          fullName,
          fieldsToFill: [],
          reason: 'Already complete — nothing missing',
        })
        return
      }
      toUpdate += 1
      plans.push({
        rowNo,
        action: 'update',
        matchBy: matched.matchBy,
        existingId: matched.client.id,
        existingName: matched.client.fullName,
        fullName,
        fieldsToFill: filled,
      })
      // keep indexes pointing at same id (actual save happens on apply)
      void next
      return
    }

    // Intra-file duplicate (same phone/email/name already planned as insert)
    const phoneKey = normalizePhoneKey(row.phone)
    const emailKey = normalizeEmailKey(row.email)
    const nameKey = normalizeClientName(fullName)
    if (
      (phoneKey && seenPhone.has(phoneKey)) ||
      (emailKey && seenEmail.has(emailKey)) ||
      (nameKey && seenName.has(nameKey))
    ) {
      skipped += 1
      plans.push({
        rowNo,
        action: 'skip',
        fullName,
        fieldsToFill: [],
        reason: 'Duplicate row in import file — already queued',
      })
      return
    }

    // Ambiguous existing name duplicates — skip insert to avoid a 5th Angelou-style clone
    if (nameKey && (indexes.byName.get(nameKey)?.length ?? 0) > 1) {
      skipped += 1
      plans.push({
        rowNo,
        action: 'skip',
        fullName,
        fieldsToFill: [],
        reason: 'Ambiguous name match (multiple existing) — resolve manually',
      })
      return
    }

    toInsert += 1
    if (phoneKey) seenPhone.add(phoneKey)
    if (emailKey) seenEmail.add(emailKey)
    if (nameKey) seenName.add(nameKey)
    plans.push({
      rowNo,
      action: 'insert',
      fullName,
      fieldsToFill: Object.keys(patch),
    })
  })

  return {
    totalRows: rows.length,
    toUpdate,
    toInsert,
    skipped,
    plans,
  }
}

function newClientFromPatch(patch: Partial<Client>): Client {
  const id = crypto.randomUUID()
  const branchId = patch.preferredBranchId || ''
  const branchName = patch.preferredBranchName || ''
  return {
    id,
    code: createClientCode(),
    fullName: patch.fullName || 'Unknown',
    email: patch.email || '',
    phone: patch.phone || '',
    dateOfBirth: patch.dateOfBirth || '',
    gender: patch.gender === 'female' || patch.gender === 'male' ? patch.gender : 'prefer_not_to_say',
    address: patch.address || undefined,
    preferredBranchId: branchId,
    preferredBranchName: branchName,
    status: 'active',
    isVip: false,
    registeredAt: new Date().toISOString(),
    totalVisits: patch.totalVisits ?? 0,
    totalSpent: patch.totalSpent ?? 0,
    adminNotes: patch.adminNotes,
  }
}

/**
 * Apply migration rows to local customer registry + best-effort Supabase sync.
 * Always run planCustomerMigrationImport first and confirm counts with the user.
 */
export async function applyCustomerMigrationImport(
  rows: MigrationCustomerRow[],
  opts?: { syncRemote?: boolean },
): Promise<MigrationImportResult> {
  const syncRemote = opts?.syncRemote !== false
  const summary = planCustomerMigrationImport(rows)
  const byRow = new Map(rows.map((r, i) => [r.row_no ?? i + 1, r]))
  const errors: string[] = []
  let updated = 0
  let inserted = 0
  let skipped = 0
  let syncedRemote = 0

  // Re-match against live list as we mutate
  for (const plan of summary.plans) {
    if (plan.action === 'skip') {
      skipped += 1
      continue
    }
    const row = byRow.get(plan.rowNo)
    if (!row) {
      skipped += 1
      continue
    }
    const patch = rowToIncomingPatch(row)
    const live = getClients()
    const indexes = buildIndexes(live)
    const matched = matchExisting(row, indexes)

    try {
      if (plan.action === 'update') {
        const base = matched?.client || live.find((c) => c.id === plan.existingId)
        if (!base) {
          // Race: fell through to insert path carefully
          const created = newClientFromPatch(patch)
          saveClient(created)
          inserted += 1
          if (syncRemote) {
            try {
              await persistClientToSupabase(created)
              syncedRemote += 1
            } catch (err) {
              errors.push(`${created.fullName}: ${err instanceof Error ? err.message : 'sync failed'}`)
            }
          }
          continue
        }
        const { next, filled } = fillMissingClientFields(base, patch)
        if (!filled.length) {
          skipped += 1
          continue
        }
        saveClient(next)
        updated += 1
        if (syncRemote) {
          try {
            await persistClientToSupabase(next)
            syncedRemote += 1
          } catch (err) {
            errors.push(`${next.fullName}: ${err instanceof Error ? err.message : 'sync failed'}`)
          }
        }
      } else if (plan.action === 'insert') {
        // Final guard against concurrent duplicate
        if (matched) {
          const { next, filled } = fillMissingClientFields(matched.client, patch)
          if (filled.length) {
            saveClient(next)
            updated += 1
            if (syncRemote) {
              try {
                await persistClientToSupabase(next)
                syncedRemote += 1
              } catch (err) {
                errors.push(`${next.fullName}: ${err instanceof Error ? err.message : 'sync failed'}`)
              }
            }
          } else {
            skipped += 1
          }
          continue
        }
        const created = newClientFromPatch(patch)
        saveClient(created)
        inserted += 1
        if (syncRemote) {
          try {
            await persistClientToSupabase(created)
            syncedRemote += 1
          } catch (err) {
            errors.push(`${created.fullName}: ${err instanceof Error ? err.message : 'sync failed'}`)
          }
        }
      }
    } catch (err) {
      errors.push(
        `Row ${plan.rowNo} ${plan.fullName}: ${err instanceof Error ? err.message : 'failed'}`,
      )
    }
  }

  return { updated, inserted, skipped, syncedRemote, errors }
}

/** Parse Customers sheet JSON (from xlsx sheet_to_json). */
export function parseMigrationCustomerSheet(rows: Record<string, unknown>[]): MigrationCustomerRow[] {
  return rows.map((r, i) => ({
    ...(r as MigrationCustomerRow),
    row_no: Number((r as MigrationCustomerRow).row_no) || i + 1,
  }))
}
