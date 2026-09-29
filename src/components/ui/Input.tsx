import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export function Input({ className, label, error, leftIcon, rightIcon, id, ...props }: InputProps) {
  const inputId = id ?? props.name
  return (
    <div className="w-full space-y-1.5">
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-semibold text-charcoal">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gold">
            {leftIcon}
          </span>
        ) : null}
        <input
          id={inputId}
          className={cn(
            'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-200',
            className,
          )}
          {...props}
        />
        {rightIcon ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-ui">{rightIcon}</span>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
