import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CalendarDays,
  Coins,
  Package,
  Syringe,
  UserPlus,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import {
  demoAppointments,
  demoClientGrowth,
  demoDashboardKpis,
  demoInventory,
  demoRevenueByMonth,
  demoSalesByBranch,
  demoStaff,
  demoTreatments,
} from '@/constants/demoData'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { formatPeso } from '@/utils/currency'

/** Visual source of truth: reference/ui/03-dashboard.png */

const pieColors = ['#0A2E26', '#C5A059', '#E8A0A0', '#D4CFC4']

export function DashboardPage() {
  const { user } = useAuth()
  const { branches, selectedBranchId, setSelectedBranchId } = useBranch()
  const kpis = demoDashboardKpis
  const topTreatments = [...demoTreatments].sort((a, b) => b.popularity - a.popularity).slice(0, 5)
  const todayAppts = demoAppointments.filter(
    (a) =>
      a.startAt.startsWith('2026-09-25') ||
      a.status === 'in_progress' ||
      a.status === 'pending' ||
      a.status === 'confirmed',
  )
  const clientDist = [
    { name: 'New Clients', value: 32 },
    { name: 'Regular Clients', value: 45 },
    { name: 'VIP Clients', value: 15 },
    { name: 'Inactive', value: 8 },
  ]

  const kpiItems = [
    { label: 'Total Revenue', value: formatPeso(kpis.totalRevenue), trend: `↑ ${kpis.revenueChange}% vs. last month`, icon: Coins },
    { label: 'Total Clients', value: String(kpis.totalClients), trend: `↑ ${kpis.clientsChange}% vs. last month`, icon: Users },
    { label: 'Total Appointments', value: kpis.totalAppointments.toLocaleString(), trend: `↑ ${kpis.appointmentsChange}% vs. last month`, icon: CalendarDays },
    { label: 'Treatment Sales', value: formatPeso(kpis.treatmentSales), trend: `↑ ${kpis.treatmentSalesChange}% vs. last month`, icon: Syringe },
    { label: 'Package Sales', value: formatPeso(kpis.packageSales), trend: `↑ ${kpis.packageSalesChange}% vs. last month`, icon: Package },
    { label: 'New Clients', value: String(kpis.newClients), trend: `↑ ${kpis.newClientsChange}% vs. last month`, icon: UserPlus },
  ]

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[16px] border border-[#E8E4DC] bg-white">
        <div
          className="absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1629909615184-74f495363b67?w=1400&q=80')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#FDFBF7] via-[#FDFBF7]/88 to-[#FDFBF7]/40" />
        <div className="relative flex flex-col gap-4 px-5 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-7">
          <div>
            <h1 className="font-display text-[2rem] leading-tight text-[#0A2E26] lg:text-[2.35rem]">
              Welcome Back, {user?.fullName ?? 'Maria Santos'}
            </h1>
            <p className="mt-1 text-sm text-[#5a5a5a]">Here’s what’s happening across your clinic today.</p>
            <p className="mt-3 font-display text-sm italic text-[#C5A059]">Enhancing Natural Beauty</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-10 rounded-[10px] border border-[#E5E0D6] bg-white px-3 text-sm"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select className="h-10 rounded-[10px] border border-[#E5E0D6] bg-white px-3 text-sm" defaultValue="sep">
              <option value="sep">Sep 1, 2026 – Sep 30, 2026</option>
              <option value="aug">Aug 1, 2026 – Aug 31, 2026</option>
            </select>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpiItems.map(({ label, value, trend, icon: Icon }) => (
          <div
            key={label}
            className="rounded-[14px] border border-[#E8E4DC] bg-white p-4 shadow-[0_2px_10px_rgba(10,46,38,0.04)]"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#6b6b6b]">{label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F1E3] text-[#C5A059]">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 font-metric text-[1.75rem] font-semibold leading-none tracking-tight text-[#0A2E26]">
              {value}
            </p>
            <p className="mt-2 text-[11px] font-medium text-[#0d5c45]">{trend}</p>
          </div>
        ))}
      </div>

      {/* Middle: Revenue (wide) + Distribution + Top Treatments */}
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.75fr_0.9fr]">
        <Panel
          title="Revenue & Sales Overview"
          action={
            <select className="h-8 rounded-md border border-[#E5E0D6] px-2 text-xs" defaultValue="monthly">
              <option value="monthly">Monthly</option>
            </select>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={demoRevenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="treatment" stackId="a" fill="#0A2E26" name="Treatment Sales" />
                <Bar dataKey="package" stackId="a" fill="#C5A059" name="Package Sales" />
                <Bar dataKey="product" stackId="a" fill="#E8A0A0" name="Product Sales" />
                <Line type="monotone" dataKey="revenue" stroke="#B8860B" strokeWidth={2} name="Total Revenue" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Client Distribution">
          <div className="relative h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={clientDist} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78}>
                  {clientDist.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-10">
              <div className="text-center">
                <p className="font-metric text-2xl font-semibold tracking-tight text-[#0A2E26]">386</p>
                <p className="text-[10px] text-[#6b6b6b]">Total Clients</p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Top Treatments"
          action={
            <Link to="/admin/treatments" className="text-xs font-medium text-[#0A2E26] hover:underline">
              View All →
            </Link>
          }
        >
          <ul className="space-y-3">
            {topTreatments.map((t, idx) => (
              <li key={t.id} className="flex items-center gap-3 border-b border-[#E8E4DC]/80 pb-3 last:border-0">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F7F1E3] text-[11px] font-semibold text-[#C5A059]">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#0A2E26]">{t.name}</p>
                  <p className="text-[11px] text-[#6b6b6b]">{t.popularity} sessions</p>
                </div>
                <p className="text-sm font-semibold text-[#0A2E26]">{formatPeso(t.price * t.popularity)}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel
          title="Appointments Today"
          action={
            <Link to="/admin/appointments" className="text-xs font-medium text-[#0A2E26] hover:underline">
              View All →
            </Link>
          }
        >
          <ul className="space-y-3">
            {todayAppts.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F2EE] text-xs font-semibold text-[#0A2E26]">
                    {a.clientName.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0A2E26]">{a.clientName}</p>
                    <p className="text-[11px] text-[#6b6b6b]">
                      {new Date(a.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} ·{' '}
                      {a.treatmentName}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    a.status === 'confirmed' || a.status === 'completed'
                      ? 'success'
                      : a.status === 'in_progress'
                        ? 'info'
                        : 'warning'
                  }
                >
                  {a.status.replace('_', ' ')}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Sales by Branch">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demoSalesByBranch} layout="vertical" margin={{ left: 8, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="branch" width={78} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatPeso(Number(v))} />
                <Bar dataKey="revenue" fill="#0A2E26" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Client Growth">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demoClientGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="newClients" stackId="a" fill="#0A2E26" name="New Clients" />
                <Bar dataKey="returning" stackId="a" fill="#9fc5b5" name="Returning" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Inventory Status"
          action={
            <Link to="/admin/inventory" className="text-xs font-medium text-[#0A2E26] hover:underline">
              View All →
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-2.5">
            {demoInventory.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-[10px] border border-[#E8E4DC] p-3">
                <p className="truncate text-sm font-medium text-[#0A2E26]">{item.name}</p>
                <p className="mt-1 text-[11px] text-[#6b6b6b]">{item.currentStock} units</p>
                <Badge
                  className="mt-2"
                  variant={item.status === 'in_stock' ? 'success' : item.status === 'low_stock' ? 'warning' : 'danger'}
                >
                  {item.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Staff Performance"
          action={
            <Link to="/admin/staff" className="text-xs font-medium text-[#0A2E26] hover:underline">
              View All →
            </Link>
          }
        >
          <ul className="space-y-3">
            {demoStaff.slice(0, 4).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F1E3] text-xs font-semibold text-[#0A2E26]">
                    {s.fullName.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0A2E26]">{s.fullName}</p>
                    <p className="text-[11px] text-[#6b6b6b]">{s.title}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#0A2E26]">{formatPeso(s.baseSalary)}</p>
                  <p className="text-[11px] text-[#6b6b6b]">★ {s.rating.toFixed(1)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="relative min-h-[260px] overflow-hidden rounded-[14px] border border-[#E8E4DC] shadow-[0_2px_10px_rgba(10,46,38,0.04)]">
          <img
            src="https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=900&q=80"
            alt="Promotions"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A2E26]/85 via-[#0A2E26]/35 to-transparent" />
          <div className="relative flex h-full flex-col justify-end p-5 text-white">
            <p className="font-display text-2xl leading-tight">More Beautiful Results</p>
            <p className="mt-2 text-sm text-white/80">
              Trusted treatments. Advanced technology. Personalized care.
            </p>
            <Link
              to="/admin/marketing"
              className="mt-4 inline-flex h-10 w-fit items-center rounded-full bg-[#C5A059] px-4 text-sm font-semibold text-[#0A2E26]"
            >
              View Promotions →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="rounded-[14px] border border-[#E8E4DC] bg-white p-4 shadow-[0_2px_10px_rgba(10,46,38,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-xl text-[#0A2E26]">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}
