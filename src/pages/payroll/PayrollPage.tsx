import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { KpiCard } from '@/components/ui/KpiCard'
import { SearchInput } from '@/components/ui/SearchInput'
import { Tabs } from '@/components/ui/Tabs'
import { demoPayroll } from '@/constants/demoData'
import { formatPeso } from '@/utils/currency'

const overview: {
  month: string
  base: number
  commission: number
  incentives: number
  total: number
}[] = []

export function PayrollPage() {
  const [tab, setTab] = useState('staff')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<(typeof demoPayroll)[number] | null>(demoPayroll[0] ?? null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const filtered = demoPayroll.filter((p) => p.staffName.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Payroll</h1>
          <p className="text-sm text-slate-ui">Manage staff payroll, commissions, and incentives across all branches.</p>
        </div>
        <Button onClick={() => setConfirmOpen(true)}>+ Process Payroll</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Staff" value="0" />
        <KpiCard label="Total Payroll" value={formatPeso(0)} />
        <KpiCard label="Total Commissions" value={formatPeso(0)} />
        <KpiCard label="Total Incentives" value={formatPeso(0)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="p-4">
          <CardHeader title="Payroll Overview" description="Last 6 Months" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={overview}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v) => formatPeso(Number(v))} />
                <Legend />
                <Bar dataKey="base" stackId="a" fill="#0A2E26" name="Base Salary" />
                <Bar dataKey="commission" stackId="a" fill="#C5A059" name="Commissions" />
                <Bar dataKey="incentives" stackId="a" fill="#9fc5b5" name="Incentives" />
                <Line type="monotone" dataKey="total" stroke="#b8860b" strokeWidth={2} name="Total" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <CardHeader title="September 2026 Payroll" />
          <Badge variant="success">Ready to Process</Badge>
          <p className="mt-2 text-sm text-slate-ui">Due Sep 30</p>
          <ul className="mt-4 space-y-2 text-sm">
            {['Staff members', 'Base salary', 'Commissions', 'Incentives'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="text-emerald-700">✓</span> {item}
              </li>
            ))}
          </ul>
          <Button className="mt-5 w-full" onClick={() => setConfirmOpen(true)}>Review and Process Payroll →</Button>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <Card className="p-4">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'staff', label: 'Staff Payroll' },
              { id: 'commissions', label: 'Commissions' },
              { id: 'incentives', label: 'Incentives' },
              { id: 'adjustments', label: 'Adjustments' },
              { id: 'history', label: 'Payroll History' },
            ]}
          />
          <SearchInput value={query} onChange={setQuery} placeholder="Search staff..." className="my-4 max-w-sm" />
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-ui">
                <tr>
                  <th className="px-2 py-2">Staff</th>
                  <th className="px-2 py-2">Base</th>
                  <th className="px-2 py-2">Commission</th>
                  <th className="px-2 py-2">Incentives</th>
                  <th className="px-2 py-2">Total</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="cursor-pointer border-t border-border/70 hover:bg-ivory-100" onClick={() => setSelected(p)}>
                    <td className="px-2 py-3">
                      <p className="font-medium">{p.staffName}</p>
                      <p className="text-xs text-slate-ui">{p.role} · {p.branchName}</p>
                    </td>
                    <td className="px-2 py-3">{formatPeso(p.baseSalary)}</td>
                    <td className="px-2 py-3">{formatPeso(p.commission)}</td>
                    <td className="px-2 py-3">{formatPeso(p.incentives)}</td>
                    <td className="px-2 py-3 font-semibold">{formatPeso(p.totalPay)}</td>
                    <td className="px-2 py-3"><Badge variant={p.status === 'ready' ? 'success' : 'warning'}>{p.status.replace('_', ' ')}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4">
          <CardHeader title="Payslip Preview" description={selected?.staffName ?? 'Select a staff member'} />
          {selected ? (
            <>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Base Salary</span><span>{formatPeso(selected.baseSalary)}</span></li>
            <li className="flex justify-between"><span>Treatment Commission</span><span>{formatPeso(selected.commission)}</span></li>
            <li className="flex justify-between"><span>Incentives</span><span>{formatPeso(selected.incentives)}</span></li>
            <li className="flex justify-between border-t border-border pt-2 font-semibold"><span>Gross Pay</span><span>{formatPeso(selected.totalPay)}</span></li>
            <li className="flex justify-between text-slate-ui"><span>SSS / PhilHealth / Pag-IBIG / Tax</span><span>-{formatPeso(selected.deductions)}</span></li>
          </ul>
          <div className="mt-4 rounded-[10px] bg-emerald-50 p-4">
            <p className="text-xs text-slate-ui">Net Pay</p>
            <p className="font-metric text-3xl font-semibold tracking-tight text-emerald-900">{formatPeso(selected.netPay)}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1">View Full Payslip</Button>
            <Button className="flex-1">Edit Payroll</Button>
          </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-ui">No payroll rows yet.</p>
          )}
        </Card>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Process September 2026 payroll?"
        description="Processed payroll becomes immutable except through authorized adjustments."
        confirmLabel="Process Payroll"
        onConfirm={() => {
          setConfirmOpen(false)
          toast.success('Payroll marked as processed')
        }}
      />
    </div>
  )
}
