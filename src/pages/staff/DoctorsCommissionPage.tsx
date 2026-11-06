import { useEffect, useMemo, useState } from 'react'
import { Stethoscope } from 'lucide-react'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import {
  HENDRA_DOCTOR_FEE_RATE,
  isHendraCommissionAccount,
  listHendraDoctorCommission,
  preloadSalesData,
  subscribeSalesData,
} from '@/services/salesService'
import { formatPesoExact } from '@/utils/currency'

const inputClass =
  'rounded-[6px] border border-border bg-white px-2.5 py-1.5 text-sm text-[#073D2C] outline-none focus:border-[#073D2C]'

function manilaDate(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function defaultMonthRange() {
  const to = manilaDate()
  return { from: `${to.slice(0, 8)}01`, to }
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function DoctorsCommissionPage() {
  const { user } = useAuth()
  const allowed = isHendraCommissionAccount({
    email: user?.email,
    fullName: user?.fullName,
  })
  const initial = defaultMonthRange()
  const [fromDraft, setFromDraft] = useState(initial.from)
  const [toDraft, setToDraft] = useState(initial.to)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [tick, setTick] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void preloadSalesData()
      .then(() => {
        if (!cancelled) setTick((n) => n + 1)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    const unsubscribe = subscribeSalesData(() => {
      if (!cancelled) setTick((n) => n + 1)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const report = useMemo(() => {
    void tick
    return listHendraDoctorCommission({ from, to })
  }, [from, to, tick])

  const paid = useMemo(
    () => report.rows.filter((row) => (row.status || '').toLowerCase() === 'paid'),
    [report.rows],
  )
  const paidService = paid.reduce((sum, row) => sum + row.serviceTotal, 0)
  const paidCommission = paid.reduce((sum, row) => sum + row.doctorFeeAmount, 0)
  const percent = Math.round(HENDRA_DOCTOR_FEE_RATE * 100)

  if (!allowed) {
    return (
      <div className="space-y-5">
        <AdminPageBanner
          title="Doctors Commission"
          description="This page is on Hendra Sandigan's account. Her 5% doctor's fee is listed here and added to the 16–end payroll."
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Doctors Commission"
        description={`When your name is typed as the doctor, you earn ${percent}% of that procedure. Other doctors stay at 20%. This ${percent}% is added to your commission on the 16–30/31 payroll.`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">Procedures</p>
          <p className="mt-1 text-2xl font-semibold text-[#073D2C]">{report.rows.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">Service total</p>
          <p className="mt-1 text-2xl font-semibold text-[#073D2C]">{formatPesoExact(paidService)}</p>
          <p className="mt-1 text-xs text-slate-ui">Paid orders in this range</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">
            Your {percent}% commission
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#073D2C]">{formatPesoExact(paidCommission)}</p>
          <p className="mt-1 text-xs text-slate-ui">Paid with salary on the 16–end cut</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs text-slate-ui">
            From
            <input
              type="date"
              className={`${inputClass} mt-1 block`}
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
            />
          </label>
          <label className="block text-xs text-slate-ui">
            To
            <input
              type="date"
              className={`${inputClass} mt-1 block`}
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded-[6px] bg-[#073D2C] px-3 py-1.5 text-sm font-medium text-white"
            onClick={() => {
              setFrom(fromDraft)
              setTo(toDraft)
            }}
          >
            Filter
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] font-bold uppercase tracking-wide text-slate-ui">
                <th className="px-2 py-2.5">Date</th>
                <th className="px-2 py-2.5">Invoice</th>
                <th className="px-2 py-2.5">Client</th>
                <th className="px-2 py-2.5">Branch</th>
                <th className="px-2 py-2.5 text-right">Service total</th>
                <th className="px-2 py-2.5 text-right">Your rate</th>
                <th className="px-2 py-2.5 text-right">Your commission</th>
                <th className="px-2 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-2 py-10 text-center text-slate-ui">
                    Loading doctor’s procedures…
                  </td>
                </tr>
              ) : report.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-10 text-center text-slate-ui">
                    <Stethoscope className="mx-auto mb-2 h-5 w-5 text-[#C5A059]" />
                    No procedures with your name as the doctor in this range.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={row.saleId} className="border-b border-border/70">
                    <td className="px-2 py-2.5 whitespace-nowrap text-[#073D2C]">
                      {formatShortDate(row.createdAt)}
                    </td>
                    <td className="px-2 py-2.5 font-mono text-xs text-[#073D2C]">{row.invoiceNumber}</td>
                    <td className="px-2 py-2.5 text-[#073D2C]">{row.clientName}</td>
                    <td className="px-2 py-2.5 text-slate-ui">{row.branchName}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {formatPesoExact(row.serviceTotal)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-medium text-[#073D2C]">{percent}%</td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-amber-800">
                      {formatPesoExact(row.doctorFeeAmount)}
                    </td>
                    <td className="px-2 py-2.5">
                      <Badge variant={(row.status || '').toLowerCase() === 'paid' ? 'success' : 'neutral'}>
                        {(row.status || '').toLowerCase() === 'paid' ? 'Paid' : row.status || '—'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
