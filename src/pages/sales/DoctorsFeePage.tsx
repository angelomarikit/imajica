import { useEffect, useMemo, useState } from 'react'
import { Filter, Search, Stethoscope } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import {
  ensureBranchOpsSales,
  listDoctorFees,
  type DoctorFeeRow,
} from '@/services/salesService'
import { formatPesoExact } from '@/utils/currency'
import { isFranchiseBranchOwner } from '@/utils/franchiseAccess'

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

function defaultRange() {
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

export function DoctorsFeePage() {
  const { user } = useAuth()
  const forcedBranchId = useForcedBranchId()
  const franchiseOwner = isFranchiseBranchOwner(user)
  const initial = defaultRange()

  const [rows, setRows] = useState<DoctorFeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fromDraft, setFromDraft] = useState(initial.from)
  const [toDraft, setToDraft] = useState(initial.to)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void ensureBranchOpsSales({
      branchId: forcedBranchId || undefined,
      from,
      to,
      syncClients: false,
    })
      .then(() => {
        if (cancelled) return
        setRows(
          listDoctorFees({
            branchId: forcedBranchId || undefined,
            from,
            to,
          }),
        )
      })
      .catch((err) => {
        console.error('[doctors-fee] load failed', err)
        if (!cancelled) {
          setRows([])
          toast.error('Could not load doctor fees')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [forcedBranchId, from, to])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.doctorName.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.invoiceNumber.toLowerCase().includes(q) ||
        r.bookingRef.toLowerCase().includes(q) ||
        r.branchName.toLowerCase().includes(q) ||
        (r.staffName || '').toLowerCase().includes(q),
    )
  }, [rows, query])

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.fees += r.doctorFeeAmount
        acc.services += r.serviceTotal
        acc.net += r.clinicNetAmount
        return acc
      },
      { fees: 0, services: 0, net: 0 },
    )
  }, [filtered])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function applyFilter() {
    setFrom(fromDraft)
    setTo(toDraft)
    setQuery(queryDraft)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-[#073D2C]/10 p-2.5">
          <Stethoscope className="h-5 w-5 text-[#073D2C]" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-[#073D2C] sm:text-[1.75rem]">Doctors Fee</h1>
          <p className="mt-0.5 text-sm text-slate-ui">
            Outsourced doctor payouts (20% of doctor&apos;s procedure orders). Customer paid 100%;
            clinic net is 80%.
            {franchiseOwner || forcedBranchId ? ' Showing your clinic only.' : ''}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Doctor fees owed" value={formatPesoExact(totals.fees)} />
        <KpiCard label="Service total (100%)" value={formatPesoExact(totals.services)} />
        <KpiCard label="Clinic net (80%)" value={formatPesoExact(totals.net)} />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-ui">
            Show
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className={inputClass}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            entries
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
              className={inputClass}
              aria-label="From date"
            />
            <span className="text-sm text-slate-ui">to</span>
            <input
              type="date"
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
              className={inputClass}
              aria-label="To date"
            />
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-ui" />
              <input
                type="search"
                value={queryDraft}
                onChange={(e) => setQueryDraft(e.target.value)}
                placeholder="Doctor, client, invoice…"
                className={`${inputClass} w-48 pl-8 sm:w-56`}
              />
            </div>
            <button
              type="button"
              onClick={applyFilter}
              className="inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-[#eef1f4] px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-[#e4e8ec]"
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] font-bold uppercase tracking-wide text-slate-ui">
                <th className="px-2 py-2.5">Date</th>
                <th className="px-2 py-2.5">Invoice</th>
                <th className="px-2 py-2.5">Client</th>
                <th className="px-2 py-2.5">Doctor</th>
                <th className="px-2 py-2.5">Branch</th>
                <th className="px-2 py-2.5 text-right">Service total</th>
                <th className="px-2 py-2.5 text-right">Doctor fee (20%)</th>
                <th className="px-2 py-2.5 text-right">Clinic net (80%)</th>
                <th className="px-2 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-2 py-10 text-center text-slate-ui">
                    Loading doctor fees…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-2 py-10 text-center text-slate-ui">
                    No doctor&apos;s procedure orders in this range.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.saleId} className="border-b border-border/70 hover:bg-[#F7F4EC]/50">
                    <td className="px-2 py-2.5 whitespace-nowrap text-[#073D2C]">
                      {formatShortDate(r.createdAt)}
                    </td>
                    <td className="px-2 py-2.5 font-mono text-xs text-[#073D2C]">
                      {r.invoiceNumber}
                    </td>
                    <td className="px-2 py-2.5 text-[#073D2C]">{r.clientName}</td>
                    <td className="px-2 py-2.5 font-medium text-[#073D2C]">{r.doctorName}</td>
                    <td className="px-2 py-2.5 text-slate-ui">{r.branchName}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {formatPesoExact(r.serviceTotal)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-amber-800">
                      {formatPesoExact(r.doctorFeeAmount)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-[#073D2C]">
                      {formatPesoExact(r.clinicNetAmount)}
                    </td>
                    <td className="px-2 py-2.5">
                      <Badge variant={r.status === 'paid' ? 'success' : 'neutral'}>
                        {r.status === 'paid' ? 'Paid' : r.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-ui">
          <span>
            {filtered.length} record{filtered.length === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-[6px] border border-border px-3 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {safePage} / {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="rounded-[6px] border border-border px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">{label}</p>
      <p className="mt-1 font-display text-xl text-[#073D2C]">{value}</p>
    </Card>
  )
}
