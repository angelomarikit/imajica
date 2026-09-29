// PayMongo create/verify payment — secrets via Supabase function secrets only
// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const secret = Deno.env.get('PAYMONGO_SECRET_KEY')
  if (!secret) {
    return new Response(JSON.stringify({ error: 'PayMongo not configured' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    // Create Payment Intent / Source with PayMongo REST API using secret.
    // Then persist payment_reference on payments table; never trust frontend status alone.
    return new Response(JSON.stringify({ ok: true, received: body }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
