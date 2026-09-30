// Delete branch-tagged Auth users (HQ → Branches → Branches Accounts)
// Uses service role for auth.admin.deleteUser; caller must be SUPER_ADMIN / HQ_ADMIN.
// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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
            'HQ admin only — your login needs SUPER_ADMIN or HQ_ADMIN in user_roles.',
        },
        403,
      )
    }

    let body: { userId?: string }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const userId = (body.userId ?? '').trim()
    if (!userId) return json({ error: 'userId is required' }, 400)
    if (userId === userData.user.id) {
      return json({ error: 'You cannot delete your own account' }, 400)
    }

    const { data: targetRoles, error: targetRoleErr } = await admin
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)

    if (targetRoleErr) {
      console.error('target roles failed', targetRoleErr.message)
      return json({ error: targetRoleErr.message }, 500)
    }

    if ((targetRoles ?? []).some((r) => String(r.role_id) === 'SUPER_ADMIN')) {
      return json({ error: 'Cannot delete a SUPER_ADMIN account from Branches Accounts' }, 400)
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .maybeSingle()

    if (!profile) {
      return json({ error: 'Account not found' }, 404)
    }

    // Cascades to profiles (FK) and related user_roles
    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) {
      console.error('deleteUser failed', delErr.message)
      return json({ error: delErr.message }, 400)
    }

    return json({
      id: userId,
      email: profile.email,
      fullName: profile.full_name,
      deleted: true,
    })
  } catch (err) {
    console.error('unhandled', err)
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return json({ error: message }, 500)
  }
})
