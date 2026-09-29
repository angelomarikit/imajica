import { useState } from 'react'
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { SearchInput } from '@/components/ui/SearchInput'
import { Tabs } from '@/components/ui/Tabs'
import { demoInventory, demoMovements } from '@/constants/demoData'
import { formatPeso } from '@/utils/currency'

const trend = [
  { month: 'Feb', value: 420000 },
  { month: 'Mar', value: 450000 },
  { month: 'Apr', value: 470000 },
  { month: 'May', value: 490000 },
  { month: 'Jun', value: 510000 },
  { month: 'Jul', value: 540000 },
  { month: 'Aug', value: 560000 },
  { month: 'Sep', value: 583200 },
]

export function InventoryPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const stockStatus = [
    { name: 'In Stock', value: 98, color: '#0d5c45' },
    { name: 'Low Stock', value: 6, color: '#C5A059' },
    { name: 'Out of Stock', value: 4, color: '#dc2626' },
    { name: 'Discontinued', value: 16, color: '#94a3b8' },
  ]

  const filtered = demoInventory.filter((i) => {
    if (tab !== 'all' && i.category.toLowerCase() !== tab) return false
    return i.name.toLowerCase().includes(query.toLowerCase())
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Inventory</h1>
          <p className="text-sm text-slate-ui">Track stock levels, movements, and replenishment alerts.</p>
        </div>
        <Button><Plus className="h-4 w-4" /> Add Product</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Products" value="124" trend="+12% vs last month" />
        <KpiCard label="Low Stock Items" value="6" subtext="2 need restocking" />
        <KpiCard label="Total Inventory Value" value={formatPeso(583200)} trend="+8%" />
        <KpiCard label="Total Categories" value="12" subtext="product categories" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr_0.7fr]">
        <Card className="p-4">
          <CardHeader title="Inventory Value Trend" description="Last 8 Months" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <XAxis dataKey="month" />
                <YAxis hide />
                <Tooltip formatter={(v) => formatPeso(Number(v))} />
                <Line type="monotone" dataKey="value" stroke="#0A2E26" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <CardHeader title="Stock Status" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stockStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75}>
                  {stockStatus.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-4">
            <CardHeader title="Low Stock Alerts" />
            <ul className="space-y-3">
              {demoInventory.filter((i) => i.status !== 'in_stock').map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-red-600">Only {i.currentStock} left</p>
                  </div>
                  <Badge variant={i.status === 'out_of_stock' ? 'danger' : 'warning'}>{i.status.replace('_', ' ')}</Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4">
            <CardHeader title="Recent Movements" />
            <ul className="space-y-3 text-sm">
              {demoMovements.map((m) => (
                <li key={m.id} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-gold" />
                  <div>
                    <p className="font-medium">{m.itemName}</p>
                    <p className="text-xs text-slate-ui">{m.type} · {m.quantity > 0 ? '+' : ''}{m.quantity}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="p-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'all', label: 'All Products' },
            { id: 'consumables', label: 'Consumables' },
            { id: 'injectables', label: 'Injectables' },
            { id: 'skincare', label: 'Skincare' },
            { id: 'devices', label: 'Devices' },
            { id: 'others', label: 'Others' },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search products..." className="my-4 max-w-sm" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-ui">
              <tr>
                <th className="px-2 py-2">Product</th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Stock</th>
                <th className="px-2 py-2">Reorder</th>
                <th className="px-2 py-2">Unit Price</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-t border-border/70">
                  <td className="px-2 py-3">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-slate-ui">{i.brand} · {i.sku}</p>
                  </td>
                  <td className="px-2 py-3"><Badge variant="info">{i.category}</Badge></td>
                  <td className={`px-2 py-3 ${i.currentStock <= i.reorderLevel ? 'text-red-600' : ''}`}>{i.currentStock}</td>
                  <td className="px-2 py-3">{i.reorderLevel}</td>
                  <td className="px-2 py-3">{formatPeso(i.sellingPrice || i.unitCost)}</td>
                  <td className="px-2 py-3">
                    <Badge variant={i.status === 'in_stock' ? 'success' : i.status === 'low_stock' ? 'warning' : 'danger'}>
                      {i.status.replace('_', ' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
