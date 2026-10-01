import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { useBranch } from '@/contexts/BranchContext'
import { createAppointment, toDateKey } from '@/services/appointmentService'
import { getBranches } from '@/services/branchService'
import { getClients, saveClient } from '@/services/clientService'
import { recordSaleFromBooking } from '@/services/salesService'
import {
  getActiveDoctorsForBooking,
  getActiveStaffForBooking,
} from '@/services/staffDirectoryService'
import type { Client, PaymentMethod } from '@/types'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'

export type CheckoutCartLine = {
  id: string
  name: string
  unitPrice: number
  quantity: number
  kind: string
}

export type BookingPaymentType = 'Full Payment' | 'Installment' | 'Split Payment'

export type BookingPaymentMethodChoice =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'qr_ph'
  | 'owners_account'

const LEAD_SOURCES = [
  'Walk-in',
  'Facebook',
  'Instagram',
  'Referral',
  'Google',
  'TikTok',
  'Viber',
  'Other',
] as const

const PAYMENT_TYPES: BookingPaymentType[] = ['Full Payment', 'Installment', 'Split Payment']

const PAYMENT_METHODS: { value: BookingPaymentMethodChoice; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'qr_ph', label: 'QR PH' },
  { value: 'owners_account', label: 'Owners Account' },
]

const fieldLabel = 'mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-ui'
const fieldControl =
  'h-10 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15'

