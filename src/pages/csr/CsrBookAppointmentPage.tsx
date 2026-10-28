import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Search, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useBranch } from '@/contexts/BranchContext'
import {
  CSR_MARKETING_SOURCES,
  csrCreateBooking,
  csrLookupPatients,
  csrRegisterLimitedClient,
  listCsrBranchStaff,
  listCsrTreatments,
  type CsrPatientHit,
} from '@/services/csrMarketingService'
import { cn } from '@/utils/cn'

const fieldLabel = 'mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal'
const fieldControl =
  'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15'

type Step = 1 | 2 | 3 | 4 | 5

export function CsrBookAppointmentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { selectedBranchId, selectedBranch, branches, setSelectedBranchId } = useBranch()
  const branchId = selectedBranchId !== 'all' ? selectedBranchId : branches[0]?.id || ''

  const dateFromQuery = searchParams.get('date')
  const initialDate =
    dateFromQuery && /^\d{4}-\d{2}-\d{2}$/.test(dateFromQuery)
      ? dateFromQuery
      : new Date().toISOString().slice(0, 10)

  const [step, setStep] = useState<Step>(dateFromQuery ? 2 : 1)
  const [phone, setPhone] = useState('')
  const [patientName, setPatientName] = useState('')
  const [hits, setHits] = useState<CsrPatientHit[]>([])
  const [selectedPatient, setSelectedPatient] = useState<CsrPatientHit | null>(null)
  const [searching, setSearching] = useState(false)

  const [treatments, setTreatments] = useState<
    { id: string; name: string; durationMinutes: number; price: number }[]
  >([])
  const [staff, setStaff] = useState<{ id: string; fullName: string }[]>([])
  const [treatmentId, setTreatmentId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState('10:00')
  const [source, setSource] = useState('')
  const [campaign, setCampaign] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const treatment = useMemo(
    () => treatments.find((t) => t.id === treatmentId),
    [treatments, treatmentId],
  )

  useEffect(() => {
    if (!branchId) return
    void listCsrTreatments(branchId)
      .then(setTreatments)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Treatments failed'))
    void listCsrBranchStaff(branchId)
      .then(setStaff)
      .catch(() => setStaff([]))
  }, [branchId])

  async function handleSearch() {
    if (!phone.trim()) {
      toast.error('Enter a mobile number')
      return
    }
    setSearching(true)
    try {
      const rows = await csrLookupPatients(phone.trim(), branchId || null)
      setHits(rows)
      setSelectedPatient(null)
      if (!rows.length) toast.message('No match — you can register a limited patient next')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setSearching(false)
    }
  }

  async function resolveClientId(): Promise<string> {
    if (selectedPatient) return selectedPatient.id
    if (!patientName.trim()) throw new Error('Enter patient name for a new registration')
    if (!branchId) throw new Error('Select a branch')
    return csrRegisterLimitedClient({
      fullName: patientName.trim(),
      phone: phone.trim(),
      branchId,
      leadSource: source || null,
    })
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault()
    if (!branchId) {
      toast.error('Select a branch')
      return
    }
    if (!treatment) {
      toast.error('Select a treatment')
      return
    }
    if (!source) {
      toast.error('Select a marketing source')
      return
    }
    setSaving(true)
    try {
      const clientId = await resolveClientId()
      const start = new Date(`${date}T${time}:00`)
      const end = new Date(start.getTime() + treatment.durationMinutes * 60_000)
      const id = await csrCreateBooking({
        branchId,
        clientId,
        treatmentId: treatment.id,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        staffId: staffId || null,
        marketingSource: source,
        marketingCampaign: campaign.trim() || null,
        bookingNotes: notes.trim() || null,
        treatmentName: treatment.name,
      })
      toast.success('Booking confirmed')
      navigate('/admin/csr/calendar', { state: { createdId: id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setSaving(false)
    }
  }

  const patientKind = selectedPatient
    ? selectedPatient.isExisting
      ? 'Existing patient'
      : 'Registered (limited)'
    : hits.length === 0 && phone
      ? 'New patient (will create limited record)'
      : '—'

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-emerald-800" />
          <h1 className="text-xl font-bold text-charcoal">Book Appointment</h1>
        </div>
        <p className="mt-1 text-sm text-slate-ui">
          Select Branch → Search Patient → Treatment → Schedule → Confirm
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([1, 2, 3, 4, 5] as Step[]).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStep(n)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold',
              step === n ? 'bg-emerald-900 text-white' : 'bg-cream text-charcoal',
            )}
          >
            {n}.{' '}
            {n === 1
              ? 'Branch'
              : n === 2
                ? 'Patient'
                : n === 3
                  ? 'Treatment'
                  : n === 4
                    ? 'Schedule'
                    : 'Confirm'}
          </button>
        ))}
      </div>

      <Card className="space-y-4 p-5">
        {step === 1 ? (
          <label className="block max-w-md">
            <span className={fieldLabel}>Branch</span>
            <select
              className={fieldControl}
              value={branchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-ui">Only clinics assigned to your CSR account.</p>
            <Button className="mt-4" type="button" onClick={() => setStep(2)} disabled={!branchId}>
              Continue
            </Button>
          </label>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block">
                <span className={fieldLabel}>Mobile number</span>
                <input
                  className={fieldControl}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09XXXXXXXXX"
                />
              </label>
              <Button
                type="button"
                className="mt-6"
                disabled={searching}
                onClick={() => void handleSearch()}
              >
                <Search className="mr-1.5 h-4 w-4" />
                {searching ? 'Searching…' : 'Search'}
              </Button>
            </div>

            {hits.length > 0 ? (
              <ul className="divide-y divide-border rounded-[10px] border border-border">
                {hits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-3 text-left text-sm hover:bg-cream/60',
                        selectedPatient?.id === h.id && 'bg-emerald-50',
                      )}
                      onClick={() => {
                        setSelectedPatient(h)
                        setPatientName(h.fullName)
                      }}
                    >
                      <span>
                        <span className="font-semibold text-charcoal">{h.fullName}</span>
                        <span className="ml-2 text-slate-ui">{h.phoneMasked}</span>
                      </span>
                      <Badge
                        className={
                          h.isExisting ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'
                        }
                      >
                        {h.isExisting ? 'Existing' : 'On file'}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <label className="block max-w-md">
              <span className={fieldLabel}>Patient name</span>
              <input
                className={fieldControl}
                value={patientName}
                onChange={(e) => {
                  setPatientName(e.target.value)
                  if (selectedPatient && e.target.value !== selectedPatient.fullName) {
                    setSelectedPatient(null)
                  }
                }}
                placeholder="Required for new patient"
              />
            </label>
            <p className="text-xs text-slate-ui">
              Classification: <strong>{patientKind}</strong>. New/existing comes from records, not a
              free-text flag.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                type="button"
                onClick={() => setStep(3)}
                disabled={!phone.trim() || (!selectedPatient && !patientName.trim())}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <label className="block max-w-lg">
              <span className={fieldLabel}>Service / treatment</span>
              <select
                className={fieldControl}
                value={treatmentId}
                onChange={(e) => setTreatmentId(e.target.value)}
              >
                <option value="">Select treatment</option>
                {treatments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.durationMinutes} min)
                  </option>
                ))}
              </select>
            </label>
            <label className="block max-w-lg">
              <span className={fieldLabel}>Assigned provider (optional)</span>
              <select
                className={fieldControl}
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
              >
                <option value="">Any / unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button type="button" onClick={() => setStep(4)} disabled={!treatmentId}>
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={fieldLabel}>Appointment date</span>
                <input
                  type="date"
                  className={fieldControl}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>Time</span>
                <input
                  type="time"
                  className={fieldControl}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
            </div>
            <p className="text-xs text-slate-ui">
              Duration follows the selected treatment ({treatment?.durationMinutes ?? '—'} min).
              Overlaps are blocked for assigned providers.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button type="button" onClick={() => setStep(5)}>
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <form className="space-y-4" onSubmit={(e) => void handleConfirm(e)}>
            <div className="rounded-[10px] border border-border bg-cream/40 p-4 text-sm text-charcoal">
              <p>
                <strong>Branch:</strong> {selectedBranch?.name || branchId}
              </p>
              <p>
                <strong>Patient:</strong> {patientName || selectedPatient?.fullName} ({patientKind})
              </p>
              <p>
                <strong>Treatment:</strong> {treatment?.name}
              </p>
              <p>
                <strong>When:</strong> {date} {time}
              </p>
            </div>
            <label className="block max-w-md">
              <span className={fieldLabel}>Marketing source</span>
              <select
                className={fieldControl}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
              >
                <option value="">Select source</option>
                {CSR_MARKETING_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block max-w-md">
              <span className={fieldLabel}>Campaign name (optional)</span>
              <input
                className={fieldControl}
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="Ad set / campaign"
              />
            </label>
            <label className="block max-w-lg">
              <span className={fieldLabel}>Booking notes (non-medical)</span>
              <textarea
                className="min-h-[88px] w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Scheduling notes only — no clinical content"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(4)}>
                Back
              </Button>
              <Button type="submit" disabled={saving}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                {saving ? 'Saving…' : 'Confirm booking'}
              </Button>
              <Link to="/admin/csr/calendar" className="inline-flex">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  )
}
