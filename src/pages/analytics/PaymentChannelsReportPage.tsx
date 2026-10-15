import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CreditCard, Filter, FileSpreadsheet, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { exportCsv } from '@/services/analyticsService'
import { getBranches } from '@/services/branchService'
import {
  fetchPaymentChannelsReport,
  type PaymentChannelRow,
} from '@/services/paymentChannelsReportService'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'
import {
  HQ_SENTINEL_BRANCH_ID,
  isFranchiseBranchOwner,
  isHqRole,
} from '@/utils/franchiseAccess'

const inputClass =
  'rounded-[6px] border border-border bg-white px-2.5 py-1.5 text-sm text-[#073D2C] outline-none focus:border-[#073D2C]'

/** Manila calendar month: 1st → today (not the Sep 2025 ops-import default). */
function currentMonthRange() {
  const to = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return { from: `${to.slice(0, 8)}01`, to }
}

const CHANNEL_CARD_STYLES: Record<string, string> = {
  cash: 'border-emerald-200/80 bg-gradient-to-br from-[#0A2E26] to-[#073D2C] text-white',
  credit_card: 'border-amber-200/80 bg-gradient-to-br from-[#3d2a12] to-[#5c3d1a] text-[#F7F0E0]',
  debit_card: 'border-sky-200/80 bg-gradient-to-br from-[#0c2f3d] to-[#134e6a] text-[#E8F4F8]',
  qr_ph: 'border-[#C5A059]/50 bg-gradient-to-br from-[#2a2418] to-[#4a3a1f] text-[#F3E6C8]',
  owners_account: 'border-violet-200/60 bg-gradient-to-br from-[#2a1f38] to-[#3d2a55] text-[#F0E8F8]',
  other: 'border-border bg-gradient-to-br from-slate-700 to-slate-800 text-white',
}

