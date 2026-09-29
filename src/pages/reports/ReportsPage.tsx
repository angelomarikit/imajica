import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { Tabs } from '@/components/ui/Tabs'
import {
  demoClientGrowth,
  demoDashboardKpis,
  demoSales,
  demoSalesByBranch,
  demoTreatments,
} from '@/constants/demoData'
import { formatPeso } from '@/utils/currency'

const revenueTrend = [
  { day: '1', revenue: 12000 },
  { day: '5', revenue: 18000 },
  { day: '10', revenue: 25000 },
  { day: '15', revenue: 32000 },
  { day: '20', revenue: 41000 },
  { day: '25', revenue: 50000 },
  { day: '30', revenue: 58320 },
]

const appointmentStatus = [
  { name: 'Completed', value: 72, count: 1326, color: '#0A2E26' },
  { name: 'Rescheduled', value: 15, count: 277, color: '#C5A059' },
  { name: 'Cancelled', value: 8, count: 147, color: '#f97316' },
  { name: 'No Show', value: 5, count: 92, color: '#ef4444' },
]

const packageSales = [
  { name: 'Treatment Packages', value: 42, amount: 245300 },
  { name: 'Memberships', value: 28, amount: 163400 },
  { name: 'Single Treatments', value: 20, amount: 116800 },
  { name: 'IV Wellness', value: 10, amount: 57700 },
]

export function ReportsPage() {
  const [tab, setTab] = useState('overview')
  const kpis = demoDashboardKpis
  const topTreatments = [...demoTreatments].sort((a, b) => b.popularity - a.popularity).slice(0, 5)

  function exportCsv() {
    const rows = [
      ['Date', 'Client', 'Item', 'Branch', 'Amount', 'Status'],
      ...demoSales.map((s) => [s.createdAt, s.clientName, s.treatmentOrPackage, s.branchName, String(s.totalAmount), s.status]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'imajica-report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Reports & Analytics</h1>
          <p className="text-sm text-slate-ui">Branch and date-filtered business intelligence.</p>
        </div>
        <Button onClick={exportCsv}><Download className="h-4 w-4" /> Export Report</Button>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'sales', label: 'Sales' },
          { id: 'appointments', label: 'Appointments' },
          { id: 'clients', label: 'Clients' },
          { id: 'treatments', label: 'Treatments' },
          { id: 'packages', label: 'Packages' },
          { id: 'inventory', label: 'Inventory' },
          { id: 'staff', label: 'Staff' },
          { id: 'payroll', label: 'Payroll' },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Revenue" value={formatPeso(kpis.totalRevenue)} trend={`+${kpis.revenueChange}% vs. last month`} />
        <KpiCard label="Total Appointments" value={kpis.totalAppointments.toLocaleString()} trend={`+${kpis.appointmentsChange}% vs. last month`} />
        <KpiCard label="Total Clients" value={String(kpis.totalClients)} trend={`+${kpis.clientsChange}% vs. last month`} />
        <KpiCard label="Total Treatments" value="2,350" trend="+20% vs. last month" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-2">
          <CardHeader title="Revenue Overview" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(v) => formatPeso(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="#0A2E26" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <CardHeader title="Revenue by Branch" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={demoSalesByBranch} dataKey="revenue" nameKey="branch" innerRadius={50} outerRadius={75}>
                  {demoSalesByBranch.map((_, i) => (
                    <Cell key={i} fill={['#0A2E26', '#0d5c45', '#C5A059', '#9fc5b5'][i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatPeso(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <CardHeader title="Top Treatments" />
          <ul className="space-y-3">
            {topTreatments.map((t) => (
              <li key={t.id} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-slate-ui">{t.popularity} sessions</p>
                </div>
                <p className="font-semibold">{formatPeso(t.price * t.popularity)}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <CardHeader title="Client Growth" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demoClientGrowth}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="newClients" stackId="a" fill="#0A2E26" />
                <Bar dataKey="returning" stackId="a" fill="#9fc5b5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <CardHeader title="Appointment Status" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={appointmentStatus} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70}>
                  {appointmentStatus.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <CardHeader title="Sales by Package Type" />
        <div className="space-y-3">
          {packageSales.map((p) => (
            <div key={p.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{p.name}</span>
                <span>{p.value}% · {formatPeso(p.amount)}</span>
              </div>
              <div className="h-2 rounded-full bg-ivory-100">
                <div className="h-full rounded-full bg-emerald-800" style={{ width: `${p.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <CardHeader title="Recent Transactions" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-ui">
              <tr>
                <th className="px-2 py-2">Date & Time</th>
                <th className="px-2 py-2">Client</th>
                <th className="px-2 py-2">Treatment/Package</th>
                <th className="px-2 py-2">Branch</th>
                <th className="px-2 py-2">Staff</th>
                <th className="px-2 py-2">Total</th>
                <th className="px-2 py-2">Payment</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {demoSales.map((s) => (
                <tr key={s.id} className="border-t border-border/70">
                  <td className="px-2 py-3">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="px-2 py-3">{s.clientName}</td>
                  <td className="px-2 py-3">{s.treatmentOrPackage}</td>
                  <td className="px-2 py-3">{s.branchName}</td>
                  <td className="px-2 py-3">{s.staffName}</td>
                  <td className="px-2 py-3">{formatPeso(s.totalAmount)}</td>
                  <td className="px-2 py-3 capitalize">{s.paymentMethod.replace('_', ' ')}</td>
                  <td className="px-2 py-3"><Badge variant="success">Paid</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
