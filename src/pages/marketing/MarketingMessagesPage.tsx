import { useEffect, useMemo, useState } from 'react'
import { Plus, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { getBranches } from '@/services/branchService'
import {
  createMarketingLead,
  deleteMarketingLead,
  FUNNEL_STAGE_LABELS,
  FUNNEL_STAGE_ORDER,
  HANDOFF_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  listMarketingLeads,
  sendLeadToClinic,
  SOCIAL_SOURCES,
  subscribeMarketingLeads,
  type MarketingFunnelStage,
  type MarketingLead,
  type MarketingLeadSource,
} from '@/services/marketingLeadService'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'
import { useEffectiveBranchId, useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { useAuth } from '@/contexts/AuthContext'
import { isBranchMarketingRole } from '@/utils/franchiseAccess'

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-[#073D2C] outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10'

export function MarketingMessagesPage() {
  const { user } = useAuth()
  const headerBranch = useEffectiveBranchId()
  const forcedBranchId = useForcedBranchId()
  const branchLocked = isBranchMarketingRole(user?.role) || Boolean(forcedBranchId)
  const [leads, setLeads] = useState<MarketingLead[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<MarketingFunnelStage | ''>('')
  const [sourceFilter, setSourceFilter] = useState<MarketingLeadSource | ''>('')
  const [addOpen, setAddOpen] = useState(false)
  const [handoffLead, setHandoffLead] = useState<MarketingLead | null>(null)
  const [handoffForm, setHandoffForm] = useState({ branchId: '', note: '' })
  const [handoffSaving, setHandoffSaving] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    branchId: forcedBranchId || '',
    source: 'facebook_ads' as MarketingLeadSource,
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const branches = useMemo(() => {
    const all = getBranches().filter((b) => b.status === 'active' && b.branchType !== 'warehouse')
    if (forcedBranchId) return all.filter((b) => b.id === forcedBranchId)
    return all
  }, [forcedBranchId])

  async function refresh() {
    setLoading(true)
    try {
      setLeads(await listMarketingLeads())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    return subscribeMarketingLeads(() => {
      void refresh()
    })
  }, [])

  const filtered = useMemo(() => {
    let list = leads
    if (headerBranch !== 'all') {
      list = list.filter((l) => l.branchId === headerBranch)
    }
    if (stageFilter) list = list.filter((l) => l.funnelStage === stageFilter)
    if (sourceFilter) list = list.filter((l) => l.source === sourceFilter)
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((l) => {
      const hay = `${l.fullName} ${l.phone} ${l.email} ${l.notes} ${LEAD_SOURCE_LABELS[l.source]}`.toLowerCase()
      return hay.includes(q)
    })
  }, [leads, headerBranch, stageFilter, sourceFilter, query])

  const byStage = useMemo(() => {
    const map: Record<MarketingFunnelStage, number> = {
      message: 0,
      book: 0,
      show_up: 0,
      buy: 0,
      lost: 0,
    }
    for (const l of filtered) map[l.funnelStage] += 1
    return map
  }, [filtered])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fullName.trim()) {
      toast.error('Name is required')
      return
    }
    const resolvedBranchId = forcedBranchId || form.branchId || null
    if (branchLocked && !resolvedBranchId) {
      toast.error('Clinic branch is required')
      return
    }
    setSaving(true)
    try {
      await createMarketingLead({
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        branchId: resolvedBranchId,
        source: form.source,
        notes: form.notes,
      })
      toast.success('Message logged')
      setAddOpen(false)
      setForm({
        fullName: '',
        phone: '',
        email: '',
        branchId: forcedBranchId || (headerBranch !== 'all' ? headerBranch : ''),
        source: 'facebook_ads',
        notes: '',
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function openHandoff(lead: MarketingLead) {
    setHandoffLead(lead)
    setHandoffForm({
      branchId:
        forcedBranchId ||
        lead.branchId ||
        (headerBranch !== 'all' ? headerBranch : ''),
      note: lead.handoffNote || lead.notes || '',
    })
  }

  async function submitHandoff(e: React.FormEvent) {
    e.preventDefault()
    if (!handoffLead) return
    if (!handoffForm.branchId) {
      toast.error('Select a clinic branch')
      return
    }
    setHandoffSaving(true)
    try {
      await sendLeadToClinic(handoffLead.id, {
        branchId: handoffForm.branchId,
        note: handoffForm.note,
      })
      toast.success('Sent to clinic — staff will see it under Marketing Handoffs')
      setHandoffLead(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setHandoffSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Messages"
        description="Log social inquiries and send them to a clinic. Clinic staff update Book → Show up → Buy — Marketing only watches the funnel."
        actions={
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Log message
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FUNNEL_STAGE_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStageFilter(stageFilter === s ? '' : s)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
              stageFilter === s
                ? 'border-emerald-900 bg-emerald-900 text-white'
                : 'border-border bg-white text-slate-700 hover:border-emerald-800/40',
            )}
          >
            {FUNNEL_STAGE_LABELS[s]} ({byStage[s]})
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="text-slate-ui">Search</span>
            <input
              className={fieldClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, phone, notes…"
            />
          </label>
          <label className="text-sm sm:w-44">
            <span className="text-slate-ui">Source</span>
            <select
              className={fieldClass}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as MarketingLeadSource | '')}
            >
              <option value="">All sources</option>
              {SOCIAL_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_SOURCE_LABELS[s]}
                </option>
              ))}
              {(Object.keys(LEAD_SOURCE_LABELS) as MarketingLeadSource[])
                .filter((s) => !SOCIAL_SOURCES.includes(s))
                .map((s) => (
                  <option key={s} value={s}>
                    {LEAD_SOURCE_LABELS[s]}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </Card>

      <div className="overflow-x-auto rounded-[12px] border border-border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">
            <tr className="border-b border-border">
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Source</th>
              <th className="px-3 py-3">Branch</th>
              <th className="px-3 py-3">Stage (clinic)</th>
              <th className="px-3 py-3">Contact</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate-ui">
                  Loading…
                </td>
              </tr>
            ) : null}
            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate-ui">
                  No messages yet — tap Log message to add one.
                </td>
              </tr>
            ) : null}
            {!loading &&
              filtered.map((lead) => (
                  <tr key={lead.id} className="border-t border-border/70 hover:bg-ivory-50">
                    <td className="px-3 py-3 font-medium text-[#073D2C]">{lead.fullName}</td>
                    <td className="px-3 py-3 text-slate-ui">{LEAD_SOURCE_LABELS[lead.source]}</td>
                    <td className="px-3 py-3">{lead.branchName}</td>
                    <td className="px-3 py-3">
                      <Badge variant="neutral">{FUNNEL_STAGE_LABELS[lead.funnelStage]}</Badge>
                      {lead.funnelStage === 'buy' && lead.saleAmount != null ? (
                        <span className="ml-2 text-xs text-emerald-800">
                          {formatPesoExact(lead.saleAmount)}
                        </span>
                      ) : null}
                      {lead.funnelStage === 'buy' && lead.notes.includes('Sale:') ? (
                        <span className="mt-1 block text-[11px] text-emerald-800">
                          {lead.notes
                            .split('\n')
                            .filter((l) => l.startsWith('Sale:'))
                            .join(' · ')}
                        </span>
                      ) : null}
                      {lead.clientId ? (
                        <span className="mt-1 block text-[11px] text-sky-700">Patient linked</span>
                      ) : null}
                      {lead.handoffStatus ? (
                        <span className="mt-1 block text-[11px] text-sky-700">
                          Clinic: {HANDOFF_STATUS_LABELS[lead.handoffStatus]}
                        </span>
                      ) : (
                        <span className="mt-1 block text-[11px] text-amber-700">
                          Not sent yet — clinic booking/sales auto-update after handoff
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-ui">
                      {lead.phone || lead.email || '—'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {lead.funnelStage !== 'lost' && lead.funnelStage !== 'buy' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="text-xs"
                            onClick={() => openHandoff(lead)}
                          >
                            <Send className="h-3.5 w-3.5" />
                            {lead.handoffStatus ? 'Resend' : 'Send to clinic'}
                          </Button>
                        ) : null}
                        <button
                          type="button"
                          aria-label="Delete"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (!confirm(`Remove ${lead.fullName}?`)) return
                            void deleteMarketingLead(lead.id).then(() => toast.success('Removed'))
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Log message">
        <form onSubmit={(e) => void handleAdd(e)} className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-[#073D2C]">Name *</span>
            <input
              className={fieldClass}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-[#073D2C]">Phone</span>
              <input
                className={fieldClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-[#073D2C]">Email</span>
              <input
                type="email"
                className={fieldClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-[#073D2C]">Source</span>
            <select
              className={fieldClass}
              value={form.source}
              onChange={(e) =>
                setForm({ ...form, source: e.target.value as MarketingLeadSource })
              }
            >
              {Object.entries(LEAD_SOURCE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[#073D2C]">Clinic branch</span>
            <select
              className={fieldClass}
              value={forcedBranchId || form.branchId}
              disabled={branchLocked}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            >
              {!branchLocked ? <option value="">Not sure yet</option> : null}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {branchLocked ? (
              <span className="mt-1 block text-[11px] text-slate-ui">
                Locked to your assigned clinic.
              </span>
            ) : null}
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[#073D2C]">Notes</span>
            <textarea
              className={cn(fieldClass, 'min-h-[80px]')}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(handoffLead)}
        onClose={() => setHandoffLead(null)}
        title="Send to clinic"
        description={
          handoffLead
            ? `Pass ${handoffLead.fullName}'s details to clinic staff. They get a notification under Marketing Handoffs.`
            : undefined
        }
      >
        <form onSubmit={(e) => void submitHandoff(e)} className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-[#073D2C]">Clinic *</span>
            <select
              className={fieldClass}
              value={forcedBranchId || handoffForm.branchId}
              disabled={branchLocked}
              onChange={(e) => setHandoffForm({ ...handoffForm, branchId: e.target.value })}
              required
            >
              {!branchLocked ? <option value="">Select clinic</option> : null}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {branchLocked ? (
              <span className="mt-1 block text-[11px] text-slate-ui">
                Handoffs go only to your assigned clinic.
              </span>
            ) : null}
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[#073D2C]">Note for staff</span>
            <textarea
              className={cn(fieldClass, 'min-h-[90px]')}
              value={handoffForm.note}
              onChange={(e) => setHandoffForm({ ...handoffForm, note: e.target.value })}
              placeholder="Preferred day/time, treatment interest, etc."
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setHandoffLead(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={handoffSaving}>
              <Send className="h-4 w-4" />
              {handoffSaving ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
