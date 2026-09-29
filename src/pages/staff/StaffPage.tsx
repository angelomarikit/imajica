import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  FileSpreadsheet,
  KeyRound,
  Pencil,
  Plus,
  Search,
  UserMinus,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { demoCommissions, demoStaff } from '@/constants/demoData'
import { exportCsv } from '@/services/analyticsService'
import type { Staff } from '@/types'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'

/** Extra directory rows for UI parity with Staff Directory screenshot */
const DIRECTORY_EXTRA: Staff[] = [
  {
    id: 'st-rosalie',
    code: 'MJ-AE-010',
    fullName: 'Rosalie Manalo',
    email: 'jangmi2575@gmail.com',
    phone: '09064770983',
    role: 'AESTHETICIAN',
    title: 'Aesthetician',
    department: 'Operation Departments',
    branchId: 'br-pasig',
    branchName: 'Pasig City',
    status: 'active',
    specializations: ['Facials'],
    hireDate: '2024-02-01',
    employmentType: 'Full-time',
    rating: 4.9,
    reviewCount: 50,
    baseSalary: 35000,
  },
  {
    id: 'st-veronica',
    code: 'MJ-AE-011',
    fullName: 'Veronica Mayo',
    email: 'veronica.mayo@imajica.ph',
    phone: '09171234567',
    role: 'AESTHETICIAN',
    title: 'Aesthetician',
    department: 'Operation Departments',
    branchId: 'br-pasig',
    branchName: 'Cainta, Rizal',
    status: 'active',
    specializations: ['Facials'],
    hireDate: '2024-04-12',
    employmentType: 'Full-time',
    rating: 4.8,
    reviewCount: 40,
    baseSalary: 34000,
  },
  {
    id: 'st-sonayah',
    code: 'MJ-BM-012',
    fullName: 'Sonayah Arsila',
    email: 'sonayah.arsila@imajica.ph',
    phone: '09181234567',
    role: 'BRANCH_ADMIN',
    title: 'Branch Manager',
    department: 'Operation Departments',
    branchId: 'br-pasig',
    branchName: 'San Mateo, Rizal',
    status: 'active',
    specializations: ['Operations'],
    hireDate: '2023-08-01',
    employmentType: 'Full-time',
    rating: 5,
    reviewCount: 20,
    baseSalary: 55000,
  },
  {
    id: 'st-rasmiya',
    code: 'MJ-AE-013',
    fullName: 'Rasmiya Monteclaro',
    email: 'rasmiya.m@imajica.ph',
    phone: '09191234567',
    role: 'AESTHETICIAN',
    title: 'Aesthetician',
    department: 'Operation Departments',
    branchId: 'br-makati',
    branchName: 'Bacoor, Cavite',
    status: 'inactive',
    specializations: ['Facials'],
    hireDate: '2023-01-10',
    employmentType: 'Full-time',
    rating: 4.5,
    reviewCount: 18,
    baseSalary: 32000,
  },
]

