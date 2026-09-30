import type { AccessUser } from '@/types'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { teamAccountsAsAccessUsers } from '@/constants/teamAccountsSeed'

const KEY = 'imajica_access_users'
const CHANGE = 'imajica:access-users-changed'

const SEED: AccessUser[] = teamAccountsAsAccessUsers()

type Stored = AccessUser & { deleted?: boolean }

type DirectoryRow = {
  id: string
  full_name: string
  email: string | null
  status: string | null
  role_id: string | null
  branch_id: string | null
  branch_name: string | null
}

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

function readStored(): Stored[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Stored[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStored(rows: Stored[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
  emit()
}

function mapRow(row: DirectoryRow): AccessUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email ?? '',
    role: row.role_id ?? 'STAFF',
    branchId: row.branch_id,
    branchName: row.branch_name,
    status: row.status === 'inactive' ? 'inactive' : 'active',
  }
}

function localUsers(): AccessUser[] {
  const byId = new Map<string, AccessUser>()
  for (const u of SEED) byId.set(u.id, u)
  for (const u of readStored()) {
    if (u.deleted) byId.delete(u.id)
    else byId.set(u.id, u)
  }
  return [...byId.values()].sort((a, b) => a.fullName.localeCompare(b.fullName))
}

/** All staff/admin directory rows (User Access). Prefer remote view when configured. */
export async function listAccessUsers(): Promise<AccessUser[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('v_user_access_directory')
      .select('id, full_name, email, status, role_id, branch_id, branch_name')
      .order('full_name')
    if (error) throw new Error(error.message)
    return (data as DirectoryRow[] | null)?.map(mapRow) ?? []
  }
  return localUsers()
}

/** Branch-tagged accounts only (Branches Accounts). */
export async function listBranchAccounts(): Promise<AccessUser[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('v_branch_accounts_directory')
      .select('id, full_name, email, status, role_id, branch_id, branch_name')
      .order('full_name')
    if (error) {
      // Fallback if migration 30 not applied yet
      const all = await listAccessUsers()
      return all.filter((u) => Boolean(u.branchId))
    }
    return (data as DirectoryRow[] | null)?.map(mapRow) ?? []
  }
  return localUsers().filter((u) => Boolean(u.branchId))
}

/** @deprecated sync helper — prefer listAccessUsers() */
export function getAccessUsers(): AccessUser[] {
  return localUsers()
}

export function subscribeAccessUsers(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener()
  }
  window.addEventListener(CHANGE, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE, listener)
    window.removeEventListener('storage', onStorage)
  }
}

export async function createAccessUser(
  input: Omit<AccessUser, 'id'> & { id?: string; password?: string },
): Promise<AccessUser> {
  if (isSupabaseConfigured && supabase) {
    if (!input.branchId) {
      throw new Error('Branch is required')
    }
    if (!input.password || input.password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session?.access_token) {
      throw new Error(
        'Sign in with your HQ Supabase account first (Authentication user with SUPER_ADMIN or HQ_ADMIN). Offline demo login cannot create Auth users.',
      )
    }

    const { data, error } = await supabase.functions.invoke('create-branch-account', {
      body: {
        fullName: input.fullName.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
        role: input.role,
        branchId: input.branchId,
      },
    })

    // Function may return JSON { error } with a non-2xx status
    const payload = data as { error?: string; id?: string; branchName?: string } | null
    if (payload?.error) throw new Error(payload.error)

    if (error) {
      let detail = error.message || 'Edge Function request failed'
      try {
        const ctx = (error as { context?: Response }).context
        if (ctx && typeof ctx.json === 'function') {
          const body = (await ctx.json()) as { error?: string }
          if (body?.error) detail = body.error
        }
      } catch {
        /* keep detail */
      }
      if (/Failed to send|fetch|CORS|preflight|FunctionsFetchError|not found|404/i.test(detail)) {
        throw new Error(
          'Edge Function "create-branch-account" is missing. In the Imajica Supabase project (browser): Edge Functions → Create function → name create-branch-account → paste supabase/functions/create-branch-account/index.ts → turn Verify JWT OFF → Deploy. CLI is optional.',
        )
      }
      if (/non-2xx|FunctionsHttpError/i.test(detail)) {
        throw new Error(
          `${detail}. Open Edge Functions → create-branch-account → Logs for the exact reason (often: not HQ role, migration 30 missing, or email already registered).`,
        )
      }
      throw new Error(detail)
    }

    if (!payload?.id) throw new Error('Create account failed')

    const row: AccessUser = {
      id: payload.id,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      branchId: input.branchId,
      branchName: payload.branchName ?? input.branchName,
      status: 'active',
    }
    writeStored([...readStored().filter((u) => u.id !== row.id), row])
    return row
  }

  // Offline / no Supabase env — local list only (not a real login)
  const row: AccessUser = {
    id: input.id ?? `usr-${crypto.randomUUID().slice(0, 8)}`,
    fullName: input.fullName,
    email: input.email,
    role: input.role,
    branchId: input.branchId,
    branchName: input.branchName,
    status: input.status,
  }
  writeStored([...readStored().filter((u) => u.id !== row.id), row])
  return row
}

