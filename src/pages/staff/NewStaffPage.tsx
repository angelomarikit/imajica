import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { getBranches } from '@/services/branchService'
import { DEPARTMENTS, getPositions } from '@/services/staffPositionsService'
import { cn } from '@/utils/cn'
import { isFranchiseBranchOwner } from '@/utils/franchiseAccess'

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-[#073D2C] outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10'

const labelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-ui'

export function NewStaffPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const franchiseOwner = isFranchiseBranchOwner(user)
  const forcedBranchId = useForcedBranchId()
  const positions = getPositions().filter((p) => p.status === 'active')
  const branchOptions = useMemo(() => getBranches().filter((b) => b.status === 'active'), [])

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [positionId, setPositionId] = useState(positions[0]?.id ?? '')
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0])
  const [joinDate, setJoinDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [employmentType, setEmploymentType] = useState('Full-time')
  const [branchId, setBranchId] = useState(
    forcedBranchId ?? branchOptions[0]?.id ?? '',
  )
  const [address, setAddress] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyRelation, setEmergencyRelation] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (forcedBranchId) setBranchId(forcedBranchId)
  }, [forcedBranchId])

  const position = positions.find((p) => p.id === positionId)
  const branch = branchOptions.find((b) => b.id === branchId)
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const initials =
    `${firstName.charAt(0) || ''}${lastName.charAt(0) || ''}`.toUpperCase() || 'NA'

  function onPhoto(file: File | undefined) {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required')
      return
    }
    toast.success('Staff saved (demo)', {
      description: `${fullName} will sync to public.staff when Supabase is connected.`,
    })
    navigate('/admin/staff')
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Add New Staff"
        description="Register a new clinician, receptionist, or admin personnel. Configure department and branch scopes."
        actions={
          <Link to="/admin/staff">
            <Button variant="gold" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back to Directory
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">
        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <h2 className={cn(labelClass, 'mb-4 text-slate-ui')}>
              Personal &amp; Employment Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>First Name</span>
                <input
                  className={fieldClass}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                />
              </label>
              <label className="block">
                <span className={labelClass}>Last Name</span>
                <input
                  className={fieldClass}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                />
              </label>
              <label className="block">
                <span className={labelClass}>Birth Date</span>
                <input
                  type="date"
                  className={fieldClass}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Email Address</span>
                <input
                  type="email"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@imajica.ph"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Contact Number</span>
                <input
                  className={fieldClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09XXXXXXXXX"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Position</span>
                <select
                  className={fieldClass}
                  value={positionId}
                  onChange={(e) => {
                    setPositionId(e.target.value)
                    const pos = positions.find((p) => p.id === e.target.value)
                    if (pos) setDepartment(pos.department)
                  }}
                >
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Department</span>
                <select
                  className={fieldClass}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Join Date</span>
                <input
                  type="date"
                  className={fieldClass}
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Employment Type</span>
                <select
                  className={fieldClass}
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Branch Assignment</span>
                <select
                  className={fieldClass}
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={franchiseOwner}
                >
                  {(franchiseOwner
                    ? branchOptions.filter((b) => b.id === forcedBranchId)
                    : branchOptions
                  ).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className={cn(labelClass, 'mb-4')}>Residential Address</h2>
            <label className="block">
              <span className={labelClass}>Complete Address</span>
              <textarea
                className={cn(fieldClass, 'min-h-[100px] resize-y')}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House/Unit, Street, Barangay, City"
              />
            </label>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className={cn(labelClass, 'mb-4')}>Emergency Contact</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className={labelClass}>Contact Name</span>
                <input
                  className={fieldClass}
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Relationship</span>
                <input
                  className={fieldClass}
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  placeholder="Spouse, Parent…"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Phone</span>
                <input
                  className={fieldClass}
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                />
              </label>
            </div>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card className="p-5 text-center">
            <h2 className={cn(labelClass, 'mb-4')}>Profile Photo</h2>
            <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[#073D2C] text-2xl font-semibold text-white">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-[#C5A059] px-4 py-2.5 text-sm font-semibold text-[#073D2C] hover:bg-[#b8944d]">
              <Upload className="h-4 w-4" />
              Upload Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
            </label>
          </Card>

          <div className="overflow-hidden rounded-[16px] border border-[#C5A059]/35 bg-[linear-gradient(160deg,#0A2E26_0%,#073D2C_55%,#063B2A_100%)] p-5 text-white shadow-[0_16px_40px_rgba(7,61,44,0.28)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C5A059]">
              Live Preview
            </p>
            <p className="mt-3 font-display text-2xl text-[#F3E6C8]">
              {fullName || 'Staff Name'}
            </p>
            <p className="mt-1 text-sm text-white/75">{position?.name || 'Position Title'}</p>
            <div className="mt-5 space-y-2 border-t border-white/15 pt-4 text-xs text-white/70">
              <p>
                <span className="text-white/45">Email:</span> {email || '—'}
              </p>
              <p>
                <span className="text-white/45">Department:</span> {department || '—'}
              </p>
              <p>
                <span className="text-white/45">Branch:</span> {branch?.name || '—'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => navigate('/admin/staff')}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-1.5">
              <Save className="h-4 w-4" />
              Save Staff
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
