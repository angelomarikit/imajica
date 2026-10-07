import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { getBranches } from '@/services/branchService'
import { registerClientAndSync } from '@/services/clientService'
import type { Client } from '@/types'
import { cn } from '@/utils/cn'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'

const fieldLabel =
  'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal'
const fieldControl =
  'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15'
const fieldArea =
  'min-h-[88px] w-full resize-y rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15'

function RequiredMark() {
  return <span className="text-red-500"> *</span>
}

export function NewClientPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const handoffLeadId = searchParams.get('handoff') || undefined
  const fileRef = useRef<HTMLInputElement>(null)
  const forcedBranchId = useForcedBranchId()
  const branchOptions = useMemo(() => {
    const all = getBranches().filter((b) => b.code !== 'HQ')
    if (forcedBranchId) return all.filter((b) => b.id === forcedBranchId)
    return all
  }, [forcedBranchId])

  const prefillName = searchParams.get('name')?.trim() || ''
  const nameParts = useMemo(() => {
    const bits = prefillName.split(/\s+/).filter(Boolean)
    if (bits.length <= 1) return { first: bits[0] || '', last: '' }
    return { first: bits.slice(0, -1).join(' '), last: bits[bits.length - 1] || '' }
  }, [prefillName])

  const [firstName, setFirstName] = useState(nameParts.first)
  const [lastName, setLastName] = useState(nameParts.last)
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [phone, setPhone] = useState(searchParams.get('phone') || '')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState<Client['gender'] | ''>('')
  const [branchId, setBranchId] = useState(
    searchParams.get('branchId') || forcedBranchId || branchOptions[0]?.id || '',
  )
  const [occupation, setOccupation] = useState('')
  const [address, setAddress] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [medicalConcerns, setMedicalConcerns] = useState('')
  const [currentMedications, setCurrentMedications] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const initials = useMemo(() => {
    const a = firstName.trim().charAt(0)
    const b = lastName.trim().charAt(0)
    return (a + b || 'NA').toUpperCase()
  }, [firstName, lastName])

  const branch = branchOptions.find((b) => b.id === branchId)

  function onPickImage(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(String(reader.result))
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required')
      return
    }
    if (!email.trim() || !phone.trim() || !dateOfBirth || !gender) {
      toast.error('Please complete all required personal fields')
      return
    }
    if (!address.trim()) {
      toast.error('Address is required')
      return
    }
    if (!branch) {
      toast.error('Select a branch')
      return
    }

    setSaving(true)
    try {
      const client = await registerClientAndSync({
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        gender,
        branchId: branch.id,
        branchName: branch.name.replace(/ Branch$/, ''),
        occupation,
        address,
        emergencyContactName,
        emergencyContactPhone,
        medicalConcerns,
        currentMedications,
        adminNotes,
        avatarUrl: avatarPreview ?? undefined,
        marketingLeadId: handoffLeadId,
      })
      toast.success(
        handoffLeadId
          ? `${client.fullName} registered — Marketing handoff linked`
          : `${client.fullName} registered (${client.code})`,
      )
      navigate(`/admin/clients/${client.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not register customer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C5A059]">
            Customers
          </p>
          <h1 className="font-display text-4xl">New Customer</h1>
          <p className="text-sm text-slate-ui">
            {handoffLeadId
              ? 'Prefilling from a Marketing handoff — keep full name + phone so Book / Show up / Buy sync automatically.'
              : 'Register a new client profile for appointments, treatments, and clinical records.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/clients">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Customer'}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <CardHeader
              title="Personal Information"
              description="Provide profile initials avatar, contact phone numbers, birthdate, and identity details."
            />

            <div className="mb-6 flex flex-col items-center">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#073D2C] text-2xl font-semibold text-white">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickImage(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-emerald-800/40 bg-white px-4 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Image
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={fieldLabel}>
                  First Name
                  <RequiredMark />
                </span>
                <input
                  className={fieldControl}
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>
                  Last Name
                  <RequiredMark />
                </span>
                <input
                  className={fieldControl}
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>
                  Email Address
                  <RequiredMark />
                </span>
                <input
                  type="email"
                  className={fieldControl}
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>
                  Contact Number
                  <RequiredMark />
                </span>
                <input
                  className={fieldControl}
                  placeholder="e.g. 0917XXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>
                  Date of Birth
                  <RequiredMark />
                </span>
                <input
                  type="date"
                  className={fieldControl}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>
                  Gender
                  <RequiredMark />
                </span>
                <select
                  className={cn(fieldControl, !gender && 'text-slate-ui/70')}
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Client['gender'] | '')}
                  required
                >
                  <option value="" disabled>
                    Select Gender
                  </option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </label>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <CardHeader
              title="Branch & Address"
              description="Configure scoping branch, occupation, and home address parameters."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={fieldLabel}>Branch</span>
                <select
                  className={fieldControl}
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={Boolean(forcedBranchId)}
                >
                  {branchOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name.replace(/ Branch$/, '')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={fieldLabel}>Occupation</span>
                <input
                  className={fieldControl}
                  placeholder="e.g. Manager"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={fieldLabel}>
                  Address
                  <RequiredMark />
                </span>
                <textarea
                  className={fieldArea}
                  placeholder="Full residential address details..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </label>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <CardHeader
              title="Emergency Contact"
              description="Primary contact reference details."
            />
            <div className="space-y-4">
              <label className="block">
                <span className={fieldLabel}>Contact Name</span>
                <input
                  className={fieldControl}
                  placeholder="Contact Name"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>Contact Number</span>
                <input
                  className={fieldControl}
                  placeholder="Contact Number"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                />
              </label>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <CardHeader
              title="Allergies & Concerns"
              description="Internal clinical safety records."
            />
            <div className="space-y-4">
              <label className="block">
                <span className={fieldLabel}>Medical Concerns</span>
                <textarea
                  className={fieldArea}
                  placeholder="Any health indicators..."
                  value={medicalConcerns}
                  onChange={(e) => setMedicalConcerns(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>Current Medications</span>
                <textarea
                  className={fieldArea}
                  placeholder="Medication history..."
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>Notes From Admin</span>
                <textarea
                  className={fieldArea}
                  placeholder="Internal remarks..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </label>
            </div>
          </Card>
        </div>
      </div>
    </form>
  )
}
