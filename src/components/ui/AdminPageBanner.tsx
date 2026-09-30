import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type AdminPageBannerProps = {
  title: ReactNode
  description?: string
  eyebrow?: string
  /** Optional KPI shown on the right (count, total amount, etc.) */
  stat?: {
    value: ReactNode
    label: string
  }
  actions?: ReactNode
  className?: string
}

export function AdminPageBanner({
  title,
  description,
  eyebrow,
  stat,
  actions,
  className,
}: AdminPageBannerProps) {
  return (
    <header
      className={cn(
        'admin-page-banner group relative overflow-hidden rounded-[18px] text-white',
        'border border-white/10 shadow-[0_20px_48px_rgba(7,61,44,0.28)]',
        className,
      )}
    >
      {/* Base brand gradient */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(135deg,#0A2E26_0%,#073D2C_42%,#0d5c45_78%,#063B2A_100%)]"
      />
      {/* Soft gold ambient glow */}
      <div
        aria-hidden
        className="admin-page-banner__glow pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.35)_0%,transparent_68%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(232,217,184,0.14)_0%,transparent_70%)]"
      />
      {/* Top edge highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C5A059]/55 to-transparent"
      />
      {/* Subtle diagonal shimmer */}
      <div aria-hidden className="admin-page-banner__shimmer pointer-events-none absolute inset-0" />
      {/* Soft grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(180deg, black, transparent 85%)',
        }}
      />

      <div className="relative z-10 flex flex-wrap items-end justify-between gap-5 px-5 py-6 sm:px-7 sm:py-7">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C5A059]">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              'font-display text-[1.5rem] font-semibold leading-tight tracking-tight text-[#F3E6C8] sm:text-[1.85rem]',
              eyebrow && 'mt-1.5',
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-xl text-[13px] font-normal leading-relaxed tracking-normal text-white/70 sm:text-sm">
              {description}
            </p>
          ) : null}
        </div>

        {(stat || actions) && (
          <div className="flex flex-wrap items-end gap-3">
            {actions}
            {stat ? (
              <div className="min-w-[148px] rounded-[12px] border border-[#C5A059]/35 bg-black/25 px-5 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition duration-300 group-hover:border-[#C5A059]/55 group-hover:bg-black/30">
                <p className="font-metric text-[1.85rem] font-semibold leading-none tracking-tight text-[#F3E6C8] sm:text-[2.15rem]">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C5A059]">
                  {stat.label}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </header>
  )
}