function allDirectoryStaff(): Staff[] {
  const extras = DIRECTORY_EXTRA
  const demo = demoStaff.map((s) => ({
    ...s,
    department: s.department ?? 'Operation Departments',
    title: s.title || s.role,
    branchName: s.branchName.includes('City') ? s.branchName : `${s.branchName} City`.replace(' City City', ' City'),
  }))
  const ids = new Set(extras.map((e) => e.id))
  return [...extras, ...demo.filter((d) => !ids.has(d.id))]
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function StaffPage() {
  const navigate = useNavigate()
  const [staffRows] = useState(() => allDirectoryStaff())
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return staffRows
    return staffRows.filter((s) => {
      const hay = `${s.fullName} ${s.email} ${s.title} ${s.branchName} ${s.department ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [staffRows, query])

  function handleExport() {
    exportCsv(
      'imajica-staff-directory.csv',
      ['Name', 'Email', 'Position', 'Phone', 'Branch', 'Department', 'Status'],
      filtered.map((s) => [
        s.fullName,
        s.email,
        s.title,
        s.phone,
        s.branchName,
        s.department ?? '',
        s.status,
      ]),
    )
    toast.success('Exported staff directory')
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Staff Directory"
        description="Manage salon clinicians, admin personnel, commission profiles, and department branch assignments."
        stat={{ value: staffRows.length, label: 'Total Staff' }}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-[#073D2C]">Staff Members Log</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="gold" onClick={handleExport} className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button type="button" onClick={() => navigate('/admin/staff/new')} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add New Staff
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
            <input
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setQuery(queryDraft.trim())}
              placeholder="Search staff members by name, email, position, branch, or department..."
              className="w-full rounded-[10px] border border-border bg-white py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
          <Button type="button" onClick={() => setQuery(queryDraft.trim())}>
            Search
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Profile</th>
                <th className="px-2 py-3">Staff Name</th>
                <th className="px-2 py-3">Email</th>
                <th className="px-2 py-3">Position</th>
                <th className="px-2 py-3">Contact Number</th>
                <th className="px-2 py-3">Branch</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border/70 hover:bg-ivory-100">
                  <td className="px-2 py-3">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#073D2C] text-[11px] font-semibold text-[#F3E6C8]">
                      {s.avatarUrl ? (
                        <img src={s.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(s.fullName)
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 font-semibold text-[#073D2C]">{s.fullName}</td>
                  <td className="px-2 py-3 text-slate-ui">{s.email}</td>
                  <td className="px-2 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {s.title}
                    </span>
                  </td>
                  <td className="px-2 py-3">{s.phone}</td>
                  <td className="px-2 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {s.branchName}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        s.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-red-50 text-red-700',
                      )}
                    >
                      {s.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-1">
                      <Link
                        to={`/admin/staff/${s.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-orange-50 text-orange-700 hover:bg-orange-100"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        to="/admin/team/user-access"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-sky-50 text-sky-700 hover:bg-sky-100"
                        title="User access"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        title="Deactivate"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-red-50 text-red-700 hover:bg-red-100"
                        onClick={() =>
                          toast.message(`${s.fullName} marked inactive (demo)`)
                        }
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-8 text-center text-slate-ui">
                    No staff members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export function StaffDetailPage() {
  const { id } = useParams()
  const staff = allDirectoryStaff().find((s) => s.id === id) ?? demoStaff[0]
  return (
    <div className="space-y-5">
      <AdminPageBanner
        eyebrow="Team · Staff"
        title={staff.fullName}
        description={`${staff.title} · ${staff.branchName}`}
        actions={
          <Link to="/admin/staff">
            <Button variant="gold">Back to Directory</Button>
          </Link>
        }
      />
      <Card className="p-5">
        <StaffDetailBody staff={staff} />
      </Card>
    </div>
  )
}

function StaffDetailBody({ staff }: { staff: Staff }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-2">
        <Badge variant={staff.status === 'active' ? 'success' : 'danger'}>{staff.status}</Badge>
        <span className="text-slate-ui">
          {staff.title} · {staff.department ?? '—'} · {staff.branchName}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[10px] bg-beige p-3">
          <p className="text-xs text-slate-ui">Employee ID</p>
          <p className="font-semibold">{staff.code}</p>
        </div>
        <div className="rounded-[10px] bg-beige p-3">
          <p className="text-xs text-slate-ui">Hire Date</p>
          <p className="font-semibold">{staff.hireDate}</p>
        </div>
        <div className="rounded-[10px] bg-beige p-3">
          <p className="text-xs text-slate-ui">Type</p>
          <p className="font-semibold">{staff.employmentType}</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-[10px] border border-border p-3">
          <p className="text-xs text-slate-ui">Email</p>
          <p className="font-semibold">{staff.email}</p>
        </div>
        <div className="rounded-[10px] border border-border p-3">
          <p className="text-xs text-slate-ui">Phone</p>
          <p className="font-semibold">{staff.phone}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[10px] border border-border p-3">
          <p className="text-xs text-slate-ui">Rating</p>
          <p className="font-semibold">{staff.rating} ★</p>
        </div>
        <div className="rounded-[10px] border border-border p-3">
          <p className="text-xs text-slate-ui">Base Salary</p>
          <p className="font-semibold">{formatPeso(staff.baseSalary)}</p>
        </div>
      </div>
    </div>
  )
}

export function CommissionsPage() {
  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Commissions"
        description="Configurable commission ledger (default rate from system settings)."
      />
      <Card className="p-4">
        <CardHeader
          title="Commission Rules"
          description="Default rate is stored in system_settings — not hard-coded in business logic."
        />
        <p className="text-sm">
          Organization default: <strong>5%</strong> (configurable)
        </p>
      </Card>
      <Card className="overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ivory-100 text-xs uppercase text-slate-ui">
            <tr>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Sale</th>
              <th className="px-4 py-3">Gross</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {demoCommissions.map((c) => (
              <tr key={c.id} className="border-t border-border/70">
                <td className="px-4 py-3">{c.staffName}</td>
                <td className="px-4 py-3">{c.sourceSaleId}</td>
                <td className="px-4 py-3">{formatPeso(c.grossAmount)}</td>
                <td className="px-4 py-3">{(c.rate * 100).toFixed(0)}%</td>
                <td className="px-4 py-3">{formatPeso(c.amount)}</td>
                <td className="px-4 py-3">
                  <Badge variant="success">{c.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
