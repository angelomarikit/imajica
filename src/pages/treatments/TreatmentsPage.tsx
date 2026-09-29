import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, MoreHorizontal, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { SearchInput } from '@/components/ui/SearchInput'
import { demoTreatments } from '@/constants/demoData'
import type { Treatment, TreatmentCategorySlug } from '@/types'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'

const categories: Array<'all' | TreatmentCategorySlug> = ['all', 'facial', 'skin', 'body', 'injectables', 'wellness', 'others']

export function TreatmentsPage() {
  const [category, setCategory] = useState<(typeof categories)[number]>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Treatment | null>(null)
  const [drawerTab, setDrawerTab] = useState('overview')

  const filtered = useMemo(
    () =>
      demoTreatments.filter(
        (t) =>
          (category === 'all' || t.category === category) &&
          t.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [category, query],
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Treatments & Services</h1>
          <p className="text-sm text-slate-ui">Manage your aesthetic treatments, pricing, and details.</p>
        </div>
        <Button><Plus className="h-4 w-4" /> Add New Treatment</Button>
      </div>

      <Card className="relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1400&q=80" alt="" className="h-36 w-full object-cover" />
        <p className="absolute bottom-4 right-6 font-display text-2xl italic text-white drop-shadow">Look Good Feel Good Be Confident</p>
      </Card>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              'rounded-[10px] border px-3 py-2 text-sm capitalize',
              category === c ? 'border-emerald-900 bg-emerald-900 text-white' : 'border-border bg-white',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search treatments..." className="max-w-sm flex-1" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {filtered.map((t) => (
          <button key={t.id} type="button" onClick={() => setSelected(t)} className="text-left">
            <Card className="overflow-hidden transition hover:shadow-md">
              <div className="relative h-36 bg-beige">
                <img src={`https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&q=80&sig=${t.id}`} alt="" className="h-full w-full object-cover" />
                <span className="absolute right-2 top-2 rounded-full bg-white/90 p-1"><MoreHorizontal className="h-4 w-4" /></span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{t.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-slate-ui">{t.description}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 text-slate-ui"><Clock className="h-3.5 w-3.5" />{t.durationMinutes} minutes</span>
                  <span className="font-semibold">{formatPeso(t.price)}</span>
                </div>
                <Badge className="mt-3" variant="success">Active</Badge>
              </div>
            </Card>
          </button>
        ))}
      </div>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name}
        widthClass="w-full max-w-lg"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1">Edit Treatment</Button>
            <Button className="flex-1">Set Inactive</Button>
          </div>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <img src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80" alt="" className="h-44 w-full rounded-[12px] object-cover" />
            <div className="flex items-center gap-2">
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {['overview', 'pricing', 'benefits', 'procedure', 'media'].map((id) => (
                <button key={id} type="button" onClick={() => setDrawerTab(id)} className={cn('rounded-full border px-3 py-1 text-xs capitalize', drawerTab === id ? 'border-emerald-900 bg-emerald-900 text-white' : 'border-border')}>
                  {id}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-ui">{selected.description}</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[10px] bg-beige p-3 text-center"><p className="text-xs text-slate-ui">Duration</p><p className="font-semibold">{selected.durationMinutes} min</p></div>
              <div className="rounded-[10px] bg-beige p-3 text-center"><p className="text-xs text-slate-ui">Category</p><p className="font-semibold capitalize">{selected.category}</p></div>
              <div className="rounded-[10px] bg-beige p-3 text-center"><p className="text-xs text-slate-ui">Price</p><p className="font-semibold">{formatPeso(selected.price)}</p></div>
            </div>
            <ul className="space-y-2">
              {selected.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-800" />{b}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}
