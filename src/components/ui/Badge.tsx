import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      success: 'bg-emerald-50 text-emerald-800',
      warning: 'bg-amber-50 text-amber-700',
      danger: 'bg-red-50 text-red-700',
      info: 'bg-sky-50 text-sky-700',
      gold: 'bg-gold-100 text-gold-600',
      neutral: 'bg-ivory-100 text-slate-ui',
      purple: 'bg-violet-50 text-violet-700',
      blue: 'bg-blue-50 text-blue-700',
      orange: 'bg-orange-50 text-orange-700',
    },
  },
  defaultVariants: { variant: 'neutral' },
})

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
