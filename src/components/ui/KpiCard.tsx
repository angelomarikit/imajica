import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function KpiCard({
  label,
  value,
  subtext,
  icon,
  trend,
  className,
}: {
  label: string
  value: string
  subtext?: string
  icon?: ReactNode
  trend?: string
  className?: string
}) {
  return (
    <div className={cn('rounded-[12px] border border-border/80 bg-white p-4 shadow-[0_1px_3px_rgba(10,46,38,0.04)]', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-ui">{label}</p>
          <p className="mt-2 font-metric text-3xl font-semibold text-charcoal">{value}</p>
          {subtext ? <p className="mt-1 text-xs text-slate-ui">{subtext}</p> : null}
          {trend ? <p className="mt-1 text-xs font-medium text-emerald-700">{trend}</p> : null}
        </div>
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 text-gold">{icon}</div>
        ) : null}
      </div>
    </div>
  )
}
