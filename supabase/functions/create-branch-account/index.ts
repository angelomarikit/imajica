// Create Auth users with role + branch (HQ → Branches Accounts / User Access)
// Uses service role for auth.admin.createUser; caller must be SUPER_ADMIN / HQ_ADMIN.
// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BRANCH_ROLES = new Set([
  'BRANCH_ADMIN',
  'BRANCH_MARKETING',
  'DOCTOR',
  'NURSE',
  'AESTHETICIAN',
  'RECEPTIONIST',
  'STAFF',
])

/** Org-wide roles (All Branches / HQ) — stored on HQ sentinel */
const ORG_ROLES = new Set(['SUPER_ADMIN', 'HQ_ADMIN', 'HR', 'MARKETING', 'CLIENT'])

const ALL_ROLES = new Set([...BRANCH_ROLES, ...ORG_ROLES])

const HQ_SENTINEL = '00000000-0000-0000-0000-000000000001'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: cors })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized — sign in with an HQ Supabase account' }, 401)
    }

    const jwt = authHeader.slice('Bearer '.length).trim()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!serviceKey) {
      return json({ error: 'Server misconfigured: missing service role key' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Prefer admin.getUser(jwt) — more reliable than anon client + header
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !userData.user) {
      console.error('getUser failed', userErr?.message)
      return json({ error: 'Unauthorized — session expired. Sign in again as HQ admin.' }, 401)
    }

    const { data: roles, error: roleErr } = await admin
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userData.user.id)

    if (roleErr) {
      console.error('roles query failed', roleErr.message)
      return json({ error: roleErr.message }, 500)
    }

    const isHq = (roles ?? []).some((r) =>
      ['SUPER_ADMIN', 'HQ_ADMIN'].includes(String(r.role_id)),
    )
    if (!isHq) {
      return json(
        {
          error:
            'HQ admin only — your login needs SUPER_ADMIN or HQ_ADMIN in user_roles (not BRANCH_ADMIN / offline demo).',
        },
        403,
      )
    }

    let body: {
      fullName?: string
      email?: string
      password?: string
      role?: string
      branchId?: string
    }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const fullName = (body.fullName ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    const password = body.password ?? ''
    const role = (body.role ?? 'BRANCH_ADMIN').trim()
    const requestedBranchId = (body.branchId ?? '').trim()
    const orgWide = ORG_ROLES.has(role)
    const branchId = orgWide ? HQ_SENTINEL : requestedBranchId

    if (!fullName || !email) return json({ error: 'fullName and email are required' }, 400)
    if (password.length < 6) return json({ error: 'password must be at least 6 characters' }, 400)
    if (!ALL_ROLES.has(role)) return json({ error: `invalid role: ${role}` }, 400)
    if (!branchId) return json({ error: 'branchId is required' }, 400)
    if (!orgWide && branchId === HQ_SENTINEL) {
      return json({ error: 'Cannot tag a clinic staff account to HQ' }, 400)
    }

    const { data: branch, error: branchErr } = await admin
      .from('branches')
      .select('id, name, branch_type, status')
      .eq('id', branchId)
      .maybeSingle()

    if (branchErr) {
      console.error('branch query failed', branchErr.message)
      return json({ error: branchErr.message }, 500)
    }
    if (!branch) return json({ error: 'branch not found' }, 400)
    if (branch.status !== 'active') return json({ error: 'branch is not active' }, 400)
    if (!orgWide && String(branch.branch_type) === 'warehouse') {
      return json({ error: 'cannot tag accounts to warehouse' }, 400)
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    })

    if (createErr || !created.user) {
      console.error('createUser failed', createErr?.message)
      return json({ error: createErr?.message ?? 'Failed to create auth user' }, 400)
    }

    const userId = created.user.id

    // Direct writes with service role (bypasses RLS). Avoids RPC auth.uid() = null issue.
    const { error: profileErr } = await admin.from('profiles').upsert(
      {
        id: userId,
        full_name: fullName,
        email,
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    if (profileErr) {
      console.error('profile upsert failed', profileErr.message)
      await admin.auth.admin.deleteUser(userId)
      return json({ error: profileErr.message }, 400)
    }

    await admin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .in('role_id', [
        'SUPER_ADMIN',
        'HQ_ADMIN',
        'HR',
        'MARKETING',
        'BRANCH_MARKETING',
        'BRANCH_ADMIN',
        'DOCTOR',
        'NURSE',
        'AESTHETICIAN',
        'RECEPTIONIST',
        'STAFF',
        'CLIENT',
      ])

    const { error: roleInsertErr } = await admin.from('user_roles').insert({
      user_id: userId,
      role_id: role,
      branch_id: branchId,
    })

    if (roleInsertErr) {
      console.error('user_roles insert failed', roleInsertErr.message)
      await admin.auth.admin.deleteUser(userId)
      return json({ error: roleInsertErr.message }, 400)
    }

    return json({
      id: userId,
      fullName,
      email,
      role,
      branchId: branch.id,
      branchName: orgWide ? 'All Branches (organization)' : branch.name,
      status: 'active',
    })
  } catch (err) {
    console.error('unhandled', err)
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return json({ error: message }, 500)
  }
})
