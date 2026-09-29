import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-[12px] border border-border/80 bg-white shadow-[0_1px_3px_rgba(10,46,38,0.04)]', className)}
      {...props}
    />
  )
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div>
        <h3 className="font-display text-xl text-charcoal">{title}</h3>
        {description ? <p className="mt-0.5 text-sm text-slate-ui">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
