import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

/**
 * Animated mobile/tablet overlay drawer (slide + backdrop fade).
 * Keeps the panel mounted briefly on close so exit animation can play.
 */
export function MobileDrawer({
  open,
  onClose,
  side = 'left',
  widthClassName = 'w-72 max-w-[85vw]',
  panelClassName,
  rootClassName = 'fixed inset-0 z-50 lg:hidden',
  children,
}: {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  widthClassName?: string
  panelClassName?: string
  /** Override root positioning / breakpoint (e.g. landing uses xl:hidden). */
  rootClassName?: string
  children: ReactNode
}) {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEntered(true))
      })
      return () => window.cancelAnimationFrame(id)
    }
    setEntered(false)
    const t = window.setTimeout(() => setMounted(false), 300)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mounted])

  if (!mounted) return null

  const fromLeft = side === 'left'

  return (
    <div className={rootClassName} role="dialog" aria-modal="true">
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ease-out',
          entered ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-label="Close menu"
      />
      <div
        className={cn(
          'absolute top-0 flex h-full flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          widthClassName,
          panelClassName,
          fromLeft ? 'left-0' : 'right-0',
          entered
            ? 'translate-x-0'
            : fromLeft
              ? '-translate-x-full'
              : 'translate-x-full',
        )}
      >
        {children}
      </div>
    </div>
  )
}
