import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from './Button'

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  widthClass = 'w-full max-w-md',
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  widthClass?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-emerald-950/30" aria-label="Close drawer" onClick={onClose} />
      <aside className={cn('relative z-10 flex h-full flex-col bg-white shadow-xl', widthClass)}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl text-charcoal">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">{children}</div>
        {footer ? <div className="border-t border-border p-5">{footer}</div> : null}
      </aside>
    </div>
  )
}
