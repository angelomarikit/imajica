import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { demoBranches } from '@/constants/demoData'
import {
  getClients,
  registerClient,
  subscribeClients,
} from '@/services/clientService'
import type { Client } from '@/types'
import { cn } from '@/utils/cn'

const field =
  'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15'
const labelCls = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal'

export function SelectPatientModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (client: Client) => void
}) {
  const [clients, setClients] = useState(() => getClients())
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [gender, setGender] = useState<Client['gender'] | ''>('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [occupation, setOccupation] = useState('')
  const [address, setAddress] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => subscribeClients(() => setClients(getClients())), [])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setApplied('')
    }
  }, [open])

  const matches = useMemo(() => {
    const q = applied.trim().toLowerCase()
    if (!q) return []
    return clients.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')),
    )
  }, [clients, applied])

  function handleSearch(e?: FormEvent) {
    e?.preventDefault()
    setApplied(query)
  }

  function handleAddPatient(e: FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required')
      return
    }
    if (!phone.trim()) {
      toast.error('Contact number is required')
      return
    }
    const branch = demoBranches[0]
    setSaving(true)
    try {
      const client = registerClient({
        firstName,
        middleName,
        lastName,
        email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@imajica.local`,
        phone: phone.startsWith('+63') || phone.startsWith('09') ? phone : `+63${phone.replace(/^0/, '')}`,
        dateOfBirth: birthdate || '1990-01-01',
        gender: gender || 'prefer_not_to_say',
        branchId: branch?.id ?? 'br-pasig',
        branchName: (branch?.name ?? 'Pasig').replace(/ Branch$/, ''),
        occupation,
        address: address || 'N/A',
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
      })
      toast.success(`${client.fullName} added`)
      onSelect(client)
      onClose()
      setFirstName('')
      setMiddleName('')
      setLastName('')
      setBirthdate('')
      setGender('')
      setPhone('')
      setEmail('')
      setOccupation('')
      setAddress('')
      setEmergencyName('')
      setEmergencyPhone('')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <button
        type="button"
        className="fixed inset-0 bg-[#041c18]/50 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-patient-title"
        className="relative z-10 my-4 w-full max-w-3xl rounded-[16px] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 id="select-patient-title" className="font-display text-2xl text-[#073D2C] sm:text-3xl">
              Add New Patient
            </h2>
            <p className="text-sm text-slate-ui">
              Search for an existing patient or register a new one.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ivory-100"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[min(80vh,720px)] space-y-4 overflow-y-auto p-5 sm:p-6">
          <section className="rounded-[12px] border border-border p-4">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-[#073D2C]">Existing Patient Lookup</h3>
              <Badge variant="neutral">Lookup</Badge>
            </div>
            <p className="mb-3 text-sm text-slate-ui">
              Search by name, email, or contact number to find and select an existing patient.
            </p>
            <form onSubmit={handleSearch} className="space-y-1.5">
              <span className={labelCls}>Search Patient</span>
              <div className="flex gap-2">
                <input
                  className={cn(field, 'flex-1')}
                  placeholder="Enter patient name, email or phone number..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Button type="submit">
                  <Search className="h-4 w-4" /> Search
                </Button>
              </div>
            </form>
            {applied ? (
              <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto">
                {matches.length === 0 ? (
                  <li className="rounded-[10px] bg-ivory-100 px-3 py-2 text-sm text-slate-ui">
                    No patients found for “{applied}”.
                  </li>
                ) : (
                  matches.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(c)
                          onClose()
                          toast.success(`Selected ${c.fullName}`)
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-border px-3 py-2.5 text-left text-sm hover:bg-emerald-50"
                      >
                        <div>
                          <p className="font-semibold text-[#073D2C]">{c.fullName}</p>
                          <p className="text-xs text-slate-ui">
                            {c.phone} · {c.email}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-800">Select</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </section>

          <form
            id="new-patient-form"
            onSubmit={handleAddPatient}
            className="rounded-[12px] border border-border p-4"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-[#073D2C]">New Patient Information</h3>
              <Badge variant="gold">New</Badge>
            </div>
            <p className="mb-4 text-sm text-slate-ui">
              Complete the profile details below to create a fresh patient record.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className={labelCls}>Patient First Name</span>
                <input className={field} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </label>
              <label className="block">
                <span className={labelCls}>Patient Middle Name</span>
                <input className={field} value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
              </label>
              <label className="block">
                <span className={labelCls}>Patient Last Name</span>
                <input className={field} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Birthdate</span>
                <input type="date" className={field} value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
              </label>
              <label className="block">
                <span className={labelCls}>Gender</span>
                <select
                  className={cn(field, !gender && 'text-slate-ui/70')}
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Client['gender'] | '')}
                >
                  <option value="">Select Gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Contact Number</span>
                <div className="flex gap-2">
                  <span className="inline-flex h-11 items-center rounded-[10px] border border-border bg-ivory-100 px-3 text-sm font-medium text-slate-ui">
                    +63
                  </span>
                  <input
                    className={cn(field, 'flex-1')}
                    placeholder="917XXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </label>
              <label className="block">
                <span className={labelCls}>Email</span>
                <input
                  type="email"
                  className={field}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className={labelCls}>Occupation</span>
              <input className={field} value={occupation} onChange={(e) => setOccupation(e.target.value)} />
            </label>

            <label className="mt-3 block">
              <span className={labelCls}>Address</span>
              <textarea
                className="min-h-[72px] w-full rounded-[10px] border border-border px-3 py-2 text-sm"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Emergency Contact Name</span>
                <input className={field} value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
              </label>
              <label className="block">
                <span className={labelCls}>Emergency Contact Number</span>
                <input className={field} value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
              </label>
            </div>
          </form>
        </div>

        <div className="flex justify-end border-t border-border px-5 py-4 sm:px-6">
          <Button type="submit" form="new-patient-form" disabled={saving}>
            {saving ? 'Saving…' : 'ADD PATIENT'}
          </Button>
        </div>
      </div>
    </div>
  )
}
