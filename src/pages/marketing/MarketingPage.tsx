import { useEffect, useMemo, useState } from 'react'
import {
  Eye,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { SpecialPromoModal } from '@/components/marketing/SpecialPromoModal'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { Select } from '@/components/ui/SearchInput'
import { useBranch } from '@/contexts/BranchContext'
import {
  DEFAULT_LANDING_PROMOS,
  createEmptyPromo,
  deleteLandingPromo,
  getLandingPromos,
  saveLandingPromo,
  saveLandingPromos,
  subscribeLandingPromo,
} from '@/services/promoService'
import {
  createSmsCampaign,
  deleteSmsCampaign,
  estimateSmsSegments,
  getSemaphoreAccount,
  getSmsAudience,
  listSmsCampaigns,
  sendSmsCampaign,
  subscribeSmsCampaigns,
} from '@/services/smsMarketingService'
import type { LandingPromo, MarketingCampaign, SemaphoreAccountInfo } from '@/types'
import { cn } from '@/utils/cn'

type Tab = 'sms' | 'email' | 'promos'

export function MarketingPage() {
  const [tab, setTab] = useState<Tab>('sms')

  return (
    <div className="space-y-5">
      <AdminPageBanner
        eyebrow="Marketing"
        title="Campaigns & Offers"
        description="Send text messages to clients, and manage the Special Offers shown on your website."
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'sms' as const, label: 'SMS Campaigns', icon: MessageSquare },
            { id: 'email' as const, label: 'Email', icon: Mail },
            { id: 'promos' as const, label: 'Landing Promos', icon: Eye },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
              tab === id
                ? 'border-emerald-900 bg-emerald-900 text-white'
                : 'border-border bg-white text-slate-700 hover:border-emerald-900/40',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'sms' ? <SmsCampaignsPanel /> : null}
      {tab === 'email' ? (
        <Card className="p-8 text-center">
          <Mail className="mx-auto h-10 w-10 text-slate-ui" />
          <h2 className="mt-3 font-display text-2xl">Email marketing</h2>
          <p className="mt-2 text-sm text-slate-ui">
            Coming soon — we&apos;ll blast promotional emails from this same campaigns workspace.
          </p>
          <Badge className="mt-4" variant="neutral">
            Not available yet
          </Badge>
        </Card>
      ) : null}
      {tab === 'promos' ? <LandingPromosPanel /> : null}
    </div>
  )
}

