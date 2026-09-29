import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react'
import type { LandingPromo } from '@/types'

export function SpecialPromoModal({
  open,
  onClose,
  promos,
  /** @deprecated prefer `promos` — kept for single-promo callers */
  promo,
  onBook,
}: {
  open: boolean
  onClose: () => void
  promos?: LandingPromo[]
  promo?: LandingPromo
  onBook: () => void
}) {
  const slides = (promos?.length ? promos : promo ? [promo] : []).filter((p) => p.isActive)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  useEffect(() => {
    if (index >= slides.length) setIndex(0)
  }, [index, slides.length])

  if (!open || slides.length === 0) return null

  const current = slides[Math.min(index, slides.length - 1)]
  const multi = slides.length > 1

  function go(delta: number) {
    setIndex((i) => (i + delta + slides.length) % slides.length)
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#041c18]/55 backdrop-blur-[2px]"
        aria-label="Close promo modal"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="special-promo-title"
        className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-[24px] bg-[#073D2C] text-white shadow-[0_28px_80px_rgba(7,61,44,0.4)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(197,160,89,0.18),transparent_60%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0A3D2E] via-[#073D2C] to-[#041c18]"
        />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {multi ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-3"
              aria-label="Previous promo"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-3"
              aria-label="Next promo"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </>
        ) : null}

        <div
          key={current.id}
          className="relative z-10 animate-[promoFade_280ms_ease] px-7 pb-7 pt-8 sm:px-10 sm:pb-8 sm:pt-9"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-[#C5A059]/55 bg-[#C5A059]/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#E8D9B8]">
              {current.badge}
            </span>
            {current.discountLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8D9B8] px-3 py-1 text-[11px] font-semibold text-[#073D2C]">
                <Sparkles className="h-3 w-3" />
                {current.discountLabel}
              </span>
            ) : null}
          </div>

          <h2
            id="special-promo-title"
            className="mt-5 font-display text-[2.15rem] font-semibold leading-[1.1] text-white sm:text-[2.35rem]"
          >
            {current.modalTitle || current.headline}
          </h2>

          <p className="mt-3 text-[14px] font-medium leading-relaxed text-white/88">
            {current.modalBody || current.description}
          </p>

          {current.highlights.length > 0 ? (
            <ul className="mt-6 space-y-3">
              {current.highlights.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[13px] text-white/90">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C5A059]/25 text-[#E8D9B8]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          ) : null}

          {current.validUntil ? (
            <p className="mt-5 text-[12px] text-[#E8D9B8]/90">
              Offer valid until{' '}
              {new Date(current.validUntil).toLocaleDateString('en-PH', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onClose()
              onBook()
            }}
            className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#E8D9B8] px-5 text-[14px] font-semibold text-[#073D2C] transition hover:bg-[#C5A059] hover:text-white"
          >
            Book This Promo
            <ArrowRight className="h-4 w-4" />
          </button>

          {multi ? (
            <div className="mt-5 flex items-center justify-center gap-2" role="tablist" aria-label="Promo slides">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Promo ${i + 1} of ${slides.length}`}
                  onClick={() => setIndex(i)}
                  className={
                    i === index
                      ? 'h-2 w-6 rounded-full bg-[#E8D9B8] transition-all'
                      : 'h-2 w-2 rounded-full bg-white/35 transition-all hover:bg-white/55'
                  }
                />
              ))}
            </div>
          ) : null}

          {multi ? (
            <p className="mt-3 text-center text-[11px] text-white/55">
              {index + 1} of {slides.length} ongoing promos
            </p>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes promoFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