export function PaymentChannelsReportPage() {
  const { user } = useAuth()
  const { selectedBranchId, setSelectedBranchId, selectedBranch } = useBranch()
  const forcedBranchId = useForcedBranchId()
  const clinicOnly = isFranchiseBranchOwner(user)
  const hqUser = isHqRole(user?.role)
  const range = currentMonthRange()

  const clinicBranches = useMemo(
    () =>
      getBranches().filter(
        (b) =>
          b.status === 'active' &&
          b.branchType !== 'warehouse' &&
          b.id !== HQ_SENTINEL_BRANCH_ID,
      ),
    [],
  )

  const [fromDraft, setFromDraft] = useState(range.from)
  const [toDraft, setToDraft] = useState(range.to)
  const [from, setFrom] = useState(range.from)
  const [to, setTo] = useState(range.to)
  /** HQ page filter — syncs with header branch selector */
  const [branchDraft, setBranchDraft] = useState(() =>
    forcedBranchId || selectedBranchId || 'all',
  )
  const [branchFilter, setBranchFilter] = useState(() =>
    forcedBranchId || (selectedBranchId !== 'all' ? selectedBranchId : 'all'),
  )
  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState<PaymentChannelRow[]>([])
  const [total, setTotal] = useState(0)
  const [txnCount, setTxnCount] = useState(0)

  // Keep page in sync when HQ changes the header branch dropdown
  useEffect(() => {
    if (forcedBranchId) {
      setBranchDraft(forcedBranchId)
      setBranchFilter(forcedBranchId)
      return
    }
    setBranchDraft(selectedBranchId || 'all')
    setBranchFilter(selectedBranchId || 'all')
  }, [forcedBranchId, selectedBranchId])

  const queryBranchId = forcedBranchId || (branchFilter === 'all' ? undefined : branchFilter)

  const branchLabel = useMemo(() => {
    if (forcedBranchId) {
      return (
        selectedBranch?.name ||
        clinicBranches.find((b) => b.id === forcedBranchId)?.name ||
        user?.branchName ||
        'Your clinic'
      )
    }
    if (!queryBranchId) return 'All Branches'
    return clinicBranches.find((b) => b.id === queryBranchId)?.name || 'Selected branch'
  }, [
    forcedBranchId,
    queryBranchId,
    selectedBranch?.name,
    clinicBranches,
    user?.branchName,
  ])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchPaymentChannelsReport({
      from,
      to,
      branchId: queryBranchId,
    })
      .then((result) => {
        if (cancelled) return
        setChannels(result.channels)
        setTotal(result.total)
        setTxnCount(result.txnCount)
      })
      .catch((err) => {
        console.error('[payment-channels] load failed', err)
        if (!cancelled) {
          setChannels([])
          setTotal(0)
          setTxnCount(0)
          toast.error('Could not load payment channels')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [from, to, queryBranchId])

  const primaryChannels = useMemo(
    () => channels.filter((c) => c.key !== 'other'),
    [channels],
  )

  function applyFilter() {
    setFrom(fromDraft)
    setTo(toDraft)
    if (!forcedBranchId) {
      const next = branchDraft || 'all'
      setBranchFilter(next)
      setSelectedBranchId(next)
    }
  }

  function handleExport() {
    exportCsv(
      `imajica-payment-channels-${branchLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${from}-${to}.csv`,
      ['Branch', 'Payment Channel', 'Amount', 'Transactions', 'Share %'],
      channels.map((r) => [
        branchLabel,
        r.label,
        String(r.amount),
        String(r.count),
        r.sharePct.toFixed(2),
      ]),
    )
    toast.success('Exported payment channels report')
  }

  return (
    <div className="space-y-4">
      <AdminPageBanner
        title="Payment Channels Report"
        description={
          clinicOnly
            ? `Amounts customers paid by tender at ${branchLabel} (Cash, cards, QR PH, Owners Account).`
            : 'Amounts customers paid by tender. Choose a branch or view all clinics.'
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Total collected"
          value={formatPesoExact(total)}
          icon={<Wallet className="h-4 w-4" />}
        />
        <KpiCard
          label="Payment rows"
          value={String(txnCount)}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <KpiCard
          label="Channels with activity"
          value={String(primaryChannels.filter((c) => c.amount > 0).length)}
          icon={<CreditCard className="h-4 w-4" />}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-2">
            {hqUser && !forcedBranchId ? (
              <label className="text-xs text-slate-ui">
                Branch
                <select
                  value={branchDraft}
                  onChange={(e) => setBranchDraft(e.target.value)}
                  className={cn(inputClass, 'mt-1 block min-w-[200px]')}
                >
                  <option value="all">All Branches</option>
                  {clinicBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="text-xs text-slate-ui">
                Branch
                <p className="mt-1 rounded-[6px] border border-border bg-[#F7F4EC] px-2.5 py-1.5 text-sm font-medium text-[#073D2C]">
                  {branchLabel}
                </p>
              </div>
            )}
            <label className="text-xs text-slate-ui">
              From
              <input
                type="date"
                value={fromDraft}
                onChange={(e) => setFromDraft(e.target.value)}
                className={cn(inputClass, 'mt-1 block')}
                aria-label="From date"
              />
            </label>
            <label className="text-xs text-slate-ui">
              To
              <input
                type="date"
                value={toDraft}
                onChange={(e) => setToDraft(e.target.value)}
                className={cn(inputClass, 'mt-1 block')}
                aria-label="To date"
              />
            </label>
            <button
              type="button"
              onClick={applyFilter}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-[6px] border border-border bg-[#eef1f4] px-3 text-sm font-medium text-slate-700 transition hover:bg-[#e4e8ec]"
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>
          </div>
          <Button type="button" variant="secondary" onClick={handleExport} disabled={loading}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <p className="mt-2 text-xs text-slate-ui">
          Showing <span className="font-semibold text-[#073D2C]">{branchLabel}</span>
          {clinicOnly ? ' (your clinic only)' : null}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {primaryChannels.map((row) => (
            <ChannelCard key={row.key} row={row} loading={loading} />
          ))}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] font-bold uppercase tracking-wide text-slate-ui">
                <th className="px-2 py-2.5">Payment channel</th>
                <th className="px-2 py-2.5 text-right">Amount</th>
                <th className="px-2 py-2.5 text-right">Transactions</th>
                <th className="px-2 py-2.5 text-right">Share</th>
                <th className="min-w-[140px] px-2 py-2.5">Mix</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-2 py-10 text-center text-slate-ui">
                    Loading payment channels…
                  </td>
                </tr>
              ) : channels.every((c) => c.amount === 0) ? (
                <tr>
                  <td colSpan={5} className="px-2 py-10 text-center text-slate-ui">
                    No payments in this range for {branchLabel}.
                  </td>
                </tr>
              ) : (
                channels.map((row) => (
                  <tr key={row.key} className="border-b border-border/70 hover:bg-[#F7F4EC]/50">
                    <td className="px-2 py-2.5 font-medium text-[#073D2C]">{row.label}</td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-[#073D2C]">
                      {formatPesoExact(row.amount)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-ui">
                      {row.count}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-ui">
                      {row.sharePct.toFixed(1)}%
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#073D2C]"
                          style={{ width: `${Math.min(100, row.sharePct)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && channels.some((c) => c.amount > 0) ? (
              <tfoot>
                <tr className="border-t border-border font-semibold text-[#073D2C]">
                  <td className="px-2 py-3">Total</td>
                  <td className="px-2 py-3 text-right tabular-nums">{formatPesoExact(total)}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{txnCount}</td>
                  <td className="px-2 py-3 text-right">100%</td>
                  <td />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-ui">
          Totals are what customers paid by tender (including split payments). Doctor&apos;s
          procedure clinic-net (80%) is not applied here.
        </p>
      </Card>
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-[14px] border border-[#073D2C]/15 bg-gradient-to-br from-[#F7F4EC] via-white to-[#E8F0EC] px-4 py-3.5 shadow-[0_8px_24px_rgba(7,61,44,0.06)]">
      <div className="flex items-center gap-2 text-[#073D2C]/75">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#073D2C]/10 text-[#073D2C]">
          {icon}
        </span>
        <p className="text-[11px] font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 font-display text-xl text-[#073D2C]">{value}</p>
    </div>
  )
}

function ChannelCard({ row, loading }: { row: PaymentChannelRow; loading: boolean }) {
  const tone = CHANNEL_CARD_STYLES[row.key] || CHANNEL_CARD_STYLES.other
  return (
    <div
      className={cn(
        'rounded-[14px] border px-3.5 py-3.5 shadow-[0_10px_28px_rgba(7,61,44,0.12)]',
        tone,
        row.amount <= 0 && 'opacity-55 grayscale-[0.25]',
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">{row.label}</p>
      <p className="mt-1.5 font-display text-lg font-semibold tracking-tight">
        {loading ? '—' : formatPesoExact(row.amount)}
      </p>
      <p className="mt-0.5 text-xs text-white/65">
        {loading ? '…' : `${row.count} txn · ${row.sharePct.toFixed(1)}%`}
      </p>
    </div>
  )
}
