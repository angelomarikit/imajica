import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Megaphone, Pencil, Plus, Trophy, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { KpiCard } from '@/components/ui/KpiCard'
import { getBranches } from '@/services/branchService'
import {
  AD_CAMPAIGN_STATUS_LABELS,
  AD_SPEND_SOURCE_LABELS,
  campaignDerivedMetrics,
  createMarketingAdSpend,
  deleteMarketingAdSpend,
  listMarketingAdSpend,
  subscribeMarketingAdSpend,
  updateMarketingAdSpend,
  type AdCampaignStatus,
  type AdSpendSource,
  type MarketingAdSpend,
} from '@/services/marketingAdSpendService'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-[#073D2C] outline-none focus:border-[#1877F2]/50 focus:ring-2 focus:ring-[#1877F2]/15'

type FormState = {
  name: string
  source: AdSpendSource
  status: AdCampaignStatus
  spendDate: string
  endDate: string
  amount: string
  impressions: string
  reach: string
  clicks: string
  messages: string
  clients: string
  branchId: string
  notes: string
}

function emptyForm(): FormState {
  return {
    name: '',
    source: 'facebook_ads',
    status: 'active',
    spendDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    amount: '',
    impressions: '',
    reach: '',
    clicks: '',
    messages: '',
    clients: '',
    branchId: '',
    notes: '',
  }
}

function fromCampaign(c: MarketingAdSpend): FormState {
  return {
    name: c.name,
    source: c.source,
    status: c.status,
    spendDate: c.spendDate,
    endDate: c.endDate ?? '',
    amount: String(c.amount || ''),
    impressions: String(c.impressions || ''),
    reach: String(c.reach || ''),
    clicks: String(c.clicks || ''),
    messages: String(c.messages || ''),
    clients: String(c.clients || ''),
    branchId: c.branchId ?? '',
    notes: c.notes,
  }
}

function parseMetric(raw: string): number {
  const n = Number(String(raw).replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function statusVariant(status: AdCampaignStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'paused') return 'warning'
  return 'neutral'
}

export function MarketingAdsPage() {
  const [rows, setRows] = useState<MarketingAdSpend[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MarketingAdSpend | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const branches = useMemo(
    () => getBranches().filter((b) => b.status === 'active' && b.branchType !== 'warehouse'),
    [],
  )

  useEffect(() => {
    void listMarketingAdSpend().then(setRows)
    return subscribeMarketingAdSpend(() => {
      void listMarketingAdSpend().then(setRows)
    })
  }, [])

  const totals = useMemo(() => {
    const spend = rows.reduce((s, r) => s + r.amount, 0)
    const clients = rows.reduce((s, r) => s + r.clients, 0)
    const messages = rows.reduce((s, r) => s + r.messages, 0)
    const best = [...rows].sort((a, b) => b.clients - a.clients)[0] ?? null
    return { spend, clients, messages, best }
  }, [rows])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setOpen(true)
  }

  function openEdit(c: MarketingAdSpend) {
    setEditing(c)
    setForm(fromCampaign(c))
    setOpen(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Enter a campaign name')
      return
    }
    const amount = parseMetric(form.amount)
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        source: form.source,
        status: form.status,
        spendDate: form.spendDate,
        endDate: form.endDate || null,
        amount,
        impressions: parseMetric(form.impressions),
        reach: parseMetric(form.reach),
        clicks: parseMetric(form.clicks),
        messages: parseMetric(form.messages),
        clients: parseMetric(form.clients),
        branchId: form.branchId || null,
        notes: form.notes,
      }
      if (editing) {
        await updateMarketingAdSpend(editing.id, payload)
        toast.success('Campaign updated')
      } else {
        await createMarketingAdSpend(payload)
        toast.success('Campaign created')
      }
      setOpen(false)
      setEditing(null)
      setForm(emptyForm())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Ads"
        description="Facebook-style campaigns — name each ad and enter spend + metrics so you can see which creatives bring the most clients."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Create campaign
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total spend" value={formatPesoExact(totals.spend)} />
        <KpiCard label="Messages attributed" value={String(totals.messages)} />
        <KpiCard label="Clients from ads" value={String(totals.clients)} />
        <KpiCard
          label="Best campaign"
          value={totals.best ? totals.best.name : '—'}
          subtext={
            totals.best
              ? `${totals.best.clients} clients · ${formatPesoExact(totals.best.amount)}`
              : 'Add a named campaign'
          }
        />
      </div>

      {totals.best && totals.best.clients > 0 ? (
        <Card className="flex items-start gap-3 border-[#1877F2]/25 bg-[#1877F2]/5 p-4">
          <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-[#1877F2]" />
          <div>
            <p className="text-sm font-semibold text-[#073D2C]">
              Top performer: {totals.best.name}
            </p>
            <p className="mt-0.5 text-xs text-slate-ui">
              {AD_SPEND_SOURCE_LABELS[totals.best.source]} · {totals.best.clients} clients ·{' '}
              {totals.best.messages} messages · spend {formatPesoExact(totals.best.amount)}
              {campaignDerivedMetrics(totals.best).costPerClient != null
                ? ` · ${formatPesoExact(campaignDerivedMetrics(totals.best).costPerClient!)} / client`
                : ''}
            </p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {rows.length === 0 ? (
          <Card className="p-10 text-center text-sm text-slate-ui">
            No campaigns yet. Create one with a clear name (e.g. “Glow Face — San Mateo Boost”) and
            paste metrics from Ads Manager.
          </Card>
        ) : null}

        {rows.map((c, index) => {
          const d = campaignDerivedMetrics(c)
          return (
            <Card
              key={c.id}
              className={cn(
                'overflow-hidden p-0',
                index === 0 && c.clients > 0 && 'ring-1 ring-[#1877F2]/30',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 bg-[#F0F2F5]/80 px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#1877F2] text-white">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {index === 0 && c.clients > 0 ? (
                        <Badge variant="info">#1 clients</Badge>
                      ) : null}
                      <h2 className="truncate font-semibold text-[#073D2C]">{c.name}</h2>
                      <Badge variant={statusVariant(c.status)}>
                        {AD_CAMPAIGN_STATUS_LABELS[c.status]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-ui">
                      {AD_SPEND_SOURCE_LABELS[c.source]}
                      {c.endDate ? ` · ${c.spendDate} → ${c.endDate}` : ` · started ${c.spendDate}`}
                      {c.notes ? ` · ${c.notes}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-red-600 hover:bg-red-50"
                    aria-label="Delete campaign"
                    onClick={() => {
                      if (!confirm(`Delete “${c.name}”?`)) return
                      void deleteMarketingAdSpend(c.id).then(() => toast.success('Deleted'))
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-border/60 sm:grid-cols-3 lg:grid-cols-6">
                <MetricCell label="Amount spent" value={formatPesoExact(c.amount)} emphasize />
                <MetricCell label="Impressions" value={c.impressions.toLocaleString()} />
                <MetricCell label="Reach" value={c.reach.toLocaleString()} />
                <MetricCell label="Clicks" value={c.clicks.toLocaleString()} />
                <MetricCell label="Messages" value={String(c.messages)} />
                <MetricCell
                  label="Clients"
                  value={String(c.clients)}
                  emphasize
                  hint={
                    d.costPerClient != null
                      ? `${formatPesoExact(d.costPerClient)} / client`
                      : undefined
                  }
                />
              </div>

              <div className="flex flex-wrap gap-4 px-4 py-2.5 text-[11px] text-slate-ui">
                <span>
                  CTR {d.ctr != null ? `${d.ctr.toFixed(2)}%` : '—'}
                </span>
                <span>
                  CPC {d.cpc != null ? formatPesoExact(d.cpc) : '—'}
                </span>
                <span>
                  Cost / message {d.cpm != null ? formatPesoExact(d.cpm) : '—'}
                </span>
              </div>
            </Card>
          )
        })}
      </div>

      <Dialog
        open={open}
        onClose={() => {
          if (saving) return
          setOpen(false)
        }}
        title={editing ? 'Edit campaign' : 'Create campaign'}
        wide
        hideFooter
      >
        <form onSubmit={(e) => void handleSave(e)} className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-[#073D2C]">Campaign name</span>
            <input
              className={fieldClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Glow Face — San Mateo Boost"
              required
            />
            <span className="mt-1 block text-[11px] text-slate-ui">
              Use a clear name so owners can rank which ads generate the most clients.
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-slate-ui">Platform</span>
              <select
                className={fieldClass}
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value as AdSpendSource })}
              >
                {Object.entries(AD_SPEND_SOURCE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-slate-ui">Status</span>
              <select
                className={fieldClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as AdCampaignStatus })}
              >
                {Object.entries(AD_CAMPAIGN_STATUS_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-slate-ui">Start date</span>
              <input
                type="date"
                className={fieldClass}
                value={form.spendDate}
                onChange={(e) => setForm({ ...form, spendDate: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-ui">End date (optional)</span>
              <input
                type="date"
                className={fieldClass}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </label>
          </div>

          <p className="pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-ui">
            Metrics (from Ads Manager)
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              <span className="text-slate-ui">Amount spent (₱)</span>
              <input
                className={fieldClass}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="12500"
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-ui">Impressions</span>
              <input
                className={fieldClass}
                value={form.impressions}
                onChange={(e) => setForm({ ...form, impressions: e.target.value })}
                placeholder="48000"
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-ui">Reach</span>
              <input
                className={fieldClass}
                value={form.reach}
                onChange={(e) => setForm({ ...form, reach: e.target.value })}
                placeholder="31000"
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-ui">Clicks (link / all)</span>
              <input
                className={fieldClass}
                value={form.clicks}
                onChange={(e) => setForm({ ...form, clicks: e.target.value })}
                placeholder="860"
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-ui">Messages</span>
              <input
                className={fieldClass}
                value={form.messages}
                onChange={(e) => setForm({ ...form, messages: e.target.value })}
                placeholder="142"
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-ui">Clients generated</span>
              <input
                className={fieldClass}
                value={form.clients}
                onChange={(e) => setForm({ ...form, clients: e.target.value })}
                placeholder="18"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-slate-ui">Branch (optional)</span>
              <select
                className={fieldClass}
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              >
                <option value="">All / org-wide</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-slate-ui">Notes</span>
              <input
                className={fieldClass}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Creative angle, audience, etc."
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create campaign'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

function MetricCell({
  label,
  value,
  emphasize,
  hint,
}: {
  label: string
  value: string
  emphasize?: boolean
  hint?: string
}) {
  return (
    <div className="bg-white px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-ui">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-sm font-semibold tabular-nums text-[#073D2C]',
          emphasize && 'text-[#1877F2]',
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-[10px] text-slate-ui">{hint}</p> : null}
    </div>
  )
}
