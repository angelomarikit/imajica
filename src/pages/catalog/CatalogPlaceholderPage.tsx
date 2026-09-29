import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function CatalogPlaceholderPage({
  title,
  description,
  ctaTo,
  ctaLabel,
}: {
  title: string
  description: string
  ctaTo?: string
  ctaLabel?: string
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C5A059]">
          Catalog
        </p>
        <h1 className="font-display text-4xl text-[#073D2C]">{title}</h1>
        <p className="text-sm text-slate-ui">{description}</p>
      </div>
      <Card className="p-8 text-center">
        <p className="text-sm text-slate-ui">
          This catalog section is reserved for the next build. Structure and Supabase tables will
          follow the same pattern as Services & Packages.
        </p>
        {ctaTo && ctaLabel ? (
          <Link to={ctaTo} className="mt-4 inline-block">
            <Button>{ctaLabel}</Button>
          </Link>
        ) : null}
      </Card>
    </div>
  )
}
