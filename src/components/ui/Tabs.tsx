import { cn } from '@/utils/cn'

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'rounded-[10px] border px-3.5 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-emerald-900 bg-emerald-900 text-white'
                : 'border-border bg-white text-charcoal hover:bg-ivory-100',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
