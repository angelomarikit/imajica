import { useState } from 'react'
import { Plus, Users, Wallet, Package as PackageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { SearchInput } from '@/components/ui/SearchInput'
import { Tabs } from '@/components/ui/Tabs'
import { demoPackages, demoTreatments } from '@/constants/demoData'
import type { Package } from '@/types'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'

export function PackagesPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Package | null>(demoPackages[0] ?? null)

  const filtered = demoPackages.filter((p) => {
    if (tab === 'memberships' && p.type !== 'membership') return false
    if (tab === 'active' && p.status !== 'active') return false
    if (tab === 'inactive' && p.status !== 'inactive') return false
    if (tab === 'promos' && p.type !== 'promo') return false
    return p.name.toLowerCase().includes(query.toLowerCase())
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Packages & Memberships</h1>
          <p className="text-sm text-slate-ui">Create packages, track usage, and manage memberships.</p>
        </div>
        <Button><Plus className="h-4 w-4" /> Create New Package</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Packages" value="0" icon={<PackageIcon className="h-4 w-4" />} />
        <KpiCard label="Total Members" value="0" icon={<Users className="h-4 w-4" />} />
        <KpiCard label="Monthly Revenue" value={formatPeso(0)} icon={<Wallet className="h-4 w-4" />} />
        <KpiCard label="Package Utilization" value="—" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="p-4">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'all', label: 'All Packages' },
              { id: 'memberships', label: 'Memberships' },
              { id: 'active', label: 'Active' },
              { id: 'inactive', label: 'Inactive' },
              { id: 'promos', label: 'Promos' },
            ]}
          />
          <SearchInput value={query} onChange={setQuery} placeholder="Search packages..." className="my-4 max-w-sm" />
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-ui">
                <tr>
                  <th className="px-2 py-2">Package</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Price</th>
                  <th className="px-2 py-2">Members</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={cn('cursor-pointer border-t border-border/70', selected?.id === p.id && 'bg-emerald-50')}
                  >
                    <td className="px-2 py-3 font-medium">{p.name}</td>
                    <td className="px-2 py-3"><Badge variant={p.type === 'membership' ? 'purple' : 'gold'}>{p.type}</Badge></td>
                    <td className="px-2 py-3">
                      {p.promoPrice ? (
                        <span>
                          <span className="mr-2 text-xs text-slate-ui line-through">{formatPeso(p.regularPrice)}</span>
                          {formatPeso(p.promoPrice)}
                        </span>
                      ) : (
                        formatPeso(p.regularPrice)
                      )}
                    </td>
                    <td className="px-2 py-3">{p.memberCount}</td>
                    <td className="px-2 py-3"><Badge variant="success">Active</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden">
          {selected ? (
            <>
          <img src="https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&q=80" alt="" className="h-36 w-full object-cover" />
          <div className="p-4">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl">{selected.name}</h2>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-ui">{selected.description}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="font-metric text-3xl font-semibold tracking-tight">{formatPeso(selected.promoPrice ?? selected.regularPrice)}</span>
              {selected.promoPrice ? (
                <>
                  <span className="text-sm text-slate-ui line-through">{formatPeso(selected.regularPrice)}</span>
                  <Badge variant="gold">25% OFF</Badge>
                </>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-[10px] bg-beige p-2"><p className="font-semibold">{selected.sessions}</p>Sessions</div>
              <div className="rounded-[10px] bg-beige p-2"><p className="font-semibold">{selected.validityMonths} mo</p>Validity</div>
              <div className="rounded-[10px] bg-beige p-2"><p className="font-semibold">{selected.memberCount}</p>Members</div>
            </div>
            <CardHeader className="mt-5 mb-2" title="Treatment Inclusions" />
            <ul className="space-y-2">
              {selected.includedTreatmentIds.map((id) => {
                const t = demoTreatments.find((x) => x.id === id)
                return (
                  <li key={id} className="rounded-[10px] border border-border p-3 text-sm">
                    <p className="font-medium">{t?.name}</p>
                    <p className="text-xs text-slate-ui">{t?.description}</p>
                  </li>
                )
              })}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm">Edit Package</Button>
              <Button variant="secondary" size="sm">Duplicate</Button>
              <Button variant="destructive" size="sm">Deactivate</Button>
            </div>
          </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-slate-ui">No packages yet.</div>
          )}
        </Card>
      </div>
    </div>
  )
}
