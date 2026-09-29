// Semaphore account balance — API key stays in function secrets only
// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const apikey = Deno.env.get('SEMAPHORE_API_KEY')
    if (!apikey) {
      return json({ error: 'Semaphore not configured', configured: false }, 503)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401)

    const url = new URL('https://api.semaphore.co/api/v4/account')
    url.searchParams.set('apikey', apikey)

    const res = await fetch(url.toString(), { method: 'GET' })
    const text = await res.text()
    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      body = { raw: text }
    }

    if (!res.ok) {
      return json({ error: 'Semaphore account lookup failed', details: body }, res.status)
    }

    const account = Array.isArray(body) ? body[0] : body
    const row = account as {
      account_id?: number
      account_name?: string
      status?: string
      credit_balance?: string | number
    }

    return json({
      configured: true,
      account_id: row.account_id,
      account_name: row.account_name,
      status: row.status,
      credit_balance: Number(row.credit_balance ?? 0),
    })
  } catch (error) {
    return json({ error: String(error) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
