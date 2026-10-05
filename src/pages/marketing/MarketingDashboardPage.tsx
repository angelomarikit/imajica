import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Megaphone, MessageCircle, Target, TrendingUp } from 'lucide-react'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { useEffectiveBranchId } from '@/hooks/useEffectiveBranchId'
import { listMarketingAdSpend, subscribeMarketingAdSpend } from '@/services/marketingAdSpendService'
import {
  computeMarketingKpis,
  MARKETING_KPI_TARGETS,
} from '@/services/marketingKpiService'
import { listMarketingLeads, subscribeMarketingLeads } from '@/services/marketingLeadService'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'

const FUNNEL = [
  { key: 'messages', label: 'Message', color: 'bg-emerald-100 text-emerald-900' },
  { key: 'booked', label: 'Book', color: 'bg-gold-100 text-emerald-950' },
  { key: 'showedUp', label: 'Show up', color: 'bg-emerald-200 text-emerald-950' },
  { key: 'bought', label: 'Buy', color: 'bg-emerald-900 text-white' },
] as const

function defaultRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  }
}

export function MarketingDashboardPage() {
  const branchId = useEffectiveBranchId()
  const [range] = useState(defaultRange)
  const [leads, setLeads] = useState<Awaited<ReturnType<typeof listMarketingLeads>>>([])
  const [spend, setSpend] = useState<Awaited<ReturnType<typeof listMarketingAdSpend>>>([])

  useEffect(() => {
    void Promise.all([listMarketingLeads(), listMarketingAdSpend()]).then(([l, s]) => {
      setLeads(l)
      setSpend(s)
    })
    const unsubL = subscribeMarketingLeads(() => {
      void listMarketingLeads().then(setLeads)
    })
    const unsubS = subscribeMarketingAdSpend(() => {
      void listMarketingAdSpend().then(setSpend)
    })
    return () => {
      unsubL()
      unsubS()
    }
  }, [])

  const kpi = useMemo(
    () =>
      computeMarketingKpis(leads, spend, {
        branchId,
        from: range.from,
        to: range.to,
      }),
    [leads, spend, branchId, range.from, range.to],
  )

  const counts: Record<(typeof FUNNEL)[number]['key'], number> = {
    messages: kpi.messages,
    booked: kpi.booked,
    showedUp: kpi.showedUp,
    bought: kpi.bought,
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="KPI Overview"
        description="ADS → Message → Book → Show up → Buy. Track cost per message, booking rate, show-up rate, closing rate, and revenue vs ₱2M per branch."
      />

      <Card className="p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">Funnel (this month)</p>
        <div className="mt-3 flex flex-wrap items-stretch gap-2">
          {FUNNEL.map((step, i) => (
            <div key={step.key} className="flex min-w-[4.5rem] flex-1 items-center gap-2">
              <div
                className={cn(
                  'flex flex-1 flex-col items-center justify-center rounded-[12px] px-2 py-3 text-center',
                  step.color,
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  {step.label}
                </span>
                <span className="font-display text-xl font-bold">{counts[step.key]}</span>
              </div>
              {i < FUNNEL.length - 1 ? (
                <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
              ) : null}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-ui">
          Log every DM under{' '}
          <Link to="/admin/marketing/messages" className="font-medium text-emerald-800 hover:underline">
            Messages
          </Link>
          , then <strong>Send to clinic</strong>. Clinic staff update Book → Show up → Buy on Marketing
          Handoffs — your KPIs update automatically.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="CPM (cost / message)"
          value={kpi.cpm != null ? formatPesoExact(kpi.cpm) : '—'}
          subtext={`Target ≤ ${formatPesoExact(MARKETING_KPI_TARGETS.cpm)}`}
        />
        <KpiCard
          label="Booking rate (BR)"
          value={kpi.bookingRatePct != null ? `${kpi.bookingRatePct.toFixed(1)}%` : '—'}
          subtext={`Target ${MARKETING_KPI_TARGETS.bookingRatePct}%`}
        />
        <KpiCard
          label="Show-up rate (SR)"
          value={kpi.showUpRatePct != null ? `${kpi.showUpRatePct.toFixed(1)}%` : '—'}
          subtext={`Target ${MARKETING_KPI_TARGETS.showUpRatePct}%`}
        />
        <KpiCard
          label="Closing rate (CR)"
          value={kpi.closingRatePct != null ? `${kpi.closingRatePct.toFixed(1)}%` : '—'}
          subtext={`Target ${MARKETING_KPI_TARGETS.closingRatePct}%`}
        />
        <KpiCard
          label="AOV"
          value={kpi.aov != null ? formatPesoExact(kpi.aov) : '—'}
          subtext={`Target ${formatPesoExact(MARKETING_KPI_TARGETS.aov)} / client`}
        />
        <KpiCard
          label="Revenue vs goal"
          value={formatPesoExact(kpi.revenue)}
          subtext={`${kpi.goalProgressPct != null ? `${kpi.goalProgressPct.toFixed(0)}%` : '—'} of ${formatPesoExact(kpi.revenueGoal)} / branch`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link to="/admin/marketing/messages" className="group">
          <Card className="flex h-full items-center gap-3 p-4 transition hover:border-emerald-800/30">
            <MessageCircle className="h-8 w-8 text-gold" />
            <div>
              <p className="font-semibold text-[#073D2C] group-hover:text-emerald-900">Messages</p>
              <p className="text-xs text-slate-ui">Add leads from Facebook, IG, TikTok</p>
            </div>
          </Card>
        </Link>
        <Link to="/admin/marketing/ads" className="group">
          <Card className="flex h-full items-center gap-3 p-4 transition hover:border-emerald-800/30">
            <Megaphone className="h-8 w-8 text-gold" />
            <div>
              <p className="font-semibold text-[#073D2C] group-hover:text-emerald-900">Ads</p>
              <p className="text-xs text-slate-ui">Named campaigns + FB metrics</p>
            </div>
          </Card>
        </Link>
        <Link to="/admin/marketing/sales" className="group">
          <Card className="flex h-full items-center gap-3 p-4 transition hover:border-emerald-800/30">
            <TrendingUp className="h-8 w-8 text-gold" />
            <div>
              <p className="font-semibold text-[#073D2C] group-hover:text-emerald-900">
                Sales & Goals
              </p>
              <p className="text-xs text-slate-ui">Revenue and ₱2M branch target</p>
            </div>
          </Card>
        </Link>
      </div>

      <Card className="flex items-start gap-3 border-dashed border-gold/40 bg-gold-50/40 p-4">
        <Target className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <p className="text-sm text-[#073D2C]">
          <strong>Simple rule:</strong> Marketing logs the message and sends it to a clinic. The clinic
          marks <strong>Booked → Show up → Buy</strong> (with sale amount). You watch CPM / BR / SR / CR
          on this page.
        </p>
      </Card>
    </div>
  )
}
