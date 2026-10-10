import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { toDateKey } from '@/services/appointmentService'
import { resolveClinicBranchId } from '@/services/branchService'
import {
  getInstallmentBalances,
  type ClientInstallmentBalance,
} from '@/services/clientSalesProfileService'
import {
  recordBookingCheckout,
  ensureClientRemoteSales,
  getSales,
  preloadSalesData,
  subscribeSalesData,
} from '@/services/salesService'
import type { Client, PaymentMethod } from '@/types'
import { formatPeso, formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'
import { isUuid } from '@/utils/uuid'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'qr_ph', label: 'QR PH' },
  { value: 'owners_account', label: 'Owners Account' },
]

const fieldLabel = 'mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-ui'
const fieldControl =
  'h-10 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15'

function makeBalanceInvoiceId() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const seq = String(Math.floor(Math.random() * 9000) + 1000)
  return `INV-BAL-${y}${m}${d}-${seq}`
}

function dateFromEncodeKey(dateKey: string): Date {
  const now = new Date()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim())
  if (!match) return now
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (!y || !m || !d) return now
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds())
}

export function PatientInstallmentsModal({
  open,
  patient,
  onClose,
}: {
  open: boolean
  patient: Client
  onClose: () => void
}) {
  const { user } = useAuth()
  const [salesTick, setSalesTick] = useState(0)
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState<ClientInstallmentBalance | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [encodeDate, setEncodeDate] = useState(() => toDateKey(new Date()))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setPaying(null)
    void (async () => {
      try {
        await ensureClientRemoteSales(patient.id, patient.fullName)
        void preloadSalesData()
      } catch {
        /* ignore */
      } finally {
        setSalesTick((n) => n + 1)
        setLoading(false)
      }
    })()
    const unsub = subscribeSalesData(() => setSalesTick((n) => n + 1))
    return unsub
  }, [open, patient.id])

  const displayRows = useMemo(() => {
    void salesTick
    return getInstallmentBalances(patient.id, getSales(), patient.fullName)
  }, [patient.id, patient.fullName, salesTick])

  function openPay(row: ClientInstallmentBalance) {
    if (row.remainingAmount <= 0) {
      toast.message('This installment is already fully paid')
      return
    }
    setPaying(row)
    setPayAmount(String(row.remainingAmount.toFixed(2)))
    setPaymentMethod('')
    setEncodeDate(toDateKey(new Date()))
  }

  async function submitPayBalance(e: FormEvent) {
    e.preventDefault()
    if (!paying) return
    if (!paymentMethod) {
      toast.error('Select a payment method')
      return
    }
    const amount = Math.round((Number(payAmount) || 0) * 100) / 100
    if (amount <= 0) {
      toast.error('Enter a payment amount')
      return
    }
    if (amount > paying.remainingAmount + 0.05) {
      toast.error(`Amount cannot exceed remaining ${formatPesoExact(paying.remainingAmount)}`)
      return
    }

    const branchId =
      resolveClinicBranchId(paying.branchId) ||
      resolveClinicBranchId(paying.branchName) ||
      resolveClinicBranchId(patient.preferredBranchId) ||
      ''
    if (!branchId || !isUuid(branchId)) {
      toast.error('This installment is missing a clinic branch — cannot record payment')
      return
    }

    const createdAt = dateFromEncodeKey(encodeDate).toISOString()
    const invoiceNumber = makeBalanceInvoiceId()

    setSaving(true)
    try {
      let clientId = paying.clientId || patient.id
      if (!isUuid(clientId)) {
        const { ensureBookingClient } = await import('@/services/appointmentService')
        const remote = await ensureBookingClient({
          clientId: patient.id,
          fullName: patient.fullName,
          email: patient.email,
          phone: patient.phone,
          branchId,
        })
        clientId = remote.id
      }

      await recordBookingCheckout(
        [
          {
            invoiceNumber,
            clientId,
            clientName: patient.fullName,
            branchId,
            branchName: paying.branchName || patient.preferredBranchName || '',
            staffId: paying.staffId || user?.id,
            staffName: paying.staffName || user?.fullName || 'Staff',
            treatmentOrPackage: paying.itemName,
            itemType: paying.itemType || 'service',
            paymentType: 'Installment Payment',
            bookingRef: paying.groupRef,
            quantity: 1,
            unitRetailPrice: amount,
            totalAmount: amount,
            paymentMethod,
            status: 'paid',
            createdAt,
          },
        ],
        { paymentSplits: [{ paymentMethod, paymentAmount: amount }] },
      )

      toast.success(`Balance payment recorded · ${formatPesoExact(amount)}`, {
        description: `${paying.itemName} · remaining will update on the profile`,
      })
      setPaying(null)
      setSalesTick((n) => n + 1)
      void preloadSalesData().then(() => setSalesTick((n) => n + 1))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record balance payment')
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
      <div className="relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-[14px] bg-white shadow-2xl">
        <div className="shrink-0 border-b border-[#e5e7eb] px-6 py-5">
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-[#1f2937]">
            Patient Installments
          </h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            View installment plans and pay remaining balances.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
          {paying ? (
            <form
              onSubmit={(e) => void submitPayBalance(e)}
              className="space-y-4 rounded-[12px] border border-border bg-[#f8fafc] p-4"
            >
              <div>
                <p className="text-sm font-semibold text-[#073D2C]">{paying.itemName}</p>
                <p className="mt-0.5 text-xs text-slate-ui">
                  Remaining {formatPesoExact(paying.remainingAmount)} · Down payment{' '}
                  {formatPesoExact(paying.paidAmount)} of {formatPesoExact(paying.totalAmount)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={fieldLabel}>Payment Amount</span>
                  <input
                    className={fieldControl}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    inputMode="decimal"
                    required
                  />
                </label>
                <label className="block">
                  <span className={fieldLabel}>Payment Method</span>
                  <select
                    className={cn(fieldControl, !paymentMethod && 'text-slate-ui/70')}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | '')}
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
                <label className="block sm:col-span-2">
                  <span className={fieldLabel}>Date of Encode</span>
                  <input
                    type="date"
                    className={fieldControl}
                    value={encodeDate}
                    max={toDateKey(new Date())}
                    onChange={(e) => setEncodeDate(e.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => setPaying(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-[#073D2C] hover:bg-[#0a4f3a]">
                  {saving ? 'Saving…' : `Confirm Pay · ${formatPesoExact(Number(payAmount) || 0)}`}
                </Button>
              </div>
            </form>
          ) : (
            <div className="overflow-x-auto rounded-[10px] border border-[#e5e7eb]">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#f3f4f6] text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
                    <th className="px-4 py-3 font-semibold">Service / Package</th>
                    <th className="px-4 py-3 font-semibold">Total Amount</th>
                    <th className="px-4 py-3 font-semibold">Down Payment</th>
                    <th className="px-4 py-3 font-semibold">Remaining Balance</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && displayRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-[#6b7280]">
                        Loading installments…
                      </td>
                    </tr>
                  ) : displayRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-[#6b7280]">
                        No installments found
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((row) => (
                      <tr key={row.id} className="border-t border-[#e5e7eb]">
                        <td className="px-4 py-4 align-middle font-medium text-[#111827]">
                          {row.itemName}
                        </td>
                        <td className="px-4 py-4 align-middle text-[#111827]">
                          {formatPeso(row.totalAmount)}
                        </td>
                        <td className="px-4 py-4 align-middle text-[#111827]">
                          {formatPeso(row.paidAmount)}
                        </td>
                        <td className="px-4 py-4 align-middle text-[#111827]">
                          {formatPeso(row.remainingAmount)}
                        </td>
                        <td className="px-4 py-4 align-middle">
                          {row.remainingAmount > 0 ? (
                            <Button
                              type="button"
                              size="sm"
                              className="h-9 whitespace-nowrap bg-[#073D2C] px-4 shadow-sm hover:bg-[#0a4f3a]"
                              onClick={() => openPay(row)}
                            >
                              Pay Balance
                            </Button>
                          ) : (
                            <span className="text-sm font-medium text-emerald-700">Paid</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end border-t border-[#e5e7eb] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#9ca3af] px-5 text-sm font-medium text-white hover:bg-[#6b7280]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
