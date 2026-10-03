import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Cake,
  Heart,
  Mail,
  MapPin,
  Phone,
  Pill,
  Stethoscope,
  Upload,
  User,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import {
  computeContractValue,
  getAvailedServices,
  getInstallmentBalances,
  getPurchasedProducts,
  getSessionHistory,
} from '@/services/clientSalesProfileService'
import { getClientById, getClients, hydrateClientFromSupabase, persistClientToSupabase, preloadClientsFromSupabase, saveClient, subscribeClients } from '@/services/clientService'
import { getAnalyticsSales, subscribeAnalytics } from '@/services/analyticsService'
import { preloadSalesData } from '@/services/salesService'
import { getBranches } from '@/services/branchService'
import type { Client } from '@/types'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'
import { isBranchOwner, isHqRole } from '@/utils/franchiseAccess'

const fieldLabel =
  'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal'
const fieldControl =
  'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15'

type PersonalForm = {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: Client['gender'] | ''
  address: string
  branchId: string
}

function formFromClient(c: Client): PersonalForm {
  return {
    fullName: c.fullName,
    email: c.email || '',
    phone: c.phone || '',
    dateOfBirth: c.dateOfBirth || '',
    gender: c.gender === 'prefer_not_to_say' ? '' : c.gender,
    address: c.address || '',
    branchId: c.preferredBranchId,
  }
}

