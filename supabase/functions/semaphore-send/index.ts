// Semaphore SMS send — chunks up to 1000 numbers per POST; API key in secrets only
// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BATCH_SIZE = 1000

type Recipient = { client_id: string | null; phone: string }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const apikey = Deno.env.get('SEMAPHORE_API_KEY')
    const defaultSender = Deno.env.get('SEMAPHORE_SENDER_NAME') ?? ''
    if (!apikey) {
      return json({ error: 'Semaphore not configured', configured: false }, 503)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const body = await req.json() as {
      campaignId?: string
      message?: string
      sendername?: string
      numbers?: string[]
      recipients?: Recipient[]
    }

    let campaignId = body.campaignId ?? null
    let message = (body.message ?? '').trim()
    let sendername = (body.sendername || defaultSender).trim()
    let recipients: Recipient[] = []

    if (campaignId) {
      const { data: campaign, error: cErr } = await admin
        .from('marketing_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()
      if (cErr || !campaign) return json({ error: 'Campaign not found' }, 404)
      if (!message) message = (campaign.message_body as string) || ''
      if (!sendername && campaign.sender_name) sendername = campaign.sender_name as string

      const { data: pending } = await admin
        .from('sms_campaign_recipients')
        .select('client_id, phone')
        .eq('campaign_id', campaignId)
        .in('status', ['pending', 'queued'])

      if (pending?.length) {
        recipients = pending.map((r) => ({
          client_id: r.client_id as string | null,
          phone: normalizePhPhone(String(r.phone)),
        }))
      } else if (body.recipients?.length) {
        recipients = body.recipients.map((r) => ({
          client_id: r.client_id,
          phone: normalizePhPhone(r.phone),
        }))
      }
    } else {
      const phones = body.numbers ?? body.recipients?.map((r) => r.phone) ?? []
      recipients = phones.map((p, i) => ({
        client_id: body.recipients?.[i]?.client_id ?? null,
        phone: normalizePhPhone(p),
      }))
    }

    recipients = dedupeByPhone(recipients.filter((r) => r.phone.length >= 10))
    if (!message) return json({ error: 'Message is required' }, 400)
    if (message.toUpperCase().startsWith('TEST')) {
      return json({ error: 'Messages starting with TEST are ignored by Semaphore' }, 400)
    }
    if (!recipients.length) return json({ error: 'No valid recipient numbers' }, 400)
    if (!sendername) {
      return json({
        error: 'Sender name required. Set SEMAPHORE_SENDER_NAME or pass sendername.',
      }, 400)
    }

    const segments = estimateSegments(message)
    const creditsNeeded = recipients.length * segments

    const accountRes = await fetch(
      `https://api.semaphore.co/api/v4/account?apikey=${encodeURIComponent(apikey)}`,
    )
    const accountJson = await accountRes.json()
    const account = Array.isArray(accountJson) ? accountJson[0] : accountJson
    const creditBalance = Number(account?.credit_balance ?? 0)
    if (creditBalance < creditsNeeded) {
      return json({
        error: 'Insufficient Semaphore credits',
        credit_balance: creditBalance,
        credits_needed: creditsNeeded,
        recipients: recipients.length,
        segments,
      }, 402)
    }

    if (campaignId) {
      await admin
        .from('marketing_campaigns')
        .update({
          status: 'sending',
          message_body: message,
          sender_name: sendername,
          recipient_count: recipients.length,
          credits_estimated: creditsNeeded,
          error_message: null,
        })
        .eq('id', campaignId)

      // Ensure recipient rows exist
      const { data: existing } = await admin
        .from('sms_campaign_recipients')
        .select('phone')
        .eq('campaign_id', campaignId)
      const have = new Set((existing ?? []).map((r) => normalizePhPhone(String(r.phone))))
      const toInsert = recipients
        .filter((r) => !have.has(r.phone))
        .map((r) => ({
          campaign_id: campaignId,
          client_id: r.client_id,
          phone: r.phone,
          status: 'pending',
        }))
      if (toInsert.length) {
        await admin.from('sms_campaign_recipients').insert(toInsert)
      }
    }

    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE)
      const number = batch.map((r) => r.phone).join(',')

      const form = new URLSearchParams()
      form.set('apikey', apikey)
      form.set('number', number)
      form.set('message', message)
      form.set('sendername', sendername)

      const sendRes = await fetch('https://api.semaphore.co/api/v4/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      })
      const sendText = await sendRes.text()
      let sendBody: unknown
      try {
        sendBody = JSON.parse(sendText)
      } catch {
        sendBody = null
      }

      if (!sendRes.ok || !Array.isArray(sendBody)) {
        failedCount += batch.length
        errors.push(`Batch ${i / BATCH_SIZE + 1}: ${sendText.slice(0, 200)}`)
        if (campaignId) {
          await admin
            .from('sms_campaign_recipients')
            .update({ status: 'failed', error: sendText.slice(0, 500) })
            .eq('campaign_id', campaignId)
            .in(
              'phone',
              batch.map((r) => r.phone),
            )
        }
        continue
      }

      const results = sendBody as Array<{
        message_id?: number
        recipient?: string
        status?: string
        network?: string
      }>

      for (const row of results) {
        const phone = normalizePhPhone(String(row.recipient ?? ''))
        const status = mapSemaphoreStatus(row.status)
        if (status === 'failed' || status === 'refunded') failedCount += 1
        else sentCount += 1

        if (campaignId && phone) {
          await admin
            .from('sms_campaign_recipients')
            .update({
              semaphore_message_id: row.message_id != null ? String(row.message_id) : null,
              status,
              network: row.network ?? null,
              error: status === 'failed' ? row.status ?? 'failed' : null,
              updated_at: new Date().toISOString(),
            })
            .eq('campaign_id', campaignId)
            .eq('phone', phone)
        }
      }
    }

    const creditsUsed = sentCount * segments
    const finalStatus = failedCount === 0 && sentCount > 0
      ? 'sent'
      : sentCount > 0
        ? 'partial'
        : 'failed'

    if (campaignId) {
      await admin
        .from('marketing_campaigns')
        .update({
          status: finalStatus,
          reach: sentCount,
          credits_used: creditsUsed,
          sent_at: new Date().toISOString(),
          error_message: errors.length ? errors.join(' | ').slice(0, 1000) : null,
        })
        .eq('id', campaignId)
    }

    return json({
      ok: true,
      campaignId,
      sent: sentCount,
      failed: failedCount,
      segments,
      credits_used: creditsUsed,
      credit_balance_before: creditBalance,
      status: finalStatus,
      errors: errors.length ? errors : undefined,
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

function normalizePhPhone(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('63') && d.length >= 12) return d
  if (d.startsWith('0') && d.length >= 11) return '63' + d.slice(1)
  if (d.length === 10 && d.startsWith('9')) return '63' + d
  return d
}

function dedupeByPhone(list: Recipient[]): Recipient[] {
  const seen = new Set<string>()
  const out: Recipient[] = []
  for (const r of list) {
    if (seen.has(r.phone)) continue
    seen.add(r.phone)
    out.push(r)
  }
  return out
}

/** Rough segment estimate: ASCII 160/153, Unicode 70/67 */
function estimateSegments(message: string): number {
  const isUnicode = /[^\x00-\x7F]/.test(message)
  if (!isUnicode) {
    if (message.length <= 160) return 1
    return Math.ceil(message.length / 153)
  }
  if (message.length <= 70) return 1
  return Math.ceil(message.length / 67)
}

function mapSemaphoreStatus(status?: string): string {
  const s = (status ?? '').toLowerCase()
  if (s === 'queued') return 'queued'
  if (s === 'pending') return 'pending'
  if (s === 'sent' || s === 'success') return 'sent'
  if (s === 'failed') return 'failed'
  if (s === 'refunded') return 'refunded'
  return s || 'queued'
}
