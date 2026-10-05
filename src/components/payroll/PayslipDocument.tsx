import logo from '@/assets/logo-imajica.jpg'
import { BRAND } from '@/constants/brand'
import { Button } from '@/components/ui/Button'
import type { BuiltPayslip } from '@/services/payslipCompute'
import { patchPayslipLine } from '@/services/payslipCompute'
import { formatPeso, formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'
import { Send, Printer } from 'lucide-react'

export function PayslipDocument({
  payslip,
  sentMeta,
  onSend,
  sending,
  showSend,
  editable,
  onChange,
  className,
}: {
  payslip: BuiltPayslip
  sentMeta?: { sentByName: string; sentAt: string }
  onSend?: () => void
  sending?: boolean
  showSend?: boolean
  /** HR can adjust line amounts / computation notes before send */
  editable?: boolean
  onChange?: (next: BuiltPayslip) => void
  className?: string
}) {
  const earnings = payslip.lines.filter((l) => l.kind === 'earning' || l.kind === 'incentive')
  const deductions = payslip.lines.filter((l) => l.kind === 'deduction')
  const info = payslip.lines.filter((l) => l.kind === 'info')

  function updateAmount(lineId: string, raw: string) {
    if (!onChange) return
    const n = Number(raw.replace(/,/g, ''))
    if (Number.isNaN(n)) return
    onChange(patchPayslipLine(payslip, lineId, { amount: n }))
  }

  function updateComputation(lineId: string, computation: string) {
    if (!onChange) return
    onChange(patchPayslipLine(payslip, lineId, { computation }))
  }

  function handlePrint() {
    // Ensure only one payslip is targeted if multiple exist in DOM
    document.body.classList.add('printing-payslip')
    const done = () => {
      document.body.classList.remove('printing-payslip')
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.setTimeout(() => window.print(), 50)
  }

  return (
    <div
      className={cn(
        'payslip-print-root overflow-hidden rounded-[18px] border border-[#C5A059]/35 bg-gradient-to-b from-[#FFFDF8] via-white to-[#F7F1E6] shadow-[0_16px_40px_rgba(10,46,38,0.12)]',
        className,
      )}
    >
      <div className="payslip-print-header relative border-b border-[#C5A059]/25 bg-gradient-to-r from-[#0A2E26] via-[#145c45] to-[#0A2E26] px-5 py-5 text-white sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt={BRAND.name}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-[#C5A059]/80"
            />
            <div>
              <p className="font-brand text-lg tracking-wide text-[#E8C547]">{BRAND.shortName.toUpperCase()}</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">
                Medical Aesthetics
              </p>
              <p className="mt-1 text-xs text-white/65">{BRAND.tagline}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C5A059]">
              Official Payslip
            </p>
            <p className="mt-1 text-sm font-medium text-white">{payslip.periodLabel}</p>
            {sentMeta ? (
              <p className="mt-1 text-[11px] text-white/60">
                Sent by {sentMeta.sentByName} ·{' '}
                {new Date(sentMeta.sentAt).toLocaleString('en-PH')}
              </p>
            ) : editable ? (
              <p className="mt-1 text-[11px] text-[#E8C547]/90 print:hidden">
                Editing — adjust amounts before send
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-white/60 print:hidden">
                Preview — not yet released to employee
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="payslip-print-body px-5 py-5 sm:px-7 sm:py-6">
        <div className="grid gap-4 rounded-[14px] border border-[#e8dfcf] bg-white/80 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8a7a62]">
              Employee
            </p>
            <p className="mt-1 text-lg font-semibold text-[#0A2E26]">{payslip.employeeName}</p>
            <p className="text-sm text-slate-ui">{payslip.jobTitle}</p>
            <p className="text-xs text-slate-ui">{payslip.email}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8a7a62]">
              Branch
            </p>
            <p className="mt-1 text-sm font-semibold text-[#0A2E26]">{payslip.branchName}</p>
            <p className="text-xs text-slate-ui">
              Present {payslip.base.daysPresent} · Absent {payslip.base.daysAbsent} · Late{' '}
              {payslip.base.lateMinutes} min
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b5420]">
            Earnings & incentives
          </p>
          <div className="overflow-hidden rounded-[12px] border border-[#e8dfcf]">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F7F1E6] text-[10px] uppercase tracking-wide text-[#6b5420]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Item</th>
                  <th className="px-3 py-2 text-left font-semibold">Computation</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((line) => (
                  <tr key={line.id} className="border-t border-[#eee5d6]">
                    <td className="px-3 py-2.5 font-medium text-[#0A2E26]">{line.label}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-ui">
                      {editable && onChange ? (
                        <input
                          type="text"
                          value={line.computation}
                          onChange={(e) => updateComputation(line.id, e.target.value)}
                          className="w-full min-w-[8rem] rounded-md border border-[#e8dfcf] bg-white px-2 py-1 text-xs text-slate-ui outline-none focus:border-[#C5A059]"
                        />
                      ) : (
                        line.computation
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-metric font-semibold text-[#0A2E26]">
                      {editable && onChange ? (
                        <input
                          type="number"
                          step="0.01"
                          value={line.amount}
                          onChange={(e) => updateAmount(line.id, e.target.value)}
                          className="ml-auto w-[7.5rem] rounded-md border border-[#e8dfcf] bg-white px-2 py-1 text-right text-sm outline-none focus:border-[#C5A059]"
                        />
                      ) : (
                        formatPesoExact(line.amount)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {info.length ? (
          <div className="mt-3 space-y-1.5">
            {info.map((line) => (
              <div
                key={line.id}
                className="payslip-print-info rounded-[10px] border border-dashed border-[#C5A059]/40 bg-[#FFFDF8] px-3 py-2 text-xs text-[#6b5420]"
              >
                <span className="font-semibold">{line.label}: </span>
                {editable && onChange ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 print:hidden">
                    <input
                      type="text"
                      value={line.computation}
                      onChange={(e) => updateComputation(line.id, e.target.value)}
                      className="min-w-[12rem] flex-1 rounded-md border border-[#e8dfcf] bg-white px-2 py-1 text-xs outline-none focus:border-[#C5A059]"
                    />
                    <label className="flex items-center gap-1 text-[10px] uppercase tracking-wide">
                      Award ₱
                      <input
                        type="number"
                        step="0.01"
                        value={line.amount}
                        onChange={(e) => updateAmount(line.id, e.target.value)}
                        className="w-24 rounded-md border border-[#e8dfcf] bg-white px-2 py-1 text-right text-xs outline-none focus:border-[#C5A059]"
                      />
                    </label>
                  </div>
                ) : (
                  line.computation
                )}
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a4f30]">
            Deductions
          </p>
          <div className="overflow-hidden rounded-[12px] border border-[#f0d8c8]">
            <table className="min-w-full text-sm">
              <thead className="bg-[#FFF4EB] text-[10px] uppercase tracking-wide text-[#8a4f30]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Item</th>
                  <th className="px-3 py-2 text-left font-semibold">Computation</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {deductions.map((line) => (
                  <tr key={line.id} className="border-t border-[#f3e0d2]">
                    <td className="px-3 py-2.5 font-medium text-[#3d2416]">{line.label}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-ui">
                      {editable && onChange ? (
                        <input
                          type="text"
                          value={line.computation}
                          onChange={(e) => updateComputation(line.id, e.target.value)}
                          className="w-full min-w-[8rem] rounded-md border border-[#f0d8c8] bg-white px-2 py-1 text-xs outline-none focus:border-[#C5A059]"
                        />
                      ) : (
                        line.computation
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-metric font-semibold text-[#9a5535]">
                      {editable && onChange ? (
                        <input
                          type="number"
                          step="0.01"
                          value={line.amount}
                          onChange={(e) => updateAmount(line.id, e.target.value)}
                          className="ml-auto w-[7.5rem] rounded-md border border-[#f0d8c8] bg-white px-2 py-1 text-right text-sm outline-none focus:border-[#C5A059]"
                          title="Enter as negative or positive — stored as deduction"
                        />
                      ) : (
                        formatPesoExact(line.amount)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryTile label="Gross earnings" value={formatPeso(payslip.grossEarnings)} />
          <SummaryTile label="Incentives" value={formatPeso(payslip.totalIncentives)} tone="gold" />
          <SummaryTile
            label="Deductions"
            value={`−${formatPeso(payslip.totalDeductions)}`}
            tone="rose"
          />
        </div>

        <div className="payslip-print-net mt-4 rounded-[14px] bg-gradient-to-br from-[#0A2E26] to-[#145c45] px-5 py-4 text-white shadow-[0_12px_28px_rgba(10,46,38,0.25)]">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C5A059]">
                Net pay
              </p>
              <p className="payslip-print-net-amount mt-1 font-metric text-3xl font-semibold tracking-tight sm:text-4xl">
                {formatPesoExact(payslip.netPay)}
              </p>
              <p className="mt-1 text-xs text-white/65">
                Net = gross + incentives − deductions (transparently itemized above)
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button
                type="button"
                variant="secondary"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              {showSend && onSend ? (
                <Button type="button" variant="gold" disabled={sending} onClick={onSend}>
                  <Send className="h-4 w-4" />
                  {sending ? 'Sending…' : 'Send to employee'}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-ui">
          {BRAND.name} · Confidential payroll document · {BRAND.slogan}
        </p>
      </div>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  tone = 'emerald',
}: {
  label: string
  value: string
  tone?: 'emerald' | 'gold' | 'rose'
}) {
  const tones = {
    emerald: 'border-emerald-100 bg-emerald-50/80 text-emerald-950',
    gold: 'border-[#C5A059]/35 bg-[#FFF8E8] text-[#3d2e0f]',
    rose: 'border-rose-100 bg-rose-50/80 text-rose-950',
  }
  return (
    <div className={cn('rounded-[12px] border px-3.5 py-3', tones[tone])}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 font-metric text-lg font-semibold">{value}</p>
    </div>
  )
}
