import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Phone, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import {
  FUNNEL_STAGE_LABELS,
  HANDOFF_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  listMarketingHandoffs,
  markHandoffSeen,
  subscribeMarketingLeads,
  type MarketingFunnelStage,
  type MarketingHandoffStatus,
  type MarketingLead,
} from '@/services/marketingLeadService'
import { isBranchOwner, isTimeclockStaff } from '@/utils/franchiseAccess'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'

function handoffVariant(
  status: MarketingHandoffStatus,
): 'success' | 'warning' | 'neutral' | 'danger' {
  if (status === 'booked') return 'success'
  if (status === 'sent') return 'warning'
  if (status === 'seen') return 'neutral'
  return 'danger'
}

function funnelVariant(
  stage: MarketingFunnelStage,
): 'success' | 'warning' | 'neutral' | 'info' | 'danger' {
  if (stage === 'buy') return 'success'
  if (stage === 'show_up') return 'info'
  if (stage === 'book') return 'warning'
  if (stage === 'lost') return 'danger'
  return 'neutral'
}

function statusHint(lead: MarketingLead): string {
  if (lead.funnelStage === 'buy') {
    return 'Sale synced from checkout — Marketing KPIs updated'
  }
  if (lead.funnelStage === 'show_up') {
    return 'Patient showed / service in progress — waiting for checkout'
  }
  if (lead.funnelStage === 'book') {
    return 'Booked via Appointments — status updates when they show or buy'
  }
  if (lead.funnelStage === 'lost') {
    return 'Booking cancelled or lead lost'
  }
  return 'Waiting for clinic to book this patient (same full name + phone)'
}

function saleLines(notes: string): string[] {
  return notes.split('\n').filter((l) => l.startsWith('Sale:'))
}

export function MarketingHandoffsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<MarketingLead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'open' | 'all'>('open')

  const branchScope = useMemo(() => {
    if (!user) return null
    if (isBranchOwner(user) || isTimeclockStaff(user)) return user.branchId ?? null
    return null
  }, [user])

  async function refresh() {
    setLoading(true)
    try {
      setRows(await listMarketingHandoffs(branchScope))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load handoffs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    return subscribeMarketingLeads(() => {
      void refresh()
    })
  }, [branchScope])

  const visible = useMemo(() => {
    if (filter === 'all') return rows
    return rows.filter(
      (r) =>
        r.handoffStatus === 'sent' ||
        r.handoffStatus === 'seen' ||
        (r.handoffStatus === 'booked' && r.funnelStage !== 'buy' && r.funnelStage !== 'lost'),
    )
  }, [rows, filter])

  const unread = rows.filter((r) => r.handoffStatus === 'sent').length

  async function openCard(lead: MarketingLead) {
    if (lead.handoffStatus === 'sent') {
      try {
        await markHandoffSeen(lead.id)
      } catch {
        /* non-blocking */
      }
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Marketing Handoffs"
        description="Status reminder only — Book, cancel, show-up, and checkout in Appointments / Sales auto-update Marketing (name + phone match)."
        stat={{ value: unread, label: 'New' }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('open')}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-semibold',
            filter === 'open'
              ? 'border-emerald-900 bg-emerald-900 text-white'
              : 'border-border bg-white text-slate-700',
          )}
        >
          Open
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-semibold',
            filter === 'all'
              ? 'border-emerald-900 bg-emerald-900 text-white'
              : 'border-border bg-white text-slate-700',
          )}
        >
          All
        </button>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-sm text-slate-ui">Loading handoffs…</Card>
      ) : null}

      {!loading && visible.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-ui">
          No handoffs yet. When Marketing taps <strong>Send to clinic</strong>, they appear here.
        </Card>
      ) : null}

      <div className="grid gap-3">
        {visible.map((lead) => {
          const sales = saleLines(lead.notes)
          return (
            <Card
              key={lead.id}
              className={cn(
                'p-4 sm:p-5',
                lead.handoffStatus === 'sent' && 'border-emerald-800/30 bg-emerald-50/40',
              )}
              onClick={() => void openCard(lead)}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0084FF] text-white">
                  <MessageCircle className="h-5 w-5" fill="currentColor" />
                  {lead.handoffStatus === 'sent' ? (
                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-[#073D2C]">{lead.fullName}</h2>
                    <Badge variant={funnelVariant(lead.funnelStage)}>
                      {FUNNEL_STAGE_LABELS[lead.funnelStage]}
                    </Badge>
                    {lead.handoffStatus ? (
                      <Badge variant={handoffVariant(lead.handoffStatus)}>
                        {HANDOFF_STATUS_LABELS[lead.handoffStatus]}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-ui">
                    {LEAD_SOURCE_LABELS[lead.source]} · {lead.branchName}
                  </p>
                  {lead.handoffNote ? (
                    <p className="mt-2 rounded-[10px] bg-white/80 px-3 py-2 text-sm text-[#073D2C] ring-1 ring-border/60">
                      {lead.handoffNote}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs font-medium text-emerald-900/80">{statusHint(lead)}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-ui">
                    {lead.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {lead.phone}
                      </span>
                    ) : null}
                    {lead.email ? (
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="h-3.5 w-3.5" /> {lead.email}
                      </span>
                    ) : null}
                    {lead.saleAmount != null && lead.funnelStage === 'buy' ? (
                      <span className="font-medium text-emerald-800">
                        Sale {formatPesoExact(lead.saleAmount)}
                      </span>
                    ) : null}
                    {sales.map((line) => (
                      <span key={line} className="font-medium text-emerald-800">
                        {line}
                      </span>
                    ))}
                    {lead.clientId ? (
                      <Link
                        to={`/admin/clients/${lead.clientId}`}
                        className="font-medium text-sky-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Patient profile
                      </Link>
                    ) : null}
                    {lead.handoffSentAt ? (
                      <span>Sent {new Date(lead.handoffSentAt).toLocaleString()}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
