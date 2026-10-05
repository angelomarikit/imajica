import { useEffect, useMemo, useState } from 'react'
import { Wallet } from 'lucide-react'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Card } from '@/components/ui/Card'
import { PayslipDocument } from '@/components/payroll/PayslipDocument'
import { useAuth } from '@/contexts/AuthContext'
import {
  listPayslipsForEmployee,
  markPayslipViewed,
  preloadPayslips,
  subscribePayslips,
  type EmployeePayslip,
} from '@/services/payslipService'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'

/** Employee-facing salary & payslip inbox — only slips HR has sent. */
export function MySalaryPage() {
  const { user } = useAuth()
  const [tick, setTick] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    void preloadPayslips().then(() => setTick((n) => n + 1))
    return subscribePayslips(() => setTick((n) => n + 1))
  }, [])

  const slips = useMemo(() => {
    void tick
    return listPayslipsForEmployee({
      userId: user?.id,
      email: user?.email,
    })
  }, [tick, user?.id, user?.email])

  const selected: EmployeePayslip | null =
    slips.find((s) => s.id === selectedId) ?? slips[0] ?? null

  useEffect(() => {
    if (selected && selected.status === 'sent') {
      markPayslipViewed(selected.id)
    }
  }, [selected?.id, selected?.status])

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="My Salary"
        description="Transparent payslips released by HR — every earning, incentive, and deduction with its computation."
        stat={{
          value: String(slips.length),
          label: 'Payslips',
        }}
      />

      {slips.length === 0 ? (
        <Card className="p-8 text-center sm:p-10">
          <Wallet className="mx-auto h-10 w-10 text-[#C5A059]" />
          <p className="mt-3 text-sm font-medium text-[#0A2E26]">No payslips yet</p>
          <p className="mt-1 text-sm text-slate-ui">
            When HR processes and sends your salary for a period, it will appear here with a full
            breakdown.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-[#073D2C]">Your payslips</p>
              <p className="text-[11px] text-slate-ui">Select a period to review</p>
            </div>
            <ul className="max-h-[32rem] divide-y divide-border/70 overflow-y-auto">
              {slips.map((s) => {
                const active = selected?.id === s.id
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={cn(
                        'w-full px-4 py-3 text-left transition',
                        active ? 'bg-emerald-50' : 'hover:bg-ivory-100',
                      )}
                    >
                      <p className="text-sm font-semibold text-[#0A2E26]">{s.periodLabel}</p>
                      <p className="text-xs text-slate-ui">{s.branchName}</p>
                      <p className="mt-1 font-metric text-base font-semibold text-emerald-900">
                        {formatPeso(s.netPay)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-ui">
                        From {s.sentByName}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>

          {selected ? (
            <PayslipDocument
              payslip={selected.snapshot}
              sentMeta={{ sentByName: selected.sentByName, sentAt: selected.sentAt }}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
