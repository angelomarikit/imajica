import { Search } from 'lucide-react'
import { cn } from '@/utils/cn'

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-border bg-white pl-10 pr-4 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
      />
    </div>
  )
}

export function Select({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? <label className="block text-sm font-semibold text-charcoal">{label}</label> : null}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
