import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Button } from './Button'

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  onConfirm,
  destructive,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  confirmLabel?: string
  onConfirm?: () => void
  destructive?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-emerald-950/40" aria-label="Close dialog" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-[12px] bg-white p-6 shadow-xl">
        <h3 className="font-display text-lg font-semibold tracking-tight text-charcoal">{title}</h3>
        {description ? <p className="mt-2 text-sm text-slate-ui">{description}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {onConfirm ? (
            <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function EmptyState({
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
    <div className={cn('flex flex-col items-center justify-center rounded-[12px] border border-dashed border-border bg-white px-6 py-12 text-center', className)}>
      <h3 className="font-display text-base font-semibold tracking-tight text-charcoal">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-ui">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-beige', className)} />
}
