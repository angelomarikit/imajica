import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Eye,
  FileSpreadsheet,
  Pencil,
  Plus,
  Save,
  Search,
  UserMinus,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { demoCommissions } from '@/constants/demoData'
import { useAuth } from '@/contexts/AuthContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { exportCsv } from '@/services/analyticsService'
import {
  getEmployeeById,
  listDirectoryStaff,
  saveEmployeeHrDetails,
  subscribeEmployeeHr,
} from '@/services/staffDirectoryService'
import type { Staff } from '@/types'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'
import { canAccessPeopleOps, isFranchiseBranchOwner } from '@/utils/franchiseAccess'
import { formatRoleLabel } from '@/utils/roleLabels'

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-[#073D2C] outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10'

const labelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-ui'

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
  const { user } = useAuth()
  const peopleOps = canAccessPeopleOps(user)
  const franchiseOwner = isFranchiseBranchOwner(user)
  const forcedBranchId = useForcedBranchId()
  const [staffRows, setStaffRows] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const rows = await listDirectoryStaff()
        if (!cancelled) setStaffRows(rows)
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load employees')
          setStaffRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return subscribeEmployeeHr(() => {
      void load()
    })
  }, [])

  const filtered = useMemo(() => {
    let list = staffRows
    if (franchiseOwner) {
      list = list.filter(
        (s) =>
          (forcedBranchId && s.branchId === forcedBranchId) ||
          (user?.branchName && s.branchName === user.branchName),
      )
    }
    const q = query.toLowerCase()
    if (!q) return list
    return list.filter((s) => {
      const hay =
        `${s.fullName} ${s.email} ${s.title} ${s.phone} ${s.branchName} ${s.department ?? ''} ${s.employeeCode ?? ''} ${s.address ?? ''} ${s.emergencyContactName ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [staffRows, query, franchiseOwner, forcedBranchId, user?.branchName])

  function handleExport() {
    exportCsv(
      'imajica-employee-database.csv',
      [
        'Name',
        'Email',
        'Position',
        'Phone',
        'Branch',
        'Department',
        'Employee No',
        'Address',
        'Emergency Contact',
        'Emergency Phone',
        'Status',
      ],
      filtered.map((s) => [
        s.fullName,
        s.email,
        s.title,
        s.phone,
        s.branchName,
        s.department ?? '',
        s.employeeCode ?? '',
        s.address ?? '',
        s.emergencyContactName ?? '',
        s.emergencyContactPhone ?? '',
        s.status,
      ]),
    )
    toast.success('Exported employee database')
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Employee Database"
        description="Company employees from User Access / clinic accounts. Open a profile for contact, home address, emergency person, and employment details."
        stat={{ value: filtered.length, label: 'Total Employees' }}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-[#073D2C]">Staff Members Log</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="gold" onClick={handleExport} className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </Button>
            {peopleOps ? (
              <Button type="button" onClick={() => navigate('/admin/staff/new')} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add New Staff
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
            <input
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setQuery(queryDraft.trim())}
              placeholder="Search by name, email, phone, position, branch, address, or emergency contact…"
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
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-2 py-8 text-center text-slate-ui">
                    Loading employees…
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
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
                    <td className="px-2 py-3">
                      <p className="font-semibold text-[#073D2C]">{s.fullName}</p>
                      {s.employeeCode ? (
                        <p className="text-[11px] text-slate-ui">Emp #{s.employeeCode}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-3 text-slate-ui">{s.email || '—'}</td>
                    <td className="px-2 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {s.title || formatRoleLabel(s.role)}
                      </span>
                    </td>
                    <td className="px-2 py-3">{s.phone || '—'}</td>
                    <td className="px-2 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {s.branchName || '—'}
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
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-sky-50 text-sky-700 hover:bg-sky-100"
                          title="View employee details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        {peopleOps ? (
                          <Link
                            to={`/admin/staff/${s.id}?edit=1`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-orange-50 text-orange-700 hover:bg-orange-100"
                            title="Edit HR details"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        ) : null}
                        {peopleOps ? (
                          <button
                            type="button"
                            title="Deactivate"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-red-50 text-red-700 hover:bg-red-100"
                            onClick={() =>
                              toast.message('Deactivate from User Access / Branches Accounts')
                            }
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-8 text-center text-slate-ui">
                    No employees found.
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
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const peopleOps = canAccessPeopleOps(user)
  const navigate = useNavigate()
  const editRequested = searchParams.get('edit') === '1'

  const [staff, setStaff] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [hireDate, setHireDate] = useState('')
  const [employmentType, setEmploymentType] = useState('Full-time')
  const [address, setAddress] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyRelation, setEmergencyRelation] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')

  useEffect(() => {
    if (editRequested && peopleOps) setEditing(true)
  }, [editRequested, peopleOps])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) return
      setLoading(true)
      try {
        const row = await getEmployeeById(id)
        if (cancelled) return
        setStaff(row)
        if (row) hydrateForm(row)
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load employee')
          setStaff(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return subscribeEmployeeHr(() => {
      void load()
    })
  }, [id])

  function hydrateForm(row: Staff) {
    setFirstName(row.firstName ?? '')
    setMiddleName(row.middleName ?? '')
    setLastName(row.lastName ?? '')
    setBirthDate(row.birthDate ?? '')
    setPhone(row.phone ?? '')
    setTitle(row.title ?? '')
    setDepartment(row.department ?? '')
    setHireDate(row.hireDate ?? '')
    setEmploymentType(row.employmentType || 'Full-time')
    setAddress(row.address ?? '')
    setEmergencyName(row.emergencyContactName ?? '')
    setEmergencyRelation(row.emergencyContactRelation ?? '')
    setEmergencyPhone(row.emergencyContactPhone ?? '')
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!staff || !peopleOps) return
    setSaving(true)
    try {
      const updated = await saveEmployeeHrDetails(staff, {
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate || undefined,
        phone: phone.trim(),
        title: title.trim(),
        department: department.trim(),
        hireDate: hireDate || undefined,
        employmentType,
        address: address.trim(),
        emergencyContactName: emergencyName.trim(),
        emergencyContactRelation: emergencyRelation.trim(),
        emergencyContactPhone: emergencyPhone.trim(),
      })
      setStaff(updated)
      hydrateForm(updated)
      setEditing(false)
      toast.success('Employee HR details saved')
      navigate(`/admin/staff/${updated.id}`, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save employee details')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-slate-ui">Loading employee…</div>
    )
  }

  if (!staff) {
    return (
      <div className="space-y-5">
        <AdminPageBanner title="Employee not found" description="This account is not in the employee directory." />
        <Link to="/admin/staff">
          <Button variant="gold">Back to Employee Database</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        eyebrow="HR · Employee Database"
        title={staff.fullName}
        description={`${staff.title || formatRoleLabel(staff.role)} · ${staff.branchName || '—'}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/staff">
              <Button variant="gold" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            {peopleOps && !editing ? (
              <Button type="button" className="gap-1.5" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit details
              </Button>
            ) : null}
          </div>
        }
      />

      {editing && peopleOps ? (
        <form onSubmit={handleSave} className="space-y-4">
          <Card className="p-5 sm:p-6">
            <h2 className={cn(labelClass, 'mb-4')}>Personal information</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className={labelClass}>First name</span>
                <input className={fieldClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </label>
              <label className="block">
                <span className={labelClass}>Middle name</span>
                <input className={fieldClass} value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
              </label>
              <label className="block">
                <span className={labelClass}>Last name</span>
                <input className={fieldClass} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </label>
              <label className="block">
                <span className={labelClass}>Birth date</span>
                <input type="date" className={fieldClass} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </label>
              <label className="block">
                <span className={labelClass}>Mobile number</span>
                <input
                  className={fieldClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09XXXXXXXXX"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Work email</span>
                <input className={fieldClass} value={staff.email} disabled />
              </label>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className={cn(labelClass, 'mb-4')}>Employment</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Position / title</span>
                <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="block">
                <span className={labelClass}>Department</span>
                <input className={fieldClass} value={department} onChange={(e) => setDepartment(e.target.value)} />
              </label>
              <label className="block">
                <span className={labelClass}>Hire / join date</span>
                <input type="date" className={fieldClass} value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
              </label>
              <label className="block">
                <span className={labelClass}>Employment type</span>
                <select className={fieldClass} value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                </select>
              </label>
              <div className="rounded-[10px] border border-border bg-ivory-50 p-3 sm:col-span-2">
                <p className="text-xs text-slate-ui">Branch · Role · Employee no.</p>
                <p className="mt-1 font-semibold text-[#073D2C]">
                  {staff.branchName || '—'} · {formatRoleLabel(staff.role)}
                  {staff.employeeCode ? ` · Emp #${staff.employeeCode}` : ''}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className={cn(labelClass, 'mb-4')}>Home address</h2>
            <label className="block">
              <span className={labelClass}>Complete residential address</span>
              <textarea
                className={cn(fieldClass, 'min-h-[100px] resize-y')}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House/Unit, Street, Barangay, City, Province"
              />
            </label>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className={cn(labelClass, 'mb-4')}>Emergency contact</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className={labelClass}>Person to contact</span>
                <input className={fieldClass} value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
              </label>
              <label className="block">
                <span className={labelClass}>Relationship</span>
                <input
                  className={fieldClass}
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  placeholder="Spouse, Parent, Sibling…"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Emergency mobile</span>
                <input className={fieldClass} value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
              </label>
            </div>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                hydrateForm(staff)
                setEditing(false)
                navigate(`/admin/staff/${staff.id}`, { replace: true })
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="gap-1.5" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save HR details'}
            </Button>
          </div>
        </form>
      ) : (
        <StaffDetailBody staff={staff} />
      )}
    </div>
  )
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-border p-3">
      <p className="text-xs text-slate-ui">{label}</p>
      <p className="mt-1 font-semibold text-[#073D2C] whitespace-pre-wrap">{value || '—'}</p>
    </div>
  )
}

function StaffDetailBody({ staff }: { staff: Staff }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={staff.status === 'active' ? 'success' : 'danger'}>
          {staff.status === 'active' ? 'Active' : 'Inactive'}
        </Badge>
        <span className="text-slate-ui">
          {staff.title || formatRoleLabel(staff.role)} · {staff.department || '—'} ·{' '}
          {staff.branchName || '—'}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[10px] bg-beige p-3">
          <p className="text-xs text-slate-ui">Employee ID</p>
          <p className="font-semibold">{staff.code}</p>
        </div>
        <div className="rounded-[10px] bg-beige p-3">
          <p className="text-xs text-slate-ui">Kiosk Emp #</p>
          <p className="font-semibold">{staff.employeeCode || '—'}</p>
        </div>
        <div className="rounded-[10px] bg-beige p-3">
          <p className="text-xs text-slate-ui">Hire date</p>
          <p className="font-semibold">{staff.hireDate || '—'}</p>
        </div>
        <div className="rounded-[10px] bg-beige p-3">
          <p className="text-xs text-slate-ui">Employment type</p>
          <p className="font-semibold">{staff.employmentType || '—'}</p>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <h3 className={cn(labelClass, 'mb-3')}>Personal & contact</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <DetailTile label="Full name" value={staff.fullName} />
          <DetailTile label="Birth date" value={staff.birthDate || '—'} />
          <DetailTile label="Mobile number" value={staff.phone || '—'} />
          <DetailTile label="Work email" value={staff.email || '—'} />
          <DetailTile label="Role" value={formatRoleLabel(staff.role)} />
          <DetailTile label="Branch" value={staff.branchName || '—'} />
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <h3 className={cn(labelClass, 'mb-3')}>Home address</h3>
        <DetailTile label="Residential address" value={staff.address || 'Not on file yet'} />
      </Card>

      <Card className="p-4 sm:p-5">
        <h3 className={cn(labelClass, 'mb-3')}>Emergency contact</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <DetailTile label="Person to contact" value={staff.emergencyContactName || 'Not on file yet'} />
          <DetailTile label="Relationship" value={staff.emergencyContactRelation || '—'} />
          <DetailTile label="Emergency mobile" value={staff.emergencyContactPhone || '—'} />
        </div>
      </Card>

      {staff.baseSalary > 0 ? (
        <div className="rounded-[10px] border border-border p-3">
          <p className="text-xs text-slate-ui">Base salary (HR record)</p>
          <p className="font-semibold">{formatPeso(staff.baseSalary)}</p>
        </div>
      ) : null}
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
