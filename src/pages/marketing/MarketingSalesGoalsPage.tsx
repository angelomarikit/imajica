import { useEffect, useMemo, useState } from 'react'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { getBranches } from '@/services/branchService'
import { listMarketingAdSpend } from '@/services/marketingAdSpendService'
import {
  computeMarketingKpis,
  MARKETING_KPI_TARGETS,
} from '@/services/marketingKpiService'
import { listMarketingLeads } from '@/services/marketingLeadService'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'

export function MarketingSalesGoalsPage() {
  const [leads, setLeads] = useState<Awaited<ReturnType<typeof listMarketingLeads>>>([])
  const [spend, setSpend] = useState<Awaited<ReturnType<typeof listMarketingAdSpend>>>([])

  useEffect(() => {
    void Promise.all([listMarketingLeads(), listMarketingAdSpend()]).then(([l, s]) => {
      setLeads(l)
      setSpend(s)
    })
  }, [])

  const branches = useMemo(
    () => getBranches().filter((b) => b.status === 'active' && b.branchType !== 'warehouse'),
    [],
  )

  const orgKpi = useMemo(() => computeMarketingKpis(leads, spend, { branchId: 'all' }), [leads, spend])

  const branchRows = useMemo(() => {
    return branches.map((b) => {
      const kpi = computeMarketingKpis(leads, spend, { branchId: b.id })
      return { branch: b, kpi }
    })
  }, [branches, leads, spend])

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Sales & Goals"
        description="Closing rate, average order value, and revenue progress toward ₱2,000,000 per branch."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue (all clinics)"
          value={formatPesoExact(orgKpi.revenue)}
        />
        <KpiCard
          label="Closing rate (CR)"
          value={orgKpi.closingRatePct != null ? `${orgKpi.closingRatePct.toFixed(1)}%` : '—'}
          subtext={`Target ${MARKETING_KPI_TARGETS.closingRatePct}%`}
        />
        <KpiCard
          label="AOV"
          value={orgKpi.aov != null ? formatPesoExact(orgKpi.aov) : '—'}
          subtext={`Target ${formatPesoExact(MARKETING_KPI_TARGETS.aov)}`}
        />
        <KpiCard
          label="Clients bought"
          value={String(orgKpi.bought)}
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-[#073D2C]">Per branch — ₱2M goal</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border bg-ivory-50">
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Buy</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">CR</th>
                <th className="px-4 py-3">AOV</th>
                <th className="px-4 py-3">Goal %</th>
              </tr>
            </thead>
            <tbody>
              {branchRows.map(({ branch, kpi }) => {
                const pct = kpi.goalProgressPct ?? 0
                return (
                  <tr key={branch.id} className="border-t border-border/70">
                    <td className="px-4 py-3 font-medium text-[#073D2C]">{branch.name}</td>
                    <td className="px-4 py-3">{kpi.bought}</td>
                    <td className="px-4 py-3">{formatPesoExact(kpi.revenue)}</td>
                    <td className="px-4 py-3">
                      {kpi.closingRatePct != null ? `${kpi.closingRatePct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {kpi.aov != null ? formatPesoExact(kpi.aov) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[8rem] items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              pct >= 100 ? 'bg-emerald-600' : 'bg-gold',
                            )}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium tabular-nums">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-slate-ui">
        Revenue comes from leads marked <strong>Buy</strong> in Messages (sale amount). Default
        ₱15,000 is used if no amount was entered.
      </p>
    </div>
  )
}
