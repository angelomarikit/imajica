import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  Clock,
  CreditCard,
  MapPin,
  Package,
  Sparkles,
} from 'lucide-react'
import { BookAppointmentModal } from '@/components/booking/BookAppointmentModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import {
  demoClientPackages,
  demoClients,
  demoPackages,
  demoSales,
  demoTreatments,
} from '@/constants/demoData'
import { useAuth } from '@/contexts/AuthContext'
import {
  listAppointmentsByClient,
  subscribeAppointments,
} from '@/services/appointmentService'
import type { Appointment } from '@/types'
import { formatPeso } from '@/utils/currency'

function resolveClientId(userId?: string, email?: string) {
  if (email?.toLowerCase() === 'client@imajica.ph') return 'cl-maria'
  return userId ?? 'cl-maria'
}

export function ClientDashboardPage() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [bookOpen, setBookOpen] = useState(false)
  const clientId = resolveClientId(user?.id, user?.email)
  const client = demoClients.find((c) => c.id === clientId)
  const packages = demoClientPackages.filter((p) => p.clientId === clientId)

  useEffect(() => {
    const load = () => {
      void listAppointmentsByClient(clientId).then(setAppointments)
    }
    load()
    return subscribeAppointments(load)
  }, [clientId])

  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== 'cancelled' && a.status !== 'completed')
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [appointments],
  )

  const nextVisit = upcoming[0]
  const spent = client?.totalSpent ?? 0

  return (
    <div className="space-y-5">
      <BookAppointmentModal open={bookOpen} onClose={() => setBookOpen(false)} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Client Portal</p>
          <h1 className="font-display text-4xl text-charcoal">Welcome, {user?.fullName ?? 'Client'}</h1>
          <p className="text-sm text-slate-ui">Manage your appointments, packages, and beauty journey.</p>
        </div>
        <Button size="lg" onClick={() => setBookOpen(true)}>
          <CalendarDays className="h-4 w-4" /> Book Appointment
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Upcoming Visits"
          value={String(upcoming.length)}
          trend="Your next confirmed sessions"
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <KpiCard
          label="Active Packages"
          value={String(packages.filter((p) => p.status === 'active').length)}
          trend="Sessions remaining across plans"
          icon={<Package className="h-4 w-4" />}
        />
        <KpiCard
          label="Total Visits"
          value={String(client?.totalVisits ?? appointments.length)}
          trend={client?.preferredBranchName ?? 'Imajica clinics'}
          icon={<MapPin className="h-4 w-4" />}
        />
        <KpiCard
          label="Lifetime Spent"
          value={formatPeso(spent)}
          trend="Lifetime lifetime with Imajica"
          icon={<CreditCard className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <Card className="p-5">
          <CardHeader
            title="Upcoming Appointments"
            action={
              <Link to="/client/appointments" className="text-xs font-medium text-emerald-900 hover:underline">
                View all
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-slate-ui">No upcoming appointments. Book your next visit.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {upcoming.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-border bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-charcoal">{a.treatmentName}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-ui">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(a.startAt).toLocaleString()} · {a.branchName}
                    </p>
                  </div>
                  <Badge
                    variant={
                      a.status === 'confirmed'
                        ? 'success'
                        : a.status === 'pending'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {a.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <CardHeader title="Quick Actions" />
          <div className="mt-4 grid gap-3">
            <button
              type="button"
              onClick={() => setBookOpen(true)}
              className="flex items-center gap-3 rounded-[12px] border border-border bg-ivory-100 px-4 py-3 text-left transition hover:border-emerald-900/30"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-900 text-white">
                <CalendarDays className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium">Book Appointment</p>
                <p className="text-xs text-slate-ui">Choose date, service, and time</p>
              </div>
            </button>
            <Link
              to="/client/treatments"
              className="flex items-center gap-3 rounded-[12px] border border-border bg-white px-4 py-3 transition hover:border-emerald-900/30"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 text-gold">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium">Browse Treatments</p>
                <p className="text-xs text-slate-ui">Explore aesthetic services</p>
              </div>
            </Link>
            <Link
              to="/client/packages"
              className="flex items-center gap-3 rounded-[12px] border border-border bg-white px-4 py-3 transition hover:border-emerald-900/30"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 text-gold">
                <Package className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium">My Packages</p>
                <p className="text-xs text-slate-ui">Track sessions and validity</p>
              </div>
            </Link>
          </div>
          {nextVisit ? (
            <div className="mt-5 rounded-[12px] border border-[#C5A059]/40 bg-[#FBF7F0] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Next visit</p>
              <p className="mt-1 font-display text-xl text-emerald-900">{nextVisit.treatmentName}</p>
              <p className="mt-1 text-sm text-slate-ui">
                {new Date(nextVisit.startAt).toLocaleString()} · {nextVisit.branchName}
              </p>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  )
}

export function ClientBookPage() {
  const [bookOpen, setBookOpen] = useState(true)

  return (
    <div className="space-y-5">
      <BookAppointmentModal open={bookOpen} onClose={() => setBookOpen(false)} />
      <div>
        <h1 className="font-display text-4xl">Book an Appointment</h1>
        <p className="text-sm text-slate-ui">
          Select a branch, treatment, calendar date, and time — same booking flow as the website.
        </p>
      </div>
      <Card className="p-8 text-center">
        <CalendarDays className="mx-auto h-10 w-10 text-gold" />
        <p className="mt-3 font-display text-2xl text-charcoal">Ready when you are</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-ui">
          Open the booking calendar to choose your preferred schedule. Your request will appear in My
          Appointments and on the clinic appointments board.
        </p>
        <Button className="mt-5" size="lg" onClick={() => setBookOpen(true)}>
          Open Booking Calendar
        </Button>
      </Card>
    </div>
  )
}

export function ClientTreatmentsPage() {
  const [bookOpen, setBookOpen] = useState(false)
  const categories = useMemo(
    () => Array.from(new Set(demoTreatments.map((t) => t.category))),
    [],
  )

  return (
    <div className="space-y-5">
      <BookAppointmentModal open={bookOpen} onClose={() => setBookOpen(false)} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Treatments</h1>
          <p className="text-sm text-slate-ui">Browse services available at Imajica clinics.</p>
        </div>
        <Button onClick={() => setBookOpen(true)}>Book a Treatment</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <span
            key={c}
            className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium capitalize text-slate-ui"
          >
            {c}
          </span>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {demoTreatments
          .filter((t) => t.status === 'active')
          .map((t) => (
            <Card key={t.id} className="flex flex-col p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
                {t.category}
              </p>
              <h3 className="mt-1 font-display text-2xl text-charcoal">{t.name}</h3>
              <p className="mt-2 flex-1 text-sm text-slate-ui">{t.description}</p>
              <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
                <div>
                  <p className="text-xs text-slate-ui">{t.durationMinutes} mins</p>
                  <p className="font-semibold text-emerald-900">{formatPeso(t.price)}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setBookOpen(true)}>
                  Book
                </Button>
              </div>
            </Card>
          ))}
      </div>
    </div>
  )
}

export function ClientPackagesPage() {
  const { user } = useAuth()
  const clientId = resolveClientId(user?.id, user?.email)
  const mine = demoClientPackages.filter((p) => p.clientId === clientId)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">My Packages</h1>
        <p className="text-sm text-slate-ui">Track session balances and explore available plans.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {mine.length === 0 ? (
          <Card className="p-5 text-sm text-slate-ui lg:col-span-2">
            You don’t have an active package yet.
          </Card>
        ) : (
          mine.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl text-charcoal">{p.packageName}</h3>
                  <p className="mt-1 text-sm text-slate-ui">
                    Valid until {p.validUntil}
                  </p>
                </div>
                <Badge variant={p.status === 'active' ? 'success' : 'neutral'}>{p.status}</Badge>
              </div>
              <p className="mt-4 text-sm font-medium text-charcoal">
                {p.sessionsUsed}/{p.sessionsTotal} sessions used
              </p>
              <div className="mt-2 h-2.5 rounded-full bg-ivory-100">
                <div
                  className="h-full rounded-full bg-emerald-800"
                  style={{ width: `${Math.min(100, (p.sessionsUsed / p.sessionsTotal) * 100)}%` }}
                />
              </div>
            </Card>
          ))
        )}
      </div>

      <h2 className="font-display text-2xl">Available Packages</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {demoPackages
          .filter((p) => p.status === 'active')
          .slice(0, 6)
          .map((p) => (
            <Card key={p.id} className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
                {p.type}
              </p>
              <h3 className="mt-1 font-display text-xl">{p.name}</h3>
              <p className="mt-2 text-sm text-slate-ui">{p.description}</p>
              <p className="mt-4 font-semibold text-emerald-900">
                {formatPeso(p.promoPrice ?? p.regularPrice)}
              </p>
              <p className="text-xs text-slate-ui">
                {p.sessions} sessions · {p.validityMonths} months validity
              </p>
            </Card>
          ))}
      </div>
    </div>
  )
}

export function ClientAppointmentsPage() {
  const { user } = useAuth()
  const [mine, setMine] = useState<Appointment[]>([])
  const [bookOpen, setBookOpen] = useState(false)
  const clientId = resolveClientId(user?.id, user?.email)

  useEffect(() => {
    const load = () => {
      void listAppointmentsByClient(clientId).then(setMine)
    }
    load()
    return subscribeAppointments(load)
  }, [clientId])

  return (
    <div className="space-y-5">
      <BookAppointmentModal open={bookOpen} onClose={() => setBookOpen(false)} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">My Appointments</h1>
          <p className="text-sm text-slate-ui">Your booking history and upcoming visits.</p>
        </div>
        <Button onClick={() => setBookOpen(true)}>
          <CalendarDays className="h-4 w-4" /> Book New
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ivory-100 text-xs uppercase text-slate-ui">
              <tr>
                <th className="px-4 py-3">Treatment</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Price</th>
              </tr>
            </thead>
            <tbody>
              {mine.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-ui">
                    No appointments yet. Book from the calendar to get started.
                  </td>
                </tr>
              ) : (
                mine.map((a) => (
                  <tr key={a.id} className="border-t border-border/70">
                    <td className="px-4 py-3 font-medium">{a.treatmentName}</td>
                    <td className="px-4 py-3">{a.branchName}</td>
                    <td className="px-4 py-3">{new Date(a.startAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          a.status === 'confirmed' || a.status === 'completed'
                            ? 'success'
                            : a.status === 'cancelled'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {a.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{formatPeso(a.price)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export function ClientPaymentsPage() {
  const { user } = useAuth()
  const clientId = resolveClientId(user?.id, user?.email)
  const payments = demoSales.filter((s) => s.clientId === clientId)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Payments</h1>
        <p className="text-sm text-slate-ui">Your receipts and payment history (client view only).</p>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ivory-100 text-xs uppercase text-slate-ui">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-ui">
                    No payments yet. History appears after clinic POS / PayMongo transactions.
                  </td>
                </tr>
              ) : (
                payments.map((s) => (
                  <tr key={s.id} className="border-t border-border/70">
                    <td className="px-4 py-3">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{s.treatmentOrPackage}</td>
                    <td className="px-4 py-3">{s.branchName}</td>
                    <td className="px-4 py-3 capitalize">{s.paymentMethod.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === 'paid' ? 'success' : 'warning'}>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatPeso(s.totalAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export function ClientProfilePage() {
  const { user, logout } = useAuth()
  const clientId = resolveClientId(user?.id, user?.email)
  const client = demoClients.find((c) => c.id === clientId)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Profile</h1>
        <p className="text-sm text-slate-ui">Your personal details — editable fields coming with Supabase.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-2xl font-semibold text-emerald-900">
            {user?.fullName?.slice(0, 1) ?? 'C'}
          </div>
          <h2 className="mt-4 font-display text-2xl">{user?.fullName}</h2>
          <p className="text-sm text-slate-ui">{user?.email}</p>
          <Badge className="mt-3" variant="success">
            Client
          </Badge>
          <Button
            className="mt-6 w-full"
            variant="secondary"
            onClick={async () => {
              await logout()
              window.location.href = '/login'
            }}
          >
            Sign out
          </Button>
        </Card>
        <Card className="p-6">
          <CardHeader title="Account details" />
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-ui">Phone</dt>
              <dd className="mt-1 font-medium">{client?.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-ui">Preferred branch</dt>
              <dd className="mt-1 font-medium">{client?.preferredBranchName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-ui">Membership</dt>
              <dd className="mt-1 font-medium">{client?.membershipLabel ?? 'Standard'}</dd>
            </div>
            <div>
              <dt className="text-slate-ui">Member since</dt>
              <dd className="mt-1 font-medium">{client?.registeredAt ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-ui">Address</dt>
              <dd className="mt-1 font-medium">{client?.address ?? '—'}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  )
}

export function ClientNotificationsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Notifications</h1>
        <p className="text-sm text-slate-ui">Reminders and updates about your visits.</p>
      </div>
      <div className="space-y-3">
        {[
          {
            title: 'Appointment confirmed',
            body: 'Hydra Facial · Pasig Branch',
            time: '2 hours ago',
          },
          {
            title: 'Package reminder',
            body: 'You have 3 facial sessions remaining.',
            time: 'Yesterday',
          },
          {
            title: 'Promo for you',
            body: 'Enjoy exclusive discounts on selected treatments this month.',
            time: '3 days ago',
          },
        ].map((n) => (
          <Card key={n.title} className="flex items-start gap-3 p-4">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
              <Bell className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium">{n.title}</p>
                <p className="text-[11px] text-slate-ui">{n.time}</p>
              </div>
              <p className="mt-0.5 text-sm text-slate-ui">{n.body}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
