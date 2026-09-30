import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { createAppointment, toDateKey } from '@/services/appointmentService'
import { getBranches } from '@/services/branchService'
import type { AppointmentStatus } from '@/types'
import { cn } from '@/utils/cn'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'

const fieldLabel = 'mb-1.5 block text-xs font-semibold text-[#334155]'
const fieldControl =
  'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15'

const CLIENT_STATUSES = ['New', 'Pending', 'Paid', 'Confirmed', 'Cancelled'] as const
const SHOW_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'show', label: 'Show' },
  { value: 'no_show', label: 'No Show' },
] as const
const LEAD_CHANNELS = [
  'Facebook',
  'Instagram',
  'Walk-In',
  'Referral',
  'Google',
  'TikTok',
  'Viber',
  'Other',
] as const

function showStatusToAppointment(status: string): AppointmentStatus {
  if (status === 'no_show') return 'no_show'
  if (status === 'show') return 'confirmed'
  return 'pending'
}

export function AddClientScheduleModal({
  open,
  onClose,
  onSaved,
  defaultDate,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void | Promise<void>
  defaultDate?: Date
}) {
  const forcedBranchId = useForcedBranchId()
  const branches = useMemo(() => {
    const all = getBranches().filter((b) => b.code !== 'HQ')
    if (forcedBranchId) return all.filter((b) => b.id === forcedBranchId)
    return all
  }, [forcedBranchId])
  const today = toDateKey(new Date())
  const defaultAppt = toDateKey(defaultDate ?? new Date())

  const [bookingDate, setBookingDate] = useState(today)
  const [appointmentDate, setAppointmentDate] = useState(defaultAppt)
  const [preferredTime, setPreferredTime] = useState('')
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [treatment1, setTreatment1] = useState('')
  const [treatment2, setTreatment2] = useState('')
  const [campaignPromo, setCampaignPromo] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [clientStatus, setClientStatus] = useState('')
  const [clinic, setClinic] = useState('')
  const [downPayment, setDownPayment] = useState('0')
  const [staffName, setStaffName] = useState('')
  const [showStatus, setShowStatus] = useState('pending')
  const [branchId, setBranchId] = useState(forcedBranchId ?? '')
  const [leadSource, setLeadSource] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setBookingDate(today)
    setAppointmentDate(toDateKey(defaultDate ?? new Date()))
    setPreferredTime('')
    setFullName('')
    setMobile('')
    setEmail('')
    setTreatment1('')
    setTreatment2('')
    setCampaignPromo('')
    setPromoCode('')
    setClientStatus('')
    setClinic('')
    setDownPayment('0')
    setStaffName('')
    setShowStatus('pending')
    setBranchId(forcedBranchId ?? '')
    setLeadSource('')
    setNotes('')
    setError('')
  }, [open, defaultDate, today, forcedBranchId])

  if (!open) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!fullName.trim()) {
      setError('Full name is required')
      return
    }
    if (!clientStatus) {
      setError('Client status is required')
      return
    }
    if (!branchId) {
      setError('Branch is required')
      return
    }
    if (!appointmentDate) {
      setError('Date of appointment is required')
      return
    }

    setSaving(true)
    try {
      await createAppointment({
        clientName: fullName.trim(),
        clientPhone: mobile.trim() || undefined,
        clientEmail: email.trim() || undefined,
        branchId,
        treatmentName: treatment1.trim() || 'Consultation',
        treatmentName2: treatment2.trim() || undefined,
        staffName: staffName.trim() || undefined,
        date: appointmentDate,
        bookingDate: bookingDate || today,
        timeLabel: preferredTime || '09:00 AM',
        notes: notes.trim() || undefined,
        status: showStatusToAppointment(showStatus),
        clientStatus,
        clinic: clinic.trim() || undefined,
        campaignPromo: campaignPromo.trim() || undefined,
        promoCode: promoCode.trim() || undefined,
        downPayment: Number(downPayment) || 0,
        leadSource: leadSource || undefined,
      })
      await onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save schedule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-emerald-950/45"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[14px] bg-white shadow-xl">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-[#0f172a]">Add Client Schedule</h3>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={fieldLabel}>Date of Booking</span>
                <input
                  type="date"
                  className={fieldControl}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>Date of Appointment</span>
                <input
                  type="date"
                  className={fieldControl}
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className={fieldLabel}>Preferred Time</span>
                <input
                  type="time"
                  className={fieldControl}
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>
                  Full Name <span className="text-red-500">*</span>
                </span>
                <input
                  className={fieldControl}
                  placeholder="Enter patient's full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className={fieldLabel}>Mobile Number</span>
                <input
                  className={fieldControl}
                  placeholder="e.g. 09123456789"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>Email</span>
                <input
                  type="email"
                  className={fieldControl}
                  placeholder="e.g. client@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="block">
                <span className={fieldLabel}>Service Treatment</span>
                <input
                  className={fieldControl}
                  placeholder="Primary service / treatment"
                  value={treatment1}
                  onChange={(e) => setTreatment1(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>Service Treatment 2</span>
                <input
                  className={fieldControl}
                  placeholder="Secondary service / treatment"
                  value={treatment2}
                  onChange={(e) => setTreatment2(e.target.value)}
                />
              </label>

              <label className="block">
                <span className={fieldLabel}>Campaign Promo</span>
                <input
                  className={fieldControl}
                  placeholder="Campaign / ad name"
                  value={campaignPromo}
                  onChange={(e) => setCampaignPromo(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>Promo Code</span>
                <input
                  className={fieldControl}
                  placeholder="Code (e.g. 10OFF)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
              </label>

              <label className="block">
                <span className={fieldLabel}>
                  Client Status <span className="text-red-500">*</span>
                </span>
                <select
                  className={cn(fieldControl, !clientStatus && 'text-slate-ui')}
                  value={clientStatus}
                  onChange={(e) => setClientStatus(e.target.value)}
                  required
                >
                  <option value="">Select Status</option>
                  {CLIENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={fieldLabel}>Clinic</span>
                <input
                  className={fieldControl}
                  placeholder="Branch location / Room"
                  value={clinic}
                  onChange={(e) => setClinic(e.target.value)}
                />
              </label>

              <label className="block">
                <span className={fieldLabel}>Down Payment</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-ui">
                    ₱
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={cn(fieldControl, 'pl-7')}
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                  />
                </div>
              </label>
              <label className="block">
                <span className={fieldLabel}>Staff</span>
                <input
                  className={fieldControl}
                  placeholder="Enter staff name"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                />
              </label>

              <label className="block">
                <span className={fieldLabel}>Show / No Show Status</span>
                <select
                  className={fieldControl}
                  value={showStatus}
                  onChange={(e) => setShowStatus(e.target.value)}
                >
                  {SHOW_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={fieldLabel}>
                  Branch <span className="text-red-500">*</span>
                </span>
                <select
                  className={cn(fieldControl, !branchId && 'text-slate-ui')}
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  required
                  disabled={Boolean(forcedBranchId)}
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className={fieldLabel}>Lead Source / Channel</span>
                <select
                  className={cn(fieldControl, !leadSource && 'text-slate-ui')}
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value)}
                >
                  <option value="">Select Channel</option>
                  {LEAD_CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className={fieldLabel}>Notes</span>
                <textarea
                  className="min-h-[96px] w-full resize-y rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
                  placeholder="Add any additional notes…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </div>

            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Close
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Schedule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