function displayField(value?: string) {
  return value?.trim() ? value : '—'
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function formatShortDate(iso: string) {
  if (!iso || iso === 'N/A') return iso
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ClientProfilePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const forcedBranchId = useForcedBranchId()
  const [tab, setTab] = useState('patient')
  const [client, setClient] = useState<Client | undefined>(() =>
    id ? getClientById(id) : getClients()[0],
  )
  const [salesTick, setSalesTick] = useState(0)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PersonalForm | null>(null)
  const [saving, setSaving] = useState(false)

  const branches = useMemo(() => {
    const all = getBranches()
    if (forcedBranchId) return all.filter((b) => b.id === forcedBranchId)
    return all
  }, [forcedBranchId])

  const canViewClient = useMemo(() => {
    if (!client) return true
    if (isHqRole(user?.role)) return true
    if (!isBranchOwner(user) && !forcedBranchId) return true
    const branchId = forcedBranchId ?? user?.branchId
    if (branchId && client.preferredBranchId === branchId) return true
    if (
      user?.branchName &&
      client.preferredBranchName?.toLowerCase() === user.branchName.toLowerCase()
    ) {
      return true
    }
    return false
  }, [client, user, forcedBranchId])

  useEffect(() => {
    const refreshClient = () => setClient(id ? getClientById(id) : getClients()[0])
    refreshClient()
    void Promise.all([preloadSalesData(), preloadClientsFromSupabase()]).then(async () => {
      setSalesTick((n) => n + 1)
      if (id) {
        const hydrated = await hydrateClientFromSupabase(id)
        if (hydrated) setClient(hydrated)
        else refreshClient()
      } else {
        refreshClient()
      }
    })
    const unsubClients = subscribeClients(refreshClient)
    const unsubSales = subscribeAnalytics(() => setSalesTick((n) => n + 1))
    return () => {
      unsubClients()
      unsubSales()
    }
  }, [id])

  if (client && !canViewClient) {
    return <Navigate to="/admin/clients" replace />
  }

  useEffect(() => {
    setEditing(false)
    setForm(null)
  }, [id])

  const sales = useMemo(() => getAnalyticsSales(), [salesTick])

  const profile = useMemo(() => {
    if (!client) return null
    const contractValue = computeContractValue(client.id, sales, client.fullName)
    return {
      contractValue,
      availed: getAvailedServices(client.id, sales, client.fullName),
      products: getPurchasedProducts(client.id, sales, client.fullName),
      installments: getInstallmentBalances(client.id, sales, client.fullName),
      sessions: getSessionHistory(client.id, sales, client.fullName),
    }
  }, [client, sales])

  function startEdit() {
    if (!client) return
    setForm(formFromClient(client))
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setForm(null)
  }

  async function savePersonal(e: FormEvent) {
    e.preventDefault()
    if (!client || !form) return
    if (!form.fullName.trim()) {
      toast.error('Full name is required')
      return
    }
    const branch =
      branches.find((b) => b.id === form.branchId) ||
      ({
        id: form.branchId || client.preferredBranchId,
        name: client.preferredBranchName,
      } as { id: string; name: string })

    setSaving(true)
    try {
      const updated = saveClient({
        ...client,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender || 'prefer_not_to_say',
        address: form.address.trim(),
        preferredBranchId: branch.id,
        preferredBranchName: branch.name.replace(/ Branch$/i, ''),
      })
      await persistClientToSupabase(updated)
      setClient(updated)
      setEditing(false)
      setForm(null)
      toast.success('Personal information saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  if (!client || !profile) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-4xl">Client not found</h1>
        <Link to="/admin/clients">
          <Button variant="secondary">Back to Customer List</Button>
        </Link>
      </div>
    )
  }

  const spentDisplay = profile.contractValue || client.totalSpent

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C5A059]">
            Customer Profile details
          </p>
          <h1 className="font-display text-3xl text-[#073D2C]">Customer Profile details</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-ui">
            Inspect clinical record logs, allergy lists, past session histories, and upload attachments.
          </p>
        </div>
        <Link to="/admin/clients">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" /> Back to List
          </Button>
        </Link>
      </div>

      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-900">
          {initials(client.fullName)}
        </div>
        <h2 className="text-lg font-bold uppercase tracking-wide text-[#073D2C]">{client.fullName}</h2>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'patient', label: 'Patient Profile' },
          { id: 'services', label: 'Services & Products' },
          { id: 'allergies', label: 'Allergies' },
          { id: 'medications', label: 'Medications' },
          { id: 'concerns', label: 'Health Concerns' },
          { id: 'prescriptions', label: 'Prescriptions' },
          { id: 'attachments', label: 'Attachments' },
        ]}
      />

      {tab === 'patient' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-[#073D2C]">Personal Information</h3>
              {editing ? (
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="submit" form="client-personal-form" size="sm" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={startEdit}>
                  Edit
                </Button>
              )}
            </div>

            {editing && form ? (
              <form id="client-personal-form" onSubmit={savePersonal} className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className={fieldLabel}>Full Name</span>
                  <input
                    className={fieldControl}
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                  />
                </label>
                <label className="block">
                  <span className={fieldLabel}>Email Address</span>
                  <input
                    type="email"
                    className={fieldControl}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@email.com"
                  />
                </label>
                <label className="block">
                  <span className={fieldLabel}>Contact Number</span>
                  <input
                    className={fieldControl}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+63…"
                  />
                </label>
                <label className="block">
                  <span className={fieldLabel}>Birthdate</span>
                  <input
                    type="date"
                    className={fieldControl}
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className={fieldLabel}>Gender</span>
                  <select
                    className={fieldControl}
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value as PersonalForm['gender'] })
                    }
                  >
                    <option value="">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className={fieldLabel}>Assigned Branch</span>
                  <select
                    className={fieldControl}
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    disabled={Boolean(forcedBranchId)}
                  >
                    {!branches.some((b) => b.id === form.branchId) && form.branchId ? (
                      <option value={form.branchId}>{client.preferredBranchName}</option>
                    ) : null}
                    {branches.length === 0 ? (
                      <option value={client.preferredBranchId}>{client.preferredBranchName}</option>
                    ) : (
                      branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className={fieldLabel}>Complete Address</span>
                  <input
                    className={fieldControl}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Street, city, province"
                  />
                </label>
              </form>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2">
                <ProfileField icon={<User className="h-4 w-4" />} label="FULL NAME" value={client.fullName} />
                <ProfileField icon={<Mail className="h-4 w-4" />} label="EMAIL ADDRESS" value={displayField(client.email)} />
                <ProfileField icon={<Phone className="h-4 w-4" />} label="CONTACT NUMBER" value={displayField(client.phone)} />
                <ProfileField icon={<Cake className="h-4 w-4" />} label="BIRTHDATE" value={displayField(client.dateOfBirth)} />
                <ProfileField
                  icon={<User className="h-4 w-4" />}
                  label="GENDER"
                  value={
                    client.gender === 'female'
                      ? 'Female'
                      : client.gender === 'male'
                        ? 'Male'
                        : displayField('')
                  }
                />
                <ProfileField
                  icon={<MapPin className="h-4 w-4" />}
                  label="ASSIGNED BRANCH"
                  value={client.preferredBranchName}
                />
                <ProfileField
                  icon={<MapPin className="h-4 w-4" />}
                  label="COMPLETE ADDRESS"
                  value={displayField(client.address)}
                  className="sm:col-span-2"
                />
              </dl>
            )}
          </Card>

          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-[14px] bg-[#073D2C] p-5 text-white shadow-card">
              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Member Account
              </span>
              <p className="mt-6 text-xs font-medium uppercase tracking-wide text-white/80">Total Amount Spent</p>
              <p className="mt-1 font-metric text-3xl font-bold text-orange-400">{formatPesoExact(spentDisplay)}</p>
            </div>
            <Card className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-ui">Quick Registry Actions</p>
              <ul className="space-y-2 text-sm">
                <QuickAction icon={<Heart className="h-4 w-4 text-red-500" />} label="Add Allergy" />
                <QuickAction icon={<Pill className="h-4 w-4 text-orange-500" />} label="Add Medication" />
                <QuickAction icon={<Stethoscope className="h-4 w-4 text-emerald-700" />} label="Add Health Concern" />
                <QuickAction icon={<Upload className="h-4 w-4 text-emerald-700" />} label="Upload Attachment" />
              </ul>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'services' ? (
        <div className="space-y-6">
          <SectionTable title="Session History">
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Service/Package</Th>
                <Th>Session #</Th>
                <Th>Staff</Th>
                <Th>Status</Th>
                <Th>Photos</Th>
              </tr>
            </thead>
            <tbody>
              {profile.sessions.length === 0 ? (
                <EmptyRow colSpan={6} />
              ) : (
                profile.sessions.map((row) => (
                  <tr key={row.id} className="border-t border-border/70">
                    <Td>{row.dateLabel}</Td>
                    <Td className="font-medium uppercase">{row.servicePackage}</Td>
                    <Td>{row.sessionNumber}</Td>
                    <Td>{row.staff}</Td>
                    <Td>
                      <Button size="sm" variant="primary" className="h-7 px-3 text-xs" disabled>
                        USE
                      </Button>
                    </Td>
                    <Td>{row.photos}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </SectionTable>

          <SectionTable title="Availed Services">
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Invoice #</Th>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Total Sessions</Th>
                <Th>Completed</Th>
                <Th>Remaining</Th>
                <Th>Last Session</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {profile.availed.length === 0 ? (
                <EmptyRow colSpan={9} />
              ) : (
                profile.availed.map((row) => (
                  <tr key={row.id} className="border-t border-border/70">
                    <Td>{formatShortDate(row.saleDate)}</Td>
                    <Td>{row.invoiceRef}</Td>
                    <Td className="font-medium uppercase">{row.name}</Td>
                    <Td>
                      <Badge variant="neutral">{row.type}</Badge>
                    </Td>
                    <Td>{row.totalSessions}</Td>
                    <Td>{row.completed}</Td>
                    <Td>{row.remaining}</Td>
                    <Td>{row.lastSession}</Td>
                    <Td>
                      <Badge variant={row.status === 'Active' ? 'purple' : 'success'}>{row.status}</Badge>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </SectionTable>

          <SectionTable title="Purchased Products">
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Product Name</Th>
                <Th>Quantity</Th>
                <Th>Price</Th>
                <Th>Total</Th>
              </tr>
            </thead>
            <tbody>
              {profile.products.length === 0 ? (
                <EmptyRow colSpan={5} />
              ) : (
                profile.products.map((row) => (
                  <tr key={row.id} className="border-t border-border/70">
                    <Td>{formatShortDate(row.saleDate)}</Td>
                    <Td className="font-medium uppercase">{row.productName}</Td>
                    <Td>{row.quantity}</Td>
                    <Td>{formatPesoExact(row.unitPrice)}</Td>
                    <Td>{formatPesoExact(row.total)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </SectionTable>

          <SectionTable title="Installment Balances">
            <thead>
              <tr>
                <Th>Booking ID</Th>
                <Th>Service/Package</Th>
                <Th>Total Amount</Th>
                <Th>Paid Amount</Th>
                <Th>Remaining</Th>
                <Th>Next Payment</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {profile.installments.length === 0 ? (
                <EmptyRow colSpan={8} />
              ) : (
                profile.installments.map((row) => (
                  <tr key={row.id} className="border-t border-border/70">
                    <Td>{row.bookingId}</Td>
                    <Td className="font-medium uppercase">{row.itemName}</Td>
                    <Td>{formatPesoExact(row.totalAmount)}</Td>
                    <Td className="font-semibold text-emerald-700">{formatPesoExact(row.paidAmount)}</Td>
                    <Td className="font-semibold text-orange-600">{formatPesoExact(row.remainingAmount)}</Td>
                    <Td>{row.nextPayment}</Td>
                    <Td>
                      <Badge variant={row.status === 'pending' ? 'neutral' : 'success'}>{row.status}</Badge>
                    </Td>
                    <Td>
                      <Button variant="secondary" size="sm" className="gap-1">
                        <Wallet className="h-3.5 w-3.5" /> Payments
                      </Button>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </SectionTable>
        </div>
      ) : null}

      {tab !== 'patient' && tab !== 'services' ? (
        <Card className="p-8 text-center text-sm text-slate-ui">
          {tab.charAt(0).toUpperCase() + tab.slice(1)} for {client.fullName} will be captured when clinical records
          are added.
        </Card>
      ) : null}
    </div>
  )
}

function ProfileField({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn('flex gap-3', className)}>
      <span className="mt-0.5 text-[#C5A059]">{icon}</span>
      <div>
        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-ui">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium uppercase text-[#073D2C]">{value}</dd>
      </div>
    </div>
  )
}

function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li>
      <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-ivory-100">
        {icon}
        <span>{label}</span>
      </button>
    </li>
  )
}

function SectionTable({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-ivory-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-[#073D2C]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">{children}</table>
      </div>
    </Card>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-ui">
      {children}
    </th>
  )
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('whitespace-nowrap px-3 py-3 text-slate-ui', className)}>{children}</td>
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-sm text-slate-ui">
        No records yet.
      </td>
    </tr>
  )
}
