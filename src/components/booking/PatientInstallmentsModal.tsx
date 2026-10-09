import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import {
  getInstallmentBalances,
  type ClientInstallmentBalance,
} from '@/services/clientSalesProfileService'
import { getSales, preloadSalesData, subscribeSalesData } from '@/services/salesService'
import type { Client } from '@/types'
import { formatPeso } from '@/utils/currency'

export function PatientInstallmentsModal({
  open,
  patient,
  onClose,
}: {
  open: boolean
  patient: Client
  onClose: () => void
}) {
  const [salesTick, setSalesTick] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void preloadSalesData()
      .catch(() => undefined)
      .finally(() => {
        setSalesTick((n) => n + 1)
        setLoading(false)
      })
    const unsub = subscribeSalesData(() => setSalesTick((n) => n + 1))
    return unsub
  }, [open, patient.id])

  const displayRows = useMemo(() => {
    void salesTick
    // Same installment balances as Client Profile → Services & Products
    return getInstallmentBalances(patient.id, getSales(), patient.fullName)
  }, [patient.id, patient.fullName, salesTick])

  function handlePay(row: ClientInstallmentBalance) {
    if (row.remainingAmount <= 0) {
      toast.message('This installment is already fully paid')
      return
    }
    toast.message(`Pay balance: ${formatPeso(row.remainingAmount)}`, {
      description: `${row.itemName} · use Check Out with Payment Type “Installment” to record the next payment.`,
    })
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
      <div className="relative z-10 flex max-h-[min(90dvh,640px)] w-full max-w-3xl flex-col overflow-hidden rounded-[14px] bg-white shadow-2xl">
        <div className="shrink-0 border-b border-[#e5e7eb] px-6 py-5">
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-[#1f2937]">
            Patient Installments
          </h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            View installment plans and pay remaining balances.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
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
                            onClick={() => handlePay(row)}
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
        </div>

        <div className="flex shrink-0 justify-end border-t border-[#e5e7eb] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#9ca3af] px-5 text-sm font-medium text-white hover:bg-[#6b7280]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