function timeLabelFromDate(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function mapPaymentMethod(choice: BookingPaymentMethodChoice): PaymentMethod {
  return choice
}

const REFERRAL_POINTS = 100

export function BookingCheckoutModal({
  open,
  patient,
  cart,
  total,
  discount,
  invoiceId,
  promoLabel,
  onClose,
  onPlaced,
}: {
  open: boolean
  patient: Client
  cart: CheckoutCartLine[]
  total: number
  discount: number
  invoiceId: string
  promoLabel?: string | null
  onClose: () => void
  onPlaced: () => void
}) {
  const { selectedBranchId, selectedBranch } = useBranch()
  const forcedBranchId = useForcedBranchId()

  /** Checkout clinic: locked branch → header branch → patient preferred branch */
  const branchId =
    forcedBranchId ||
    (selectedBranchId !== 'all' ? selectedBranchId : '') ||
    patient.preferredBranchId ||
    ''
  const branchName =
    selectedBranch?.name ||
    getBranches().find((b) => b.id === branchId)?.name ||
    patient.preferredBranchName ||
    ''

  const staffOptions = useMemo(() => {
    if (!branchId) return []
    return getActiveStaffForBooking(branchId)
  }, [branchId])

  const doctorOptions = useMemo(() => {
    if (!branchId) return []
    return getActiveDoctorsForBooking(branchId)
  }, [branchId])

  const referrers = useMemo(() => {
    let list = getClients().filter((c) => c.id !== patient.id && c.status !== 'inactive')
    if (branchId) {
      list = list.filter(
        (c) =>
          c.preferredBranchId === branchId ||
          (branchName &&
            c.preferredBranchName?.toLowerCase().includes(branchName.toLowerCase().split(',')[0]!.trim())),
      )
    }
    return list
  }, [patient, branchId, branchName])

  const [leadSource, setLeadSource] = useState<string>('Walk-in')
  const [paymentType, setPaymentType] = useState<BookingPaymentType>('Full Payment')
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethodChoice | ''>('')
  const [paymentAmount, setPaymentAmount] = useState(String(total.toFixed(2)))
  const [referrerQuery, setReferrerQuery] = useState('')
  const [referredById, setReferredById] = useState('')
  const [usePoints, setUsePoints] = useState(false)
  const [primaryStaffId, setPrimaryStaffId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLeadSource('Walk-in')
    setPaymentType('Full Payment')
    setPaymentMethod('')
    setPaymentAmount(String(total.toFixed(2)))
    setReferrerQuery('')
    setReferredById('')
    setUsePoints(false)
    setPrimaryStaffId('')
    setDoctorId('')
  }, [open, total, patient.id])

  // Drop invalid staff selection when branch roster changes
  useEffect(() => {
    if (primaryStaffId && !staffOptions.some((s) => s.id === primaryStaffId)) {
      setPrimaryStaffId('')
    }
    if (doctorId && !doctorOptions.some((d) => d.id === doctorId)) {
      setDoctorId('')
    }
  }, [staffOptions, doctorOptions, primaryStaffId, doctorId])

  const referrerMatches = useMemo(() => {
    const q = referrerQuery.trim().toLowerCase()
    if (!q) return referrers.slice(0, 8)
    return referrers
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
          c.code.toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [referrers, referrerQuery])

  const selectedReferrer = referrers.find((c) => c.id === referredById)

  async function handlePlaceOrder(e: FormEvent) {
    e.preventDefault()
    if (!paymentMethod) {
      toast.error('Select a payment method')
      return
    }
    if (!primaryStaffId) {
      toast.error('Select staff for this order')
      return
    }
    if (!cart.length) {
      toast.error('Cart is empty')
      return
    }
    if (!branchId) {
      toast.error('Select a branch first so staff can be assigned')
      return
    }

    const primaryStaff = staffOptions.find((s) => s.id === primaryStaffId)
    if (!primaryStaff) {
      toast.error('Selected staff is not registered to this branch')
      return
    }
    const doctor = doctorOptions.find((d) => d.id === doctorId)
    const start = new Date()
    const amount = Math.max(0, Number(paymentAmount) || total)
    const pointsDiscount = usePoints ? Math.min(patient.rewardPoints ?? 0, amount) : 0
    const paidAmount = Math.max(0, amount - pointsDiscount)
    const createdAt = new Date().toISOString()
    const bookingRef = invoiceId
    const durationMinutes = 60

    const branches = getBranches()
    const resolvedBranch =
      branches.find((b) => b.id === branchId) ||
      branches.find(
        (b) =>
          patient.preferredBranchName &&
          b.name.toLowerCase().includes(patient.preferredBranchName.toLowerCase().split(',')[0]!),
      ) ||
      branches[0]
    if (!resolvedBranch) {
      toast.error('No branch available for this booking')
      return
    }
    const saleBranchId = resolvedBranch.id
    const saleBranchName = resolvedBranch.name

    setSaving(true)
    try {
      const wasFirstVisit = (patient.totalVisits ?? 0) === 0 && !patient.lastSaleId

      for (const line of cart) {
        const lineTotal =
          cart.length === 1
            ? paidAmount
            : Math.round(
                ((line.unitPrice * line.quantity) / Math.max(1, total || 1)) * paidAmount,
              )
        recordSaleFromBooking({
          invoiceNumber: invoiceId,
          clientId: patient.id,
          clientName: patient.fullName,
          branchId: saleBranchId,
          branchName: saleBranchName,
          staffId: primaryStaff.id,
          staffName: primaryStaff.fullName,
          doctorId: doctor?.id,
          doctorName: doctor?.fullName,
          treatmentOrPackage: line.name,
          itemType:
            line.kind === 'product' ? 'product' : line.kind === 'package' ? 'package' : 'service',
          paymentType,
          bookingRef,
          quantity: line.quantity,
          unitRetailPrice: line.unitPrice,
          leadSource,
          isFirstClientSale: wasFirstVisit,
          totalAmount: lineTotal || line.unitPrice * line.quantity,
          paymentMethod: mapPaymentMethod(paymentMethod),
          status: paymentType === 'Full Payment' ? 'paid' : 'pending',
          createdAt,
          referredByClientId: referredById || undefined,
          referredByName: selectedReferrer?.fullName,
        })
      }

      await createAppointment({
        clientId: patient.id,
        clientName: patient.fullName,
        clientEmail: patient.email,
        clientPhone: patient.phone,
        branchId: saleBranchId,
        treatmentId: cart[0]?.id,
        treatmentName: cart.map((c) => c.name).join(', '),
        staffId: primaryStaff.id,
        staffName: primaryStaff.fullName,
        date: toDateKey(start),
        timeLabel: timeLabelFromDate(start),
        durationMinutes,
        status: 'confirmed',
        clientStatus: 'Paid',
        leadSource,
        downPayment: paidAmount,
        notes: [
          doctor ? `Doctor: ${doctor.fullName}` : null,
          selectedReferrer ? `Referred by: ${selectedReferrer.fullName}` : null,
          `Payment: ${paymentType} / ${PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}`,
          discount > 0 ? `Discount: ${formatPesoExact(discount)}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      })

      if (referredById && selectedReferrer && wasFirstVisit) {
        saveClient({
          ...selectedReferrer,
          rewardPoints: (selectedReferrer.rewardPoints ?? 0) + REFERRAL_POINTS,
        })
      }

      if (pointsDiscount > 0) {
        saveClient({
          ...patient,
          rewardPoints: Math.max(0, (patient.rewardPoints ?? 0) - pointsDiscount),
        })
      }

      toast.success(`Order placed for ${patient.fullName}`, {
        description: `${formatPesoExact(paidAmount)} · ${invoiceId}`,
      })
      onPlaced()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not place order')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-[#041c18]/50 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <form
        onSubmit={handlePlaceOrder}
        className="relative z-10 flex max-h-[min(92dvh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-[16px] bg-[#eef2f7] shadow-2xl"
      >
        {/* Sticky header — always visible */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-semibold tracking-tight text-[#073D2C] sm:text-xl">
              {patient.fullName}
            </h2>
            <p className="mt-0.5 text-xs text-slate-ui sm:text-sm">
              Total Service: {cart.length} · Due {formatPesoExact(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-ivory-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Only this middle area scrolls */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {/* Order Summary */}
          <section className="rounded-[12px] border border-border bg-white p-3 sm:p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#073D2C]">Order Summary</h3>
              <Badge variant="neutral">Ready to Pay</Badge>
            </div>
            <div className="hidden grid-cols-[1fr_auto] gap-2 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-ui sm:grid">
              <span>Service Name</span>
              <span>Price</span>
            </div>
            <ul className="mt-1.5 space-y-2">
              {cart.map((line) => (
                <li
                  key={line.id}
                  className="grid gap-2 rounded-[10px] border border-border/70 bg-ivory-100/40 p-2.5 sm:grid-cols-[1fr_auto] sm:items-center sm:border-0 sm:bg-transparent sm:p-0"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-ui sm:hidden">
                      Service Name
                    </p>
                    <p className="text-sm font-semibold uppercase text-[#073D2C]">{line.name}</p>
                    <p className="text-xs text-slate-ui">
                      Qty {line.quantity} · {line.kind}
                    </p>
                  </div>
                  <div className="sm:min-w-[8.5rem]">
                    <p className="text-[10px] font-bold uppercase text-slate-ui sm:hidden">Price</p>
                    <input
                      readOnly
                      className={fieldControl}
                      value={formatPesoExact(line.unitPrice * line.quantity)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Payment Details */}
          <section className="rounded-[12px] border border-border bg-white p-3 sm:p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#073D2C]">Payment Details</h3>
              <Badge variant="success">Secure</Badge>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="block">
                <span className={fieldLabel}>Lead Source</span>
                <select
                  className={fieldControl}
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value)}
                >
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={fieldLabel}>Payment Type</span>
                <select
                  className={fieldControl}
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as BookingPaymentType)}
                >
                  {PAYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={fieldLabel}>Payment Method</span>
                <select
                  className={cn(fieldControl, !paymentMethod && 'text-slate-ui/70')}
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as BookingPaymentMethodChoice | '')
                  }
                  required
                >
                  <option value="">Select Payment Method</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={fieldLabel}>Payment Amount</span>
                <input
                  className={fieldControl}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>
          </section>

          {/* Referral & Rewards */}
          <section className="rounded-[12px] border border-border bg-white p-3 sm:p-3.5">
            <h3 className="mb-2 text-sm font-semibold text-[#073D2C]">Referral &amp; Rewards</h3>
            <label className="block">
              <span className={fieldLabel}>Referred By (Optional)</span>
              <input
                className={fieldControl}
                placeholder="Search for referrer..."
                value={selectedReferrer ? selectedReferrer.fullName : referrerQuery}
                onChange={(e) => {
                  setReferredById('')
                  setReferrerQuery(e.target.value)
                }}
              />
            </label>
            {!referredById && referrerQuery.trim() ? (
              <ul className="mt-2 max-h-28 overflow-y-auto rounded-[10px] border border-border">
                {referrerMatches.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-slate-ui">No customers found.</li>
                ) : (
                  referrerMatches.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-emerald-50"
                        onClick={() => {
                          setReferredById(c.id)
                          setReferrerQuery(c.fullName)
                        }}
                      >
                        <span className="font-medium text-[#073D2C]">{c.fullName}</span>
                        <span className="text-xs text-slate-ui">
                          {(c.rewardPoints ?? 0).toLocaleString()} pts
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
            {referredById ? (
              <button
                type="button"
                className="mt-1 text-xs font-semibold text-emerald-800"
                onClick={() => {
                  setReferredById('')
                  setReferrerQuery('')
                }}
              >
                Clear referrer
              </button>
            ) : null}
            <p className="mt-1.5 text-xs text-slate-ui">
              Referrer will earn {REFERRAL_POINTS} points for first-time patient referral.
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm text-[#073D2C]">
              <input
                type="checkbox"
                checked={usePoints}
                onChange={(e) => setUsePoints(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Use available points for payment
              {(patient.rewardPoints ?? 0) > 0 ? (
                <span className="text-xs text-slate-ui">
                  ({(patient.rewardPoints ?? 0).toLocaleString()} pts)
                </span>
              ) : null}
            </label>
          </section>

          {/* Booking Details */}
          <section className="rounded-[12px] border border-border bg-white p-3 sm:p-3.5">
            <h3 className="mb-2 text-sm font-semibold text-[#073D2C]">Booking Details</h3>
            <div className="grid gap-2.5">
              <label className="block">
                <span className={fieldLabel}>Staff</span>
                <select
                  className={cn(fieldControl, !primaryStaffId && 'text-slate-ui/70')}
                  value={primaryStaffId}
                  onChange={(e) => setPrimaryStaffId(e.target.value)}
                  required
                  disabled={!branchId || staffOptions.length === 0}
                >
                  <option value="">
                    {!branchId
                      ? 'Select a branch first'
                      : staffOptions.length === 0
                        ? 'No staff tagged to this branch'
                        : 'Select Staff'}
                  </option>
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
                {branchName ? (
                  <p className="mt-1 text-[11px] text-slate-ui">
                    Showing staff registered to {branchName} only
                  </p>
                ) : null}
              </label>
              <label className="block">
                <span className={fieldLabel}>Doctor (Optional)</span>
                <select
                  className={cn(fieldControl, !doctorId && 'text-slate-ui/70')}
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  disabled={!branchId}
                >
                  <option value="">Select Doctor (optional)</option>
                  {doctorOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        </div>

        {/* Sticky footer — Place Order always on screen */}
        <div className="shrink-0 space-y-2 border-t border-border bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3 rounded-[10px] bg-sky-50 px-3 py-2 text-sm">
            <span className="text-sky-900">
              {promoLabel ? `Promo: ${promoLabel}` : 'No Selected Promo'}
            </span>
            <span className="font-semibold text-[#073D2C]">{formatPesoExact(total)}</span>
          </div>
          <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={saving}>
            {saving ? 'Placing Order…' : `Place Order · ${formatPesoExact(total)}`}
          </Button>
        </div>
      </form>
    </div>
  )
}
