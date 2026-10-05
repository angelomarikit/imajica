import type { MarketingAdSpend } from '@/services/marketingAdSpendService'
import type { MarketingLead, MarketingFunnelStage } from '@/services/marketingLeadService'

/** Client targets from funnel workshop */
export const MARKETING_KPI_TARGETS = {
  cpm: 50,
  bookingRatePct: 2.5,
  showUpRatePct: 85,
  closingRatePct: 80,
  aov: 15_000,
  revenuePerBranch: 2_000_000,
} as const

export type MarketingKpiSnapshot = {
  messages: number
  booked: number
  showedUp: number
  bought: number
  lost: number
  adSpend: number
  cpm: number | null
  bookingRatePct: number | null
  showUpRatePct: number | null
  closingRatePct: number | null
  revenue: number
  aov: number | null
  revenueGoal: number
  goalProgressPct: number | null
}

function inRange(iso: string, from?: string, to?: string): boolean {
  const d = iso.slice(0, 10)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

function stageAtLeast(stage: MarketingFunnelStage, min: MarketingFunnelStage): boolean {
  const order: MarketingFunnelStage[] = ['message', 'book', 'show_up', 'buy', 'lost']
  if (stage === 'lost') return false
  return order.indexOf(stage) >= order.indexOf(min)
}

export function computeMarketingKpis(
  leads: MarketingLead[],
  spendRows: MarketingAdSpend[],
  opts?: {
    branchId?: string | 'all'
    from?: string
    to?: string
    revenueGoal?: number
  },
): MarketingKpiSnapshot {
  const branchId = opts?.branchId
  const from = opts?.from
  const to = opts?.to
  const revenueGoal = opts?.revenueGoal ?? MARKETING_KPI_TARGETS.revenuePerBranch

  const filteredLeads = leads.filter((l) => {
    if (branchId && branchId !== 'all' && l.branchId !== branchId) return false
    return inRange(l.createdAt, from, to)
  })

  const filteredSpend = spendRows.filter((s) => {
    if (branchId && branchId !== 'all' && s.branchId && s.branchId !== branchId) return false
    if (branchId && branchId !== 'all' && !s.branchId) {
      /* org-wide spend counts toward all branches */
    }
    return inRange(s.spendDate, from, to)
  })

  const messages = filteredLeads.filter((l) => l.funnelStage !== 'lost').length
  const booked = filteredLeads.filter((l) => stageAtLeast(l.funnelStage, 'book')).length
  const showedUp = filteredLeads.filter((l) => stageAtLeast(l.funnelStage, 'show_up')).length
  const bought = filteredLeads.filter((l) => l.funnelStage === 'buy').length
  const lost = filteredLeads.filter((l) => l.funnelStage === 'lost').length

  const adSpend = filteredSpend.reduce((sum, s) => sum + s.amount, 0)
  const cpm = messages > 0 ? adSpend / messages : null

  const bookingRatePct = messages > 0 ? (booked / messages) * 100 : null
  const showUpRatePct = booked > 0 ? (showedUp / booked) * 100 : null
  const closingRatePct = showedUp > 0 ? (bought / showedUp) * 100 : null

  const buyRows = filteredLeads.filter((l) => l.funnelStage === 'buy')
  const revenue = buyRows.reduce((sum, l) => sum + (l.saleAmount ?? MARKETING_KPI_TARGETS.aov), 0)
  const aov = bought > 0 ? revenue / bought : null

  const goalProgressPct = revenueGoal > 0 ? (revenue / revenueGoal) * 100 : null

  return {
    messages,
    booked,
    showedUp,
    bought,
    lost,
    adSpend,
    cpm,
    bookingRatePct,
    showUpRatePct,
    closingRatePct,
    revenue,
    aov,
    revenueGoal,
    goalProgressPct,
  }
}

export function kpiStatus(
  value: number | null,
  target: number,
  higherIsBetter: boolean,
): 'good' | 'warn' | 'neutral' {
  if (value == null || Number.isNaN(value)) return 'neutral'
  if (higherIsBetter) {
    if (value >= target) return 'good'
    if (value >= target * 0.7) return 'warn'
    return 'warn'
  }
  // lower is better (CPM)
  if (value <= target) return 'good'
  if (value <= target * 1.3) return 'warn'
  return 'warn'
}