function SmsCampaignsPanel() {
  const { branches } = useBranch()
  const [account, setAccount] = useState<SemaphoreAccountInfo | null>(null)
  const [loadingCredits, setLoadingCredits] = useState(false)
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [audienceBranch, setAudienceBranch] = useState('all')
  const [senderName, setSenderName] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const audience = useMemo(() => getSmsAudience(audienceBranch), [audienceBranch])
  const segments = estimateSmsSegments(message)
  const creditsNeeded = audience.length * segments

  async function refreshCampaigns() {
    const list = await listSmsCampaigns()
    setCampaigns(list)
  }

  async function refreshCredits() {
    setLoadingCredits(true)
    try {
      const info = await getSemaphoreAccount()
      setAccount(info)
      if (info.error && !info.configured) {
        /* quiet — UI shows configure state */
      }
    } finally {
      setLoadingCredits(false)
    }
  }

  useEffect(() => {
    void refreshCampaigns()
    void refreshCredits()
    return subscribeSmsCampaigns(() => {
      void refreshCampaigns()
    })
  }, [])

  async function handleSaveDraft() {
    if (!name.trim()) {
      toast.error('Campaign name is required')
      return
    }
    if (!message.trim()) {
      toast.error('Message is required')
      return
    }
    if (message.trim().toUpperCase().startsWith('TEST')) {
      toast.error('Please don’t start your message with the word TEST — it won’t be delivered')
      return
    }
    if (!audience.length) {
      toast.error('No clients with a valid mobile number in this audience')
      return
    }

    setSaving(true)
    try {
      const branchLabel =
        audienceBranch === 'all'
          ? 'All clients with phone'
          : `Branch: ${branches.find((b) => b.id === audienceBranch)?.name ?? audienceBranch}`
      await createSmsCampaign({
        name: name.trim(),
        messageBody: message.trim(),
        audienceLabel: branchLabel,
        branchId: audienceBranch,
        senderName: senderName.trim() || undefined,
        recipients: audience,
      })
      toast.success(`Draft saved · ${audience.length} recipients`)
      setName('')
      setMessage('')
      await refreshCampaigns()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save campaign')
    } finally {
      setSaving(false)
    }
  }

  async function handleSend(campaign: MarketingCampaign) {
    const needed = campaign.creditsEstimated ?? 0
    const balance = account?.creditBalance ?? 0
    if (account?.configured && needed > balance) {
      toast.error(`Not enough credits (need ${needed}, have ${balance})`)
      return
    }
    const ok = window.confirm(
      `Send “${campaign.name}” to ${campaign.recipientCount ?? 0} recipients?\nEstimated credits: ${needed}`,
    )
    if (!ok) return

    setSendingId(campaign.id)
    try {
      const result = await sendSmsCampaign(campaign.id)
      if (!result.ok) {
        toast.error(friendlySendError(result.error))
      } else if (result.error) {
        toast.message(result.error)
      } else {
        toast.success(`Sent to ${result.sent ?? 0} · ${result.failed ?? 0} failed`)
      }
      await refreshCampaigns()
      await refreshCredits()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setSendingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this campaign?')) return
    await deleteSmsCampaign(id)
    toast.message('Campaign deleted')
    await refreshCampaigns()
  }

  const sentTotal = campaigns.reduce((s, c) => s + (c.reach || 0), 0)

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="SMS Credits"
          value={
            account?.configured
              ? account.creditBalance.toLocaleString()
              : '—'
          }
          subtext={
            account?.configured
              ? 'Available to send'
              : 'Credits will show once messaging is connected'
          }
          icon={<Wallet className="h-5 w-5" />}
        />
        <KpiCard
          label="Audience selected"
          value={audience.length.toLocaleString()}
          subtext="Clients with a mobile number"
        />
        <KpiCard
          label="Est. credits this send"
          value={message.length > 0 ? creditsNeeded.toLocaleString() : '—'}
          subtext={
            message.length > 0
              ? `${audience.length} people · ${segments} part${segments === 1 ? '' : 's'} each`
              : 'Type a message to see the cost'
          }
        />
        <KpiCard
          label="Messages sent"
          value={sentTotal.toLocaleString()}
          subtext={`${campaigns.length} SMS campaign${campaigns.length === 1 ? '' : 's'}`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => void refreshCredits()} disabled={loadingCredits}>
          <RefreshCw className={cn('h-3.5 w-3.5', loadingCredits && 'animate-spin')} />
          Refresh credits
        </Button>
        {!account?.configured ? (
          <p className="text-xs text-slate-ui">
            Messaging credits aren’t connected yet. Ask your admin to finish setup if you need to send
            live SMS.
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <CardHeader
            title="Create SMS campaign"
            description="Write your message once and send it to clients who have a mobile number on file."
          />
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Campaign name</span>
              <input
                className="h-11 w-full rounded-[10px] border border-border px-3 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="September Glow Promo"
              />
            </label>
            <Select
              label="Audience"
              value={audienceBranch}
              onChange={setAudienceBranch}
              options={[
                { value: 'all', label: `All clients with phone (${getSmsAudience('all').length})` },
                ...branches.map((b) => ({
                  value: b.id,
                  label: `${b.name} (${getSmsAudience(b.id).length})`,
                })),
              ]}
            />
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">
                Sender name{' '}
                <span className="font-normal text-slate-ui">(optional)</span>
              </span>
              <input
                className="h-11 w-full rounded-[10px] border border-border px-3 text-sm"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Leave blank to use your clinic’s default name"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-sm font-semibold">
                <span>Message</span>
                <span className="font-normal text-slate-ui">
                  {message.length} chars · {segments} part{segments === 1 ? '' : 's'}
                </span>
              </span>
              <textarea
                className="min-h-[140px] w-full rounded-[10px] border border-border px-3 py-2 text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi! Book your next treatment at Imajica…"
              />
              <p className="mt-1 text-[11px] text-slate-ui">
                Don’t start with the word TEST — those messages won’t be sent. Aim for about 160
                characters so each person uses 1 credit.
              </p>
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={() => void handleSaveDraft()} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save draft'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <CardHeader
            title="Preview"
            description="Updates as you type — see how the text will look before you send."
          />
          <div className="mt-4 rounded-[16px] border border-border bg-ivory-100 p-4">
            <div className="mx-auto max-w-[280px] rounded-[20px] border border-border bg-white p-3 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-ui">
                SMS preview
              </p>
              <p
                className={cn(
                  'mt-2 min-h-[4.5rem] whitespace-pre-wrap break-words text-sm',
                  message.length > 0 ? 'text-charcoal' : 'text-slate-ui/70',
                )}
              >
                {message.length > 0 ? message : 'Your message will appear here…'}
              </p>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-ui">Recipients</dt>
                <dd className="font-metric font-semibold">{audience.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-ui">Credits needed</dt>
                <dd className="font-metric font-semibold">
                  {message.length > 0 ? creditsNeeded : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-ui">Credits available</dt>
                <dd className="font-metric font-semibold">
                  {account?.configured ? account.creditBalance : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <CardHeader title="SMS campaigns" description="Draft, send, and review past blasts." />
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-ui">
              <tr>
                <th className="px-2 py-2">Campaign</th>
                <th className="px-2 py-2">Audience</th>
                <th className="px-2 py-2">Recipients</th>
                <th className="px-2 py-2">Credits</th>
                <th className="px-2 py-2">Reach</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-8 text-center text-slate-ui">
                    No SMS campaigns yet — create a draft above.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-border/70 align-top">
                    <td className="px-2 py-3">
                      <p className="font-medium">{c.name}</p>
                      <p className="mt-0.5 max-w-xs truncate text-xs text-slate-ui">
                        {c.messageBody || c.content || '—'}
                      </p>
                    </td>
                    <td className="px-2 py-3">{c.audience}</td>
                    <td className="px-2 py-3 font-metric">{c.recipientCount ?? 0}</td>
                    <td className="px-2 py-3 font-metric">
                      {c.creditsUsed ? `${c.creditsUsed} used` : `${c.creditsEstimated ?? 0} est.`}
                    </td>
                    <td className="px-2 py-3 font-metric">{c.reach.toLocaleString()}</td>
                    <td className="px-2 py-3">
                      <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                      {c.errorMessage ? (
                        <p className="mt-1 max-w-[200px] text-[11px] text-amber-800">{c.errorMessage}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(c.status === 'draft' || c.status === 'failed' || c.status === 'partial') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={sendingId === c.id}
                            onClick={() => void handleSend(c)}
                          >
                            <Send className="h-3.5 w-3.5" />
                            {sendingId === c.id ? 'Sending…' : 'Send'}
                          </Button>
                        )}
                        {c.status === 'draft' ? (
                          <Button size="sm" variant="ghost" onClick={() => void handleDelete(c.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function statusVariant(status: string): 'success' | 'neutral' | 'warning' | 'danger' {
  if (status === 'sent' || status === 'completed' || status === 'active') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'partial' || status === 'sending') return 'warning'
  return 'neutral'
}

function friendlySendError(error?: string): string {
  if (!error) return 'Couldn’t send messages. Please try again.'
  const lower = error.toLowerCase()
  if (lower.includes('insufficient') || lower.includes('credit')) {
    return 'Not enough SMS credits for this send. Top up credits and try again.'
  }
  if (lower.includes('sender')) {
    return 'A sender name is required. Enter one or ask your admin to set the clinic default.'
  }
  if (lower.includes('test')) {
    return 'Please don’t start your message with the word TEST — it won’t be delivered.'
  }
  if (lower.includes('not configured') || lower.includes('semaphore') || lower.includes('secret')) {
    return 'Messaging isn’t connected yet. Ask your admin to finish setup.'
  }
  if (lower.includes('unauthorized') || lower.includes('auth')) {
    return 'Your session expired. Sign in again and try sending.'
  }
  return 'Couldn’t send messages. Please try again.'
}

function LandingPromosPanel() {
  const [promos, setPromos] = useState<LandingPromo[]>(() => getLandingPromos())
  const [selectedId, setSelectedId] = useState(() => getLandingPromos()[0]?.id ?? '')
  const [draft, setDraft] = useState<LandingPromo>(() => getLandingPromos()[0] ?? createEmptyPromo())
  const [previewOpen, setPreviewOpen] = useState(false)
  const [highlightsText, setHighlightsText] = useState(
    () => (getLandingPromos()[0] ?? createEmptyPromo()).highlights.join('\n'),
  )

  const activeCount = promos.filter((p) => p.isActive).length
  const featured = promos.find((p) => p.isActive) ?? promos[0]

  useEffect(() => {
    const refresh = () => {
      const next = getLandingPromos()
      setPromos(next)
      const still = next.find((p) => p.id === selectedId) ?? next[0]
      if (still) {
        setSelectedId(still.id)
        setDraft(still)
        setHighlightsText(still.highlights.join('\n'))
      }
    }
    return subscribeLandingPromo(refresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only resync on external promo changes
  }, [selectedId])

  function selectPromo(id: string) {
    const item = promos.find((p) => p.id === id)
    if (!item) return
    setSelectedId(id)
    setDraft(item)
    setHighlightsText(item.highlights.join('\n'))
  }

  function updateDraft<K extends keyof LandingPromo>(key: K, value: LandingPromo[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    const highlights = highlightsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const saved = saveLandingPromo({ ...draft, highlights })
    setPromos(getLandingPromos())
    setDraft(saved)
    setHighlightsText(saved.highlights.join('\n'))
    toast.success('Promo saved — live on the website')
  }

  function handleAdd() {
    const next = createEmptyPromo()
    const list = saveLandingPromos([...getLandingPromos(), next])
    setPromos(list)
    setSelectedId(next.id)
    setDraft(next)
    setHighlightsText(next.highlights.join('\n'))
    toast.success('New promo added — edit details then Save')
  }

  function handleDelete() {
    if (promos.length <= 1) {
      toast.error('Keep at least one promo')
      return
    }
    const next = deleteLandingPromo(draft.id)
    setPromos(next)
    const first = next[0]
    setSelectedId(first.id)
    setDraft(first)
    setHighlightsText(first.highlights.join('\n'))
    toast.message('Promo removed')
  }

  function handleResetDefaults() {
    const defaults =
      DEFAULT_LANDING_PROMOS.length > 0
        ? DEFAULT_LANDING_PROMOS.map((p) => ({ ...p }))
        : [createEmptyPromo()]
    const list = saveLandingPromos(defaults)
    setPromos(list)
    setSelectedId(list[0].id)
    setDraft(list[0])
    setHighlightsText(list[0].highlights.join('\n'))
    toast.success('Restored default promos')
  }

  return (
    <div className="space-y-5">
      <SpecialPromoModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        promos={promos.map((p) =>
          p.id === draft.id
            ? {
                ...draft,
                highlights: highlightsText
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
              }
            : p,
        )}
        onBook={() => setPreviewOpen(false)}
      />

      <Card className="p-5">
        <CardHeader
          title="Landing Page — Special Offers"
          description="Manage ongoing promos. The landing card uses the first active promo; the modal slides through all active ones."
          action={
            <Badge variant={activeCount > 0 ? 'success' : 'neutral'}>
              {activeCount > 0 ? `${activeCount} active` : 'Hidden'}
            </Badge>
          }
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {promos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPromo(p.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                selectedId === p.id
                  ? 'border-emerald-900 bg-emerald-900 text-white'
                  : 'border-border bg-white text-slate-700 hover:border-emerald-900/40',
              )}
            >
              <span className="opacity-70">{i + 1}.</span>
              {p.headline || 'Untitled'}
              {!p.isActive ? (
                <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] uppercase">Off</span>
              ) : null}
            </button>
          ))}
          <Button variant="secondary" className="h-8 rounded-full px-3 text-xs" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" /> Add promo
          </Button>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Badge</span>
              <input
                className="h-11 w-full rounded-[10px] border border-border px-3 text-sm"
                value={draft.badge}
                onChange={(e) => updateDraft('badge', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Card headline</span>
              <input
                className="h-11 w-full rounded-[10px] border border-border px-3 text-sm"
                value={draft.headline}
                onChange={(e) => updateDraft('headline', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Card description</span>
              <textarea
                className="min-h-[80px] w-full rounded-[10px] border border-border px-3 py-2 text-sm"
                value={draft.description}
                onChange={(e) => updateDraft('description', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Button label</span>
              <input
                className="h-11 w-full rounded-[10px] border border-border px-3 text-sm"
                value={draft.ctaLabel}
                onChange={(e) => updateDraft('ctaLabel', e.target.value)}
                placeholder="View Special Promo Today"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Discount label</span>
                <input
                  className="h-11 w-full rounded-[10px] border border-border px-3 text-sm"
                  value={draft.discountLabel ?? ''}
                  onChange={(e) => updateDraft('discountLabel', e.target.value)}
                  placeholder="Up to 20% OFF"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Valid until</span>
                <input
                  type="date"
                  className="h-11 w-full rounded-[10px] border border-border px-3 text-sm"
                  value={draft.validUntil ?? ''}
                  onChange={(e) => updateDraft('validUntil', e.target.value)}
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Modal title</span>
              <input
                className="h-11 w-full rounded-[10px] border border-border px-3 text-sm"
                value={draft.modalTitle}
                onChange={(e) => updateDraft('modalTitle', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Modal body</span>
              <textarea
                className="min-h-[80px] w-full rounded-[10px] border border-border px-3 py-2 text-sm"
                value={draft.modalBody}
                onChange={(e) => updateDraft('modalBody', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">
                Modal highlights <span className="font-normal text-slate-ui">(one per line)</span>
              </span>
              <textarea
                className="min-h-[100px] w-full rounded-[10px] border border-border px-3 py-2 text-sm"
                value={highlightsText}
                onChange={(e) => setHighlightsText(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => updateDraft('isActive', e.target.checked)}
                className="h-4 w-4 accent-emerald-900"
              />
              Include in landing card / modal slider
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={handleSave}>
                <Save className="h-4 w-4" /> Save & Publish
              </Button>
              <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4" /> Preview Slider
              </Button>
              <Button variant="ghost" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
              <Button variant="ghost" onClick={handleResetDefaults}>
                Reset all to defaults
              </Button>
            </div>
            <p className="text-[11px] text-slate-ui">
              Last published: {new Date(draft.updatedAt).toLocaleString()} · Active promos appear as
              slides in the Special Promo modal.
            </p>
          </div>

          <div className="rounded-[16px] border border-border bg-ivory-100 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-ui">
              Card preview (first active)
            </p>
            {featured ? (
              <div className="relative overflow-hidden rounded-[18px] bg-[#073D2C] p-6 text-white shadow-[0_14px_36px_rgba(7,61,44,0.25)]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(197,160,89,0.16),transparent_55%)]"
                />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-[#C5A059]/50 bg-[#C5A059]/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#E8D9B8]">
                    {(selectedId === featured.id ? draft.badge : featured.badge) || 'Special Offer'}
                  </span>
                  <h3 className="mt-4 font-display text-[1.75rem] font-semibold leading-tight">
                    {selectedId === featured.id
                      ? draft.headline || 'Headline'
                      : featured.headline || 'Headline'}
                  </h3>
                  <p className="mt-2 text-[13px] text-white/85">
                    {selectedId === featured.id
                      ? draft.description || 'Description'
                      : featured.description || 'Description'}
                  </p>
                  <div className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#E8D9B8] px-4 text-[13px] font-semibold text-[#073D2C]">
                    {selectedId === featured.id
                      ? draft.ctaLabel || 'View Special Promo Today'
                      : featured.ctaLabel || 'View Special Promo Today'}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-ui">No active promos — card is hidden on the site.</p>
            )}
            <p className="mt-3 text-[11px] text-slate-ui">
              Modal will show {Math.max(activeCount, draft.isActive ? 1 : 0)} slide
              {activeCount === 1 ? '' : 's'} when published.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
