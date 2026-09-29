import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-emerald-900 text-white hover:bg-emerald-800 hover:brightness-110 active:bg-emerald-950',
        secondary:
          'border border-border bg-white text-charcoal hover:border-emerald-800/30 hover:bg-emerald-50 hover:text-emerald-950',
        gold: 'bg-gold text-emerald-950 hover:bg-gold-600 hover:brightness-105 active:brightness-95',
        ghost: 'text-charcoal hover:bg-emerald-50 hover:text-emerald-900',
        destructive: 'border border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50',
        outline: 'border border-emerald-900 text-emerald-900 hover:bg-emerald-900 hover:text-white',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-5',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
