import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useBranch } from '@/contexts/BranchContext'
import {
  CSR_MARKETING_SOURCES,
  csrCreateIntakeBooking,
  listCsrTreatments,
} from '@/services/csrMarketingService'
import { cn } from '@/utils/cn'

const fieldLabel = 'mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal'
const fieldControl =
  'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15'

type IntervalMinutes = 60 | 90

const DAY_START_MINUTES = 8 * 60 // 8:00 AM
const DAY_END_MINUTES = 20 * 60 // 8:00 PM last end
const SLOT_STEP_MINUTES = 30

function formatClock(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function toTimeValue(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function buildIntervalSlots(duration: IntervalMinutes): { start: string; label: string }[] {
  const slots: { start: string; label: string }[] = []
  for (let start = DAY_START_MINUTES; start + duration <= DAY_END_MINUTES; start += SLOT_STEP_MINUTES) {
    const end = start + duration
    slots.push({
      start: toTimeValue(start),
      label: `${formatClock(start)} – ${formatClock(end)}`,
    })
  }
  return slots
}

export function CsrBookAppointmentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { selectedBranchId, branches, setSelectedBranchId } = useBranch()
  const branchId = selectedBranchId !== 'all' ? selectedBranchId : branches[0]?.id || ''

  const dateFromQuery = searchParams.get('date')
  const initialDate =
    dateFromQuery && /^\d{4}-\d{2}-\d{2}$/.test(dateFromQuery)
      ? dateFromQuery
      : new Date().toISOString().slice(0, 10)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [skinConcern, setSkinConcern] = useState('')
  const [preferredProcedure, setPreferredProcedure] = useState('')
  const [date, setDate] = useState(initialDate)
  const [intervalMinutes, setIntervalMinutes] = useState<IntervalMinutes>(60)
  const [time, setTime] = useState('10:00')
  const [source, setSource] = useState<string>('Other')
  const [saving, setSaving] = useState(false)

  const timeSlots = useMemo(() => buildIntervalSlots(intervalMinutes), [intervalMinutes])

  const [treatments, setTreatments] = useState<
    { id: string; name: string; durationMinutes: number; price: number }[]
  >([])

  useEffect(() => {
    if (!branchId) return
    void listCsrTreatments(branchId)
      .then(setTreatments)
      .catch(() => setTreatments([]))
  }, [branchId])

  const matchedTreatment = useMemo(() => {
    const q = preferredProcedure.trim().toLowerCase()
    if (!q) return null
    return (
      treatments.find((t) => t.name.toLowerCase() === q) ||
      treatments.find((t) => t.name.toLowerCase().includes(q)) ||
      null
    )
  }, [preferredProcedure, treatments])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!branchId) {
      toast.error('Select a branch')
      return
    }
    if (!fullName.trim()) {
      toast.error('Full name is required')
      return
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 7) {
      toast.error('Contact number is required')
      return
    }
    if (!date || !time) {
      toast.error('Date and time slot are required')
      return
    }
    if (!timeSlots.some((s) => s.start === time)) {
      toast.error('Select a valid time interval')
      return
    }

    setSaving(true)
    try {
      const start = new Date(`${date}T${time}:00`)
      const id = await csrCreateIntakeBooking({
        fullName: fullName.trim(),
        phone: phone.trim(),
        branchId,
        startAt: start.toISOString(),
        address: address.trim() || null,
        email: email.trim() || null,
        skinConcern: skinConcern.trim() || null,
        preferredProcedure: preferredProcedure.trim() || null,
        durationMinutes: intervalMinutes,
        marketingSource: source || 'Other',
      })
      toast.success('Booking added for this branch')
      navigate('/admin/csr/calendar', { state: { createdId: id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-emerald-800" />
          <h1 className="text-xl font-bold text-charcoal">Book Appointment</h1>
        </div>
        <p className="mt-1 text-sm text-slate-ui">
          Same intake fields the team collects — save directly as a booking for the selected branch.
        </p>
      </div>

      <Card className="mx-auto max-w-2xl p-5 sm:p-6">
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <label className="block">
            <span className={fieldLabel}>
              Full Name <span className="text-red-500">*</span>
            </span>
            <input
              className={fieldControl}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              required
              autoComplete="name"
            />
          </label>

          <label className="block">
            <span className={fieldLabel}>
              Contact Number <span className="text-red-500">*</span>
            </span>
            <input
              className={fieldControl}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09XXXXXXXXX"
              required
              inputMode="tel"
              autoComplete="tel"
            />
          </label>

          <label className="block">
            <span className={fieldLabel}>Address</span>
            <input
              className={fieldControl}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
              autoComplete="street-address"
            />
          </label>

          <label className="block">
            <span className={fieldLabel}>Email</span>
            <input
              type="email"
              className={fieldControl}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className={fieldLabel}>Skin / Body Concern</span>
            <textarea
              className="min-h-[88px] w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
              value={skinConcern}
              onChange={(e) => setSkinConcern(e.target.value)}
              placeholder="Skin/Body Concern"
            />
          </label>

          <label className="block">
            <span className={fieldLabel}>Preferred Procedure</span>
            <input
              className={fieldControl}
              list="csr-procedure-list"
              value={preferredProcedure}
              onChange={(e) => setPreferredProcedure(e.target.value)}
              placeholder="Type or pick a procedure"
            />
            <datalist id="csr-procedure-list">
              {treatments.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
            {matchedTreatment ? (
              <p className="mt-1.5 text-xs text-emerald-800">
                Matched catalog: {matchedTreatment.name}
              </p>
            ) : preferredProcedure.trim() ? (
              <p className="mt-1.5 text-xs text-slate-ui">
                Saved as free-text preferred procedure (clinic can map later).
              </p>
            ) : null}
          </label>

          <label className="block">
            <span className={fieldLabel}>
              Date <span className="text-red-500">*</span>
            </span>
            <input
              type="date"
              className={fieldControl}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>

          <div>
            <span className={fieldLabel}>
              Interval <span className="text-red-500">*</span>
            </span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {([60, 90] as IntervalMinutes[]).map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setIntervalMinutes(mins)
                    const nextSlots = buildIntervalSlots(mins)
                    if (!nextSlots.some((s) => s.start === time)) {
                      setTime(nextSlots.find((s) => s.start === '10:00')?.start ?? nextSlots[0]?.start ?? '')
                    }
                  }}
                  className={cn(
                    'rounded-[10px] border px-4 py-2.5 text-sm font-semibold transition-colors',
                    intervalMinutes === mins
                      ? 'border-emerald-800 bg-emerald-900 text-white'
                      : 'border-border bg-white text-charcoal hover:bg-cream/60',
                  )}
                >
                  {mins} mins
                  <span className="ml-1.5 font-normal opacity-80">
                    {mins === 60 ? '(e.g. 8:00 – 9:00 AM)' : '(e.g. 8:00 – 9:30 AM)'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className={fieldLabel}>
              Time <span className="text-red-500">*</span>
            </span>
            <select
              className={cn(fieldControl, !time && 'text-slate-400')}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            >
              <option value="" disabled>
                Select time slot
              </option>
              {timeSlots.map((slot) => (
                <option key={`${intervalMinutes}-${slot.start}`} value={slot.start}>
                  {slot.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-ui">
              Slots every 30 minutes from 8:00 AM, ending by 8:00 PM.
            </p>
          </label>

          <label className="block">
            <span className={fieldLabel}>
              Branch <span className="text-red-500">*</span>
            </span>
            <select
              className={cn(fieldControl, !branchId && 'text-slate-400')}
              value={branchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select branch
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-ui">Only clinics assigned to your CSR account.</p>
          </label>

          <label className="block">
            <span className={fieldLabel}>Lead source (optional)</span>
            <select
              className={fieldControl}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {CSR_MARKETING_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="submit" disabled={saving || !branchId}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {saving ? 'Saving…' : 'Add booking'}
            </Button>
            <Link to="/admin/csr/calendar" className="inline-flex">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