/** Optional SQL fallback if you prefer Dashboard Auth + SQL Editor instead of the Edge Function. */
export function buildBranchAccountSql(input: {
  authUserId?: string
  fullName: string
  email: string
  role: string
  branchId: string
}): string {
  const authId = (input.authUserId ?? 'PASTE_AUTH_USER_UUID').trim()
  const name = input.fullName.trim().replace(/'/g, "''")
  const email = input.email.trim().toLowerCase().replace(/'/g, "''")
  const role = input.role.trim().replace(/'/g, "''")
  const branchId = input.branchId.trim()

  return `-- Fallback only — prefer Create Account in the app (Edge Function).
-- Requires Auth user UUID from Authentication → Users (or from create-branch-account response).

select public.upsert_branch_account_assignment(
  '${authId}'::uuid,
  '${name}',
  '${email}',
  '${role}',
  '${branchId}'::uuid,
  'active'
);
`
}

const HQ_SENTINEL_ID = '00000000-0000-0000-0000-000000000001'
const ORG_ROLES = new Set(['SUPER_ADMIN', 'HQ_ADMIN', 'CLIENT'])

export async function saveAccessUser(row: AccessUser): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const isOrgRole = ORG_ROLES.has(row.role)
    const branchId = isOrgRole ? HQ_SENTINEL_ID : row.branchId

    if (!branchId) {
      throw new Error('Branch is required for clinic staff roles')
    }

    // Role + profile + branch assignment (org roles land on HQ sentinel)
    const { error } = await supabase.rpc('upsert_branch_account_assignment', {
      p_user_id: row.id,
      p_full_name: row.fullName.trim(),
      p_email: row.email.trim().toLowerCase(),
      p_role_id: row.role,
      p_branch_id: branchId,
      p_status: row.status,
    })
    if (error) throw new Error(error.message)
    emit()
    return
  }
  writeStored([
    ...readStored().filter((u) => u.id !== row.id),
    {
      ...row,
      branchId: ORG_ROLES.has(row.role) ? null : row.branchId,
      branchName: ORG_ROLES.has(row.role) ? null : row.branchName,
    },
  ])
}

export async function setAccessUserActive(id: string, active: boolean): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.rpc('set_profile_active', {
      p_user_id: id,
      p_active: active,
    })
    if (error) throw new Error(error.message)
    emit()
    return
  }
  const all = localUsers()
  const found = all.find((u) => u.id === id)
  if (!found) return
  writeStored([
    ...readStored().filter((u) => u.id !== id),
    { ...found, status: active ? 'active' : 'inactive' },
  ])
}
