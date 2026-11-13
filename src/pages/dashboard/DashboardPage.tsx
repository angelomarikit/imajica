import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CalendarCheck2,
  CalendarDays,
  Cake,
  CreditCard,
  Gift,
  Minus,
  Package,
  Receipt,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { BRAND } from '@/constants/brand'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import {
  listAppointments,
  subscribeAppointments,
} from '@/services/appointmentService'
import { getClients, preloadClientsFromSupabase, subscribeClients } from '@/services/clientService'
import { BRANCH_IDS, COMPANY_OWNED_BRANCH_IDS } from '@/constants/teamAccountsSeed'
import {
  CASH_DAY_CUTOVER_HOUR_MANILA,
  HQ_CASH_SCOPE,
  cashBusinessDateKey,
  cashPriorBusinessDateKey,
  migrateLocalCashDrawerToSupabase,
  preloadCashDrawer,
  readCashBeginning,
  readCompanyCashBeginning,
  readCompanyConfirmedToday,
  readCompanyManualCashDeducted,
  readConfirmedCash,
  readManualCashDeducted,
  recoverCompanyCashOnHand,
  subscribeCashDrawer,
  writeConfirmedCash,
  writeManualCashDeducted,
} from '@/services/cashDrawerService'
import { getExpenses, subscribeExpenses } from '@/services/expenseService'
import {
  fetchBranchCashCollected,
  fetchBranchDashboardSalesSummary,
  fetchOrgDashboardSalesByBranch,
  type BranchDashboardSalesSummary,
  type OrgDashboardSalesByBranch,
} from '@/services/dashboardSalesSummaryService'
import { manilaDateKey } from '@/services/attendanceService'
import {
  clinicRecognizedAmount,
  getSales,
  preloadSalesData,
  saleGrossAmount,
  subscribeSalesData,
  summarizeDoctorCommissionsByDoctor,
  type DoctorCommissionSummaryRow,
} from '@/services/salesService'
import { getDirectoryStaff } from '@/services/staffDirectoryService'
import type { Appointment, Client, OperationalExpense, Sale, Staff } from '@/types'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'
import { isBranchOwner, isHqRole, isOperationsManagerRole } from '@/utils/franchiseAccess'

type BirthdayCard = {
  id: string
  name: string
  initials: string
  label: string
  sub: string
  daysUntil: number
  role?: string
}

function safeName(name: unknown, fallback = 'Unknown') {
  const s = typeof name === 'string' ? name.trim() : ''
  return s || fallback
}

function initials(name: unknown) {
  const parts = safeName(name, '—').split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
  return (parts[0] || '—').slice(0, 2).toUpperCase()
}

function parseDob(raw?: string | null): Date | null {
  if (raw == null) return null
  const text = String(raw).trim()
  if (!text) return null
  const d = new Date(text.includes('T') ? text : `${text}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function birthdayMeta(dob: Date, from: Date) {
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
  if (Number.isNaN(next.getTime())) return null
  if (next < today) next = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate())
  if (Number.isNaN(next.getTime())) return null
  const daysUntil = Math.round((next.getTime() - today.getTime()) / 86_400_000)
  if (!Number.isFinite(daysUntil)) return null
  let age = today.getFullYear() - dob.getFullYear()
  const hadBirthday =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate())
  if (!hadBirthday) age -= 1
  const displayDate = dob.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return { daysUntil, age: Math.max(0, age), displayDate }
}

/** Calendar month bounds from a YYYY-MM-DD key (Manila-aligned). */
function monthBoundsFromKey(dateKey: string): { from: string; to: string } {
  const [yRaw, mRaw] = dateKey.split('-')
  const y = Number(yRaw)
  const m = Number(mRaw)
  if (!y || !m) {
    const fallback = manilaDateKey()
    return monthBoundsFromKey(fallback)
  }
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mm = String(m).padStart(2, '0')
  return {
    from: `${y}-${mm}-01`,
    to: `${y}-${mm}-${String(last).padStart(2, '0')}`,
  }
}

/** Every clinic starts on Manila month-to-date — never snap to an older sales month. */
function defaultDashboardRange(): { from: string; to: string } {
  const today = manilaDateKey()
  const { from } = monthBoundsFromKey(today)
  return { from, to: today }
}

function inDateRange(dateKey: string, from: string, to: string) {
  if (!dateKey) return false
  return dateKey >= from && dateKey <= to
}

function saleDateKey(sale: Sale) {
  return manilaDateKey(new Date(sale.createdAt))
}


function formatRangeLabel(from: string, to: string) {
  const fmt = (key: string) =>
    new Date(`${key}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  if (from === to) return fmt(from)
  return `${fmt(from)} – ${fmt(to)}`
}

function daysInclusive(from: string, to: string) {
  const a = new Date(`${from}T12:00:00`).getTime()
  const b = new Date(`${to}T12:00:00`).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1)
}

function StatCard({
  title,
  value,
  hint,
  tag,
  tagTone = 'amber',
  icon,
  action,
  className,
  onClick,
}: {
  title: string
  value: string
  hint?: string
  tag?: string
  tagTone?: 'amber' | 'sky' | 'rose' | 'emerald'
  icon?: ReactNode
  action?: ReactNode
  className?: string
  onClick?: () => void
}) {
  const tagClass = {
    amber: 'bg-amber-100 text-amber-800',
    sky: 'bg-sky-100 text-sky-800',
    rose: 'bg-rose-100 text-rose-700',
    emerald: 'bg-emerald-100 text-emerald-800',
  }[tagTone]

  const interactive = Boolean(onClick)

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        'flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]',
        interactive &&
          'cursor-pointer transition hover:-translate-y-0.5 hover:border-[#C5A059]/50 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]/40',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-[#0A2E26] ring-1 ring-slate-200/80">
              {icon}
            </span>
          ) : null}
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
        </div>
        {tag ? (
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              tagClass,
            )}
          >
            {tag}
          </span>
        ) : null}
      </div>
      <p className="mt-4 font-metric text-[1.75rem] font-semibold leading-none tracking-tight text-slate-900">
        {value}
      </p>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        {hint ? (
          <p className="text-xs leading-snug text-slate-500">
            {hint}
            {interactive ? (
              <span className="mt-1 block text-[11px] font-semibold text-[#0A2E26]/70">
                Tap for breakdown
              </span>
            ) : null}
          </p>
        ) : (
          <span />
        )}
        {action}
      </div>
    </div>
  )
}

type SalesBreakdownView = {
  title: string
  subtitle: string
  sales: Sale[]
  branchLabel: string
  /** Gross = customer-paid total; clinic = dashboard-recognized (net of doctor fee). */
  amountMode?: 'gross' | 'clinic'
  /** When set (e.g. Monthly RPC), header total matches the card instead of summing local lines. */
  displayTotal?: number
}

type DoctorFeeBreakdownView = {
  title: string
  subtitle: string
  branchLabel: string
  totalFee: number
  rows: DoctorCommissionSummaryRow[]
}

function lineAmount(sale: Sale, mode: 'gross' | 'clinic') {
  return mode === 'gross' ? saleGrossAmount(sale) : clinicRecognizedAmount(sale)
}

function saleHeaderId(saleId: string): string {
  const sep = saleId.indexOf(':')
  return sep > 0 ? saleId.slice(0, sep) : saleId
}

function buildSalesBrief(sales: Sale[], amountMode: 'gross' | 'clinic' = 'clinic') {
  const total = sales.reduce((n, s) => n + lineAmount(s, amountMode), 0)
  const byType = {
    service: 0,
    package: 0,
    product: 0,
  }
  const byPay = new Map<string, number>()
  const byItem = new Map<string, { name: string; amount: number; qty: number }>()
  const clients = new Set<string>()
  const bookings = new Set<string>()
  const seenPayHeaders = new Set<string>()

  for (const s of sales) {
    const amount = lineAmount(s, amountMode)
    const type = s.itemType === 'package' || s.itemType === 'product' ? s.itemType : 'service'
    byType[type] += amount
    const key = (s.treatmentOrPackage || 'Item').trim() || 'Item'
    const prev = byItem.get(key) ?? { name: key, amount: 0, qty: 0 }
    prev.amount += amount
    prev.qty += s.quantity || 1
    byItem.set(key, prev)
    if (s.clientId) clients.add(s.clientId)
    else if (s.clientName) clients.add(s.clientName)
    bookings.add(s.bookingRef || s.invoiceNumber || s.id)

    const hid = saleHeaderId(s.id)
    if (seenPayHeaders.has(hid)) continue
    seenPayHeaders.add(hid)

    if (s.paymentBreakdown && s.paymentBreakdown.length) {
      for (const row of s.paymentBreakdown) {
        const status = String(row.status || '').toLowerCase()
        if (status === 'failed' || status === 'cancelled' || status === 'refunded') continue
        const pay = (row.method || 'other').replaceAll('_', ' ')
        byPay.set(pay, (byPay.get(pay) || 0) + (Number(row.amount) || 0))
      }
      continue
    }

    const headerGross = sales
      .filter((x) => saleHeaderId(x.id) === hid)
      .reduce((n, x) => n + lineAmount(x, amountMode), 0)
    const methods =
      s.paymentMethods && s.paymentMethods.length
        ? s.paymentMethods
        : s.paymentMethod
          ? [s.paymentMethod]
          : ['other']
    if (methods.length <= 1) {
      const pay = (methods[0] || 'other').replaceAll('_', ' ')
      byPay.set(pay, (byPay.get(pay) || 0) + headerGross)
    } else {
      const share = headerGross / methods.length
      for (const m of methods) {
        const pay = (m || 'other').replaceAll('_', ' ')
        byPay.set(pay, (byPay.get(pay) || 0) + share)
      }
    }
  }

  const topItems = [...byItem.values()].sort((a, b) => b.amount - a.amount).slice(0, 12)
  const payments = [...byPay.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount)

  return {
    total,
    lines: sales.length,
    bookings: bookings.size,
    clients: clients.size,
    byType,
    topItems,
    payments,
  }
}

function SalesBreakdownModal({
  open,
  view,
  onClose,
}: {
  open: boolean
  view: SalesBreakdownView | null
  onClose: () => void
}) {
  if (!open || !view) return null
  const amountMode = view.amountMode ?? 'clinic'
  const brief = buildSalesBrief(view.sales, amountMode)
  const headerTotal =
    typeof view.displayTotal === 'number' && Number.isFinite(view.displayTotal)
      ? view.displayTotal
      : brief.total
  const maxType = Math.max(brief.byType.service, brief.byType.package, brief.byType.product, 1)
  const typeRows = [
    { key: 'service', label: 'Services', amount: brief.byType.service, tone: 'from-[#0A2E26] to-[#1a5c4a]' },
    { key: 'package', label: 'Packages', amount: brief.byType.package, tone: 'from-[#C5A059] to-[#e0c58a]' },
    { key: 'product', label: 'Products', amount: brief.byType.product, tone: 'from-rose-400 to-rose-300' },
  ] as const

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#041c18]/55 backdrop-blur-[2px]"
        aria-label="Close breakdown"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92vh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#FBF8F2] shadow-[0_28px_80px_rgba(4,28,24,0.45)]">
        <div className="relative shrink-0 overflow-hidden bg-[#05281F] px-6 py-6 text-white sm:px-8 sm:py-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.35)_0%,transparent_70%)]"
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0 pr-2">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#C5A059]/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#F3E6C8]">
                <Sparkles className="h-3 w-3 text-[#C5A059]" />
                Brief breakdown
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{view.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{view.subtitle}</p>
              <p className="mt-1.5 text-xs font-medium text-[#C5A059]">{view.branchLabel}</p>
              {amountMode === 'gross' ? (
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#F3E6C8]/80">
                  Gross paid · no doctor fee deducted
                </p>
              ) : (
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#F3E6C8]/80">
                  Clinic-recognized · doctor&apos;s procedure net
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-white/15 bg-white/10 p-2.5 text-white hover:bg-white/15"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="relative mt-6 font-metric text-[2.15rem] font-semibold leading-none tracking-tight sm:text-[2.35rem]">
            {formatPesoExact(headerTotal)}
          </p>
          <div className="relative mt-4 flex flex-wrap gap-2.5 text-[11px] font-semibold text-white/75">
            <span className="rounded-full bg-white/10 px-3 py-1.5">{brief.bookings} bookings</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">{brief.clients} clients</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">{brief.lines} line items</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8 sm:py-7">
          <div className="space-y-7 pb-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                By category
              </p>
              <div className="mt-5 space-y-5">
                {typeRows.map((row) => (
                  <div key={row.key}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-800">{row.label}</span>
                      <span className="shrink-0 font-metric font-semibold text-slate-900">
                        {formatPesoExact(row.amount)}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r', row.tone)}
                        style={{ width: `${Math.round((row.amount / maxType) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Top items
                </p>
                {brief.topItems.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No sales in this period.</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {brief.topItems.map((item, i) => (
                      <li key={item.name} className="flex items-start gap-3.5">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#05281F] text-[10px] font-bold text-[#F3E6C8]">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold leading-snug text-slate-900">
                            {item.name}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                            Qty {item.qty} · {formatPesoExact(item.amount)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Payments
                </p>
                {brief.payments.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No payment mix yet.</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {brief.payments.map((p) => (
                      <li key={p.label} className="flex items-start justify-between gap-3 text-sm">
                        <span className="break-words capitalize leading-snug text-slate-700">
                          {p.label}
                        </span>
                        <span className="shrink-0 font-metric font-semibold text-slate-900">
                          {formatPesoExact(p.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 -mx-6 border-t border-[#C5A059]/25 bg-[#FBF8F2]/95 px-6 pt-4 backdrop-blur sm:-mx-8 sm:px-8">
              <div className="flex flex-col gap-4 rounded-2xl border border-[#C5A059]/35 bg-gradient-to-r from-[#F7EED8] to-[#FBF8F2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5 text-sm text-[#05281F]">
                  <Package className="h-4 w-4 shrink-0 text-[#C5A059]" />
                  <span className="font-medium leading-snug">Quick snapshot for this selection</span>
                </div>
                <Button type="button" variant="gold" className="shrink-0 rounded-xl" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DoctorFeeBreakdownModal({
  open,
  view,
  onClose,
}: {
  open: boolean
  view: DoctorFeeBreakdownView | null
  onClose: () => void
}) {
  if (!open || !view) return null
  const maxFee = Math.max(...view.rows.map((r) => r.fee), 1)

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#041c18]/55 backdrop-blur-[2px]"
        aria-label="Close medical procedure breakdown"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92vh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#FBF8F2] shadow-[0_28px_80px_rgba(4,28,24,0.45)]">
        <div className="relative shrink-0 overflow-hidden bg-[#05281F] px-6 py-6 text-white sm:px-8 sm:py-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.35)_0%,transparent_70%)]"
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0 pr-2">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#C5A059]/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#F3E6C8]">
                <Stethoscope className="h-3 w-3 text-[#C5A059]" />
                Medical procedure
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{view.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{view.subtitle}</p>
              <p className="mt-1.5 text-xs font-medium text-[#C5A059]">{view.branchLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-white/15 bg-white/10 p-2.5 text-white hover:bg-white/15"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="relative mt-6 font-metric text-[2.15rem] font-semibold leading-none tracking-tight sm:text-[2.35rem]">
            {formatPesoExact(view.totalFee)}
          </p>
          <p className="relative mt-2 text-xs text-white/65">
            Total doctor commission in this range · {view.rows.length} doctor
            {view.rows.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8 sm:py-7">
          {view.rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
              No medical procedure commissions in this date range.
            </div>
          ) : (
            <ul className="space-y-4">
              {view.rows.map((row) => (
                <li
                  key={row.doctorName}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{row.doctorName}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {row.procedures} procedure{row.procedures === 1 ? '' : 's'} · {row.ratePercent}%
                        fee · service {formatPesoExact(row.serviceTotal)}
                      </p>
                    </div>
                    <p className="shrink-0 font-metric text-base font-semibold text-slate-900">
                      {formatPesoExact(row.fee)}
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0A2E26] to-[#C5A059]"
                      style={{ width: `${Math.round((row.fee / maxFee) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex justify-end">
            <Button type="button" variant="gold" className="rounded-xl" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BirthdayPersonCard({ item }: { item: BirthdayCard }) {
  return (
    <div className="flex min-w-[240px] max-w-[280px] shrink-0 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0A2E26] text-sm font-semibold text-[#F3E6C8]">
        {item.initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
              item.daysUntil === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800',
            )}
          >
            <Cake className="h-3 w-3" />
            {item.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
        {item.role ? <p className="mt-0.5 text-[11px] font-medium text-slate-400">{item.role}</p> : null}
      </div>
    </div>
  )
}

function BirthdayBlock({
  title,
  empty,
  items,
}: {
  title: string
  empty: string
  items: BirthdayCard[]
}) {
  return (
    <div>
      <p className="mb-2.5 text-sm font-semibold text-slate-800">{title}</p>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
          {empty}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">{items.map((b) => (
          <BirthdayPersonCard key={b.id} item={b} />
        ))}</div>
      )}
    </div>
  )
}

export function DashboardPage() {
  return <BranchOpsDashboard />
}

function BranchOpsDashboard() {
  const { user } = useAuth()
  const { branches, selectedBranchId, setSelectedBranchId, branchLocked } = useBranch()
  const forcedBranchId = useForcedBranchId()
  const branchOwner = isBranchOwner(user)
  const hqView = isHqRole(user?.role) || isOperationsManagerRole(user?.role)
  // HQ aggregates every clinic when All Branches is selected (default after HQ login).
  const scopeBranchId = forcedBranchId ?? (selectedBranchId === 'all' ? undefined : selectedBranchId)

  const initialRange = defaultDashboardRange()
  const [rangeFrom, setRangeFrom] = useState(initialRange.from)
  const [rangeTo, setRangeTo] = useState(initialRange.to)
  const [fromDraft, setFromDraft] = useState(initialRange.from)
  const [toDraft, setToDraft] = useState(initialRange.to)
  const [rangeOpen, setRangeOpen] = useState(false)

  const [sales, setSales] = useState<Sale[]>(() => getSales())
  const [clients, setClients] = useState<Client[]>(() => getClients())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [expenses, setExpenses] = useState<OperationalExpense[]>(() => getExpenses())
  const [cashTick, setCashTick] = useState(0)
  const [breakdown, setBreakdown] = useState<SalesBreakdownView | null>(null)
  const [doctorBreakdown, setDoctorBreakdown] = useState<DoctorFeeBreakdownView | null>(null)
  const [deductOpen, setDeductOpen] = useState(false)
  const [deductAmount, setDeductAmount] = useState('')
  const [deductSaving, setDeductSaving] = useState(false)
  const [recoverOpen, setRecoverOpen] = useState(false)
  const [recoverSaving, setRecoverSaving] = useState(false)
  const [recoverAmounts, setRecoverAmounts] = useState<Record<string, string>>({
    [BRANCH_IDS.sanMateo]: '',
    [BRANCH_IDS.pasig]: '',
    [BRANCH_IDS.cainta]: '',
    [BRANCH_IDS.lipa]: '',
  })
  /** Server aggregates — sole source of truth for money cards (no localStorage math). */
  const [rpcSummary, setRpcSummary] = useState<BranchDashboardSalesSummary | null>(null)
  const [orgSales, setOrgSales] = useState<OrgDashboardSalesByBranch | null>(null)
  const [salesRpcError, setSalesRpcError] = useState<string | null>(null)
  const [salesRpcTick, setSalesRpcTick] = useState(0)
  /** Cash on Hand: cash tenders only (RPC), per clinic and company combined. */
  const [cashCollectedRpc, setCashCollectedRpc] = useState<number | null>(null)
  const [companyCashCollectedRpc, setCompanyCashCollectedRpc] = useState<number | null>(null)
  const [companyCashByBranch, setCompanyCashByBranch] = useState<Record<string, number>>({})

  useEffect(() => {
    const refreshSales = () => setSales(getSales())
    const refreshClients = () => setClients(getClients())
    const refreshExpenses = () => setExpenses(getExpenses())
    const refreshAppts = () => {
      void listAppointments().then(setAppointments)
    }
    // Cards use SQL summary RPC. Light ops warm-cache only (no Migration / JSON dump).
    void preloadSalesData(
      scopeBranchId ? { branchId: scopeBranchId } : undefined,
    ).then(refreshSales)
    void preloadClientsFromSupabase().then(refreshClients)
    refreshSales()
    refreshClients()
    refreshExpenses()
    refreshAppts()
    const unsubs = [
      subscribeSalesData(refreshSales),
      subscribeClients(refreshClients),
      subscribeExpenses(refreshExpenses),
      subscribeAppointments(refreshAppts),
      subscribeCashDrawer(() => setCashTick((n) => n + 1)),
    ]
    return () => unsubs.forEach((u) => u())
  }, [scopeBranchId])

  useEffect(() => {
    const cashDay = cashBusinessDateKey()
    const prior = cashPriorBusinessDateKey(cashDay)
    const [y, m, d] = prior.split('-').map(Number)
    const fromUtc = new Date(Date.UTC(y, m - 1, d - 14))
    const fromKey = `${fromUtc.getUTCFullYear()}-${String(fromUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(fromUtc.getUTCDate()).padStart(2, '0')}`
    const scopes = scopeBranchId
      ? [scopeBranchId]
      : [...COMPANY_OWNED_BRANCH_IDS, HQ_CASH_SCOPE]
    void preloadCashDrawer({ scopes, from: fromKey, to: cashDay })
      .then(() => migrateLocalCashDrawerToSupabase())
      .then(() => setCashTick((n) => n + 1))
  }, [scopeBranchId])

  // Refresh Cash on Hand when the 8:00 AM Manila business day flips.
  useEffect(() => {
    const id = window.setInterval(() => setCashTick((n) => n + 1), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    const today = manilaDateKey()
    setSalesRpcError(null)

    if (scopeBranchId) {
      setOrgSales(null)
      void fetchBranchDashboardSalesSummary({
        branchId: scopeBranchId,
        from: rangeFrom,
        to: rangeTo,
        today,
      }).then((result) => {
        if (cancelled) return
        if (result.status === 'ok') {
          setRpcSummary(result.data)
          setSalesRpcError(null)
        } else if (result.status === 'error') {
          setRpcSummary(null)
          setSalesRpcError(result.message || 'Could not load sales from server')
        }
      })
    } else {
      setRpcSummary(null)
      void fetchOrgDashboardSalesByBranch({
        from: rangeFrom,
        to: rangeTo,
        today,
      }).then((result) => {
        if (cancelled) return
        if (result.status === 'ok') {
          setOrgSales(result.data)
          setSalesRpcError(null)
        } else if (result.status === 'error') {
          setOrgSales(null)
          setSalesRpcError(result.message || 'Could not load branch sales from server')
        }
      })
    }

    return () => {
      cancelled = true
    }
  }, [scopeBranchId, rangeFrom, rangeTo, salesRpcTick])

  // Re-fetch server totals when tab gains focus or a sale is recorded on this PC.
  useEffect(() => {
    const bump = () => setSalesRpcTick((n) => n + 1)
    const onFocus = () => bump()
    window.addEventListener('focus', onFocus)
    const unsub = subscribeSalesData(bump)
    return () => {
      window.removeEventListener('focus', onFocus)
      unsub()
    }
  }, [])

  const branchLabel = useMemo(() => {
    if (forcedBranchId || branchOwner) return user?.branchName ?? 'My Branch'
    if (scopeBranchId) {
      return branches.find((b) => b.id === scopeBranchId)?.name ?? 'Selected Branch'
    }
    return 'All Branches'
  }, [forcedBranchId, branchOwner, user?.branchName, scopeBranchId, branches])

  function openSalesBreakdown(
    title: string,
    subtitle: string,
    lines: Sale[],
    amountMode: 'gross' | 'clinic' = 'clinic',
    displayTotal?: number,
  ) {
    setDoctorBreakdown(null)
    setBreakdown({ title, subtitle, sales: lines, branchLabel, amountMode, displayTotal })
  }

  function openDoctorFeeBreakdown(
    title: string,
    subtitle: string,
    rows: DoctorCommissionSummaryRow[],
    totalFee: number,
  ) {
    setBreakdown(null)
    setDoctorBreakdown({ title, subtitle, branchLabel, rows, totalFee })
  }

  /** HQ All Branches = San Mateo + Pasig + Cainta + Lipa combined. Single clinic = that drawer. */
  const companyCashScopes = COMPANY_OWNED_BRANCH_IDS
  const showCompanyCashOnHand = hqView && !scopeBranchId
  const cashScope = scopeBranchId ?? 'all'
  const todayKey = manilaDateKey()
  const now = useMemo(() => new Date(), [todayKey])

  useEffect(() => {
    if (!showCompanyCashOnHand) {
      setCompanyCashCollectedRpc(null)
      setCompanyCashByBranch({})
      return
    }
    let cancelled = false
    const cashDay = cashBusinessDateKey()
    void Promise.all(
      COMPANY_OWNED_BRANCH_IDS.map(async (branchId) => {
        const amount = await fetchBranchCashCollected({ branchId, cashDay })
        return [branchId, amount] as const
      }),
    ).then((pairs) => {
      if (cancelled) return
      const byBranch: Record<string, number> = {}
      let total = 0
      let anyRpc = false
      for (const [id, amount] of pairs) {
        if (amount == null) continue
        anyRpc = true
        byBranch[id] = amount
        total += amount
      }
      setCompanyCashByBranch(byBranch)
      setCompanyCashCollectedRpc(anyRpc ? total : null)
    })
    return () => {
      cancelled = true
    }
  }, [showCompanyCashOnHand, todayKey, cashTick])

  useEffect(() => {
    if (!scopeBranchId || showCompanyCashOnHand) {
      setCashCollectedRpc(null)
      return
    }
    let cancelled = false
    const cashDay = cashBusinessDateKey()
    void fetchBranchCashCollected({ branchId: scopeBranchId, cashDay }).then((amount) => {
      if (!cancelled) setCashCollectedRpc(amount)
    })
    return () => {
      cancelled = true
    }
  }, [scopeBranchId, showCompanyCashOnHand, todayKey, cashTick])

  const scopedSales = useMemo(
    () => (scopeBranchId ? sales.filter((s) => s.branchId === scopeBranchId) : sales),
    [sales, scopeBranchId],
  )
  const scopedClients = useMemo(() => {
    if (!scopeBranchId) return clients
    return clients.filter((c) => c.preferredBranchId === scopeBranchId)
  }, [clients, scopeBranchId])
  const scopedAppts = useMemo(
    () => (scopeBranchId ? appointments.filter((a) => a.branchId === scopeBranchId) : appointments),
    [appointments, scopeBranchId],
  )
  const scopedExpenses = useMemo(() => {
    if (!scopeBranchId) return expenses
    return expenses.filter((e) => !e.branchId || e.branchId === scopeBranchId)
  }, [expenses, scopeBranchId])

  const moneyReady = Boolean(
    scopeBranchId ? rpcSummary : orgSales,
  )

  const metrics = useMemo(() => {
    const rangeSales = scopedSales.filter((s) => inDateRange(saleDateKey(s), rangeFrom, rangeTo))
    const todaySales = scopedSales.filter((s) => saleDateKey(s) === todayKey)
    const monthKey = rangeTo.slice(0, 7)
    const monthStart = `${monthKey}-01`
    const monthSalesLines = scopedSales.filter((s) => {
      const d = saleDateKey(s)
      return d >= monthStart && d <= rangeTo
    })
    const monthlyLabel = rpcSummary?.monthLabel
      || new Date(`${monthKey}-01T12:00:00`).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })

    // Money + count cards from Supabase only when RPC is ready (never invent from local cache).
    let periodSalesTotal = 0
    let dailySales = 0
    let monthlySales = 0
    let actualSales = 0
    let completedBookings = 0
    let patientsInRange = 0
    let paymentsCount = 0
    let doctorFees = 0

    if (scopeBranchId && rpcSummary) {
      periodSalesTotal = rpcSummary.rangeSales
      dailySales = rpcSummary.todaySales
      monthlySales = rpcSummary.monthSales
      actualSales = rpcSummary.rangeGross
      completedBookings = rpcSummary.bookings
      patientsInRange = rpcSummary.patients
      paymentsCount = rpcSummary.rangeCount
      doctorFees = rpcSummary.doctorFees
    } else if (!scopeBranchId && orgSales) {
      periodSalesTotal = orgSales.branches.reduce((n, b) => n + b.clinicNet, 0)
      dailySales = orgSales.branches.reduce((n, b) => n + b.todayClinicNet, 0)
      monthlySales = orgSales.branches.reduce((n, b) => n + b.monthClinicNet, 0)
      actualSales = orgSales.branches.reduce((n, b) => n + b.gross, 0)
      paymentsCount = orgSales.branches.reduce((n, b) => n + b.saleCount, 0)
      completedBookings = orgSales.branches.reduce((n, b) => n + b.bookingCount, 0)
      patientsInRange = orgSales.branches.reduce((n, b) => n + b.patientCount, 0)
      doctorFees = orgSales.branches.reduce((n, b) => n + b.doctorFees, 0)
    }

    const rangeExpenseTotal = scopedExpenses
      .filter((e) => e.status === 'active' && inDateRange(e.expenseDate, rangeFrom, rangeTo))
      .reduce((n, e) => n + (e.amount || 0), 0)
    const todayExpenseTotal = scopedExpenses
      .filter((e) => e.expenseDate === todayKey && e.status === 'active')
      .reduce((n, e) => n + (e.amount || 0), 0)

    const isSingleDay = rangeFrom === rangeTo
    const includesToday = inDateRange(todayKey, rangeFrom, rangeTo)
    // Breakdown rows still use cached lines for detail lists; card total uses doctorFees from server.
    const doctorSummary = summarizeDoctorCommissionsByDoctor(rangeSales)

    return {
      completedBookings,
      todayPatients: patientsInRange,
      totalAppointments: completedBookings,
      todayPaymentsCount: paymentsCount,
      paymentSummary: periodSalesTotal,
      todaySales: dailySales,
      dailySales: includesToday ? dailySales : periodSalesTotal,
      periodSales: periodSalesTotal,
      actualSales,
      medicalProcedureCommission: doctorFees,
      doctorCommissionRows: doctorSummary.byDoctor,
      monthlySales,
      monthlyLabel,
      rangeSalesLines: rangeSales,
      todaySalesLines: todaySales,
      monthSalesLines,
      todayExpenses: includesToday && isSingleDay ? todayExpenseTotal : rangeExpenseTotal,
      rangeExpenseTotal,
      todayExpenseTotal,
      isSingleDay,
      includesToday,
      daySpan: daysInclusive(rangeFrom, rangeTo),
      moneyReady: Boolean(scopeBranchId ? rpcSummary : orgSales),
    }
  }, [
    scopedSales,
    scopedAppts,
    scopedExpenses,
    scopeBranchId,
    todayKey,
    rangeFrom,
    rangeTo,
    rpcSummary,
    orgSales,
  ])

  /** Per-clinic breakdown for HQ All Branches — Supabase org RPC only. */
  const salesByBranch = useMemo(() => {
    const rows = (orgSales?.branches ?? []).map((b) => ({
      id: b.branchId,
      name: b.branchName,
      periodSales: b.clinicNet,
      dailySales: b.todayClinicNet,
      bookings: b.bookingCount,
      clients: b.patientCount,
    }))
    const maxPeriod = Math.max(1, ...rows.map((r) => r.periodSales))
    return {
      periodLabel: formatRangeLabel(rangeFrom, rangeTo),
      rows: rows
        .map((r) => ({ ...r, barPct: Math.round((r.periodSales / maxPeriod) * 100) }))
        .sort((a, b) => b.periodSales - a.periodSales || a.name.localeCompare(b.name)),
      ready: Boolean(orgSales),
    }
  }, [orgSales, rangeFrom, rangeTo])

  function applyDateRange(nextFrom = fromDraft, nextTo = toDraft) {
    let from = nextFrom || rangeFrom
    let to = nextTo || rangeTo
    if (from > to) {
      const tmp = from
      from = to
      to = tmp
    }
    setFromDraft(from)
    setToDraft(to)
    setRangeFrom(from)
    setRangeTo(to)
    setRangeOpen(false)
    toast.success('Date range updated', {
      description: formatRangeLabel(from, to),
    })
  }

  function applyPreset(kind: 'today' | 'week' | 'month' | 'lastMonth') {
    const todayKeyManila = manilaDateKey()
    if (kind === 'today') {
      setFromDraft(todayKeyManila)
      setToDraft(todayKeyManila)
      applyDateRange(todayKeyManila, todayKeyManila)
      return
    }
    if (kind === 'week') {
      const [y, m, d] = todayKeyManila.split('-').map(Number)
      const todayUtc = new Date(Date.UTC(y, m - 1, d))
      const dow = todayUtc.getUTCDay() // 0 Sun … 6 Sat
      const mondayOffset = (dow + 6) % 7
      const startUtc = new Date(todayUtc)
      startUtc.setUTCDate(todayUtc.getUTCDate() - mondayOffset)
      const from = `${startUtc.getUTCFullYear()}-${String(startUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(startUtc.getUTCDate()).padStart(2, '0')}`
      setFromDraft(from)
      setToDraft(todayKeyManila)
      applyDateRange(from, todayKeyManila)
      return
    }
    if (kind === 'month') {
      const bounds = monthBoundsFromKey(todayKeyManila)
      setFromDraft(bounds.from)
      setToDraft(todayKeyManila)
      applyDateRange(bounds.from, todayKeyManila)
      return
    }
    const [y, m] = todayKeyManila.split('-').map(Number)
    const prevMonth = m === 1 ? 12 : m - 1
    const prevYear = m === 1 ? y - 1 : y
    const prevKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
    const bounds = monthBoundsFromKey(prevKey)
    setFromDraft(bounds.from)
    setToDraft(bounds.to)
    applyDateRange(bounds.from, bounds.to)
  }

  const cash = useMemo(() => {
    void cashTick
    // Business day (8:00 AM Manila cutover) — Ending today becomes Beginning tomorrow at 8 AM.
    const cashDay = cashBusinessDateKey()
    const priorCashDay = cashPriorBusinessDateKey(cashDay)
    const companySet = new Set<string>(companyCashScopes)

    if (showCompanyCashOnHand) {
      const beginning = readCompanyCashBeginning(companyCashScopes, priorCashDay)
      const manualDeducted = readCompanyManualCashDeducted(companyCashScopes, cashDay)
      const cashReady = companyCashCollectedRpc != null
      const cashIn = cashReady ? companyCashCollectedRpc : 0
      const expenseCashOut = expenses
        .filter((e) => {
          if (e.expenseDate !== cashDay || e.status !== 'active' || !e.deductCash) return false
          const branchId = e.branchId
          return branchId != null && companySet.has(branchId)
        })
        .reduce((n, e) => n + (e.amount || 0), 0)
      const deducted = expenseCashOut + manualDeducted
      const ending = beginning + cashIn - deducted
      const confirmedToday = readCompanyConfirmedToday(
        companyCashScopes,
        cashDay,
        ending,
      )
      return {
        beginning,
        ending,
        deducted,
        expenseCashOut,
        manualDeducted,
        confirmedToday,
        cashDay,
        priorCashDay,
        companyCombined: true as const,
        cashReady,
        cashIn,
      }
    }

    const beginning = readCashBeginning(cashScope, cashDay)
    const manualDeducted = readManualCashDeducted(cashScope, cashDay)
    const cashReady = cashCollectedRpc != null
    const cashIn = cashReady ? cashCollectedRpc : 0
    const expenseCashOut = scopedExpenses
      .filter(
        (e) => e.expenseDate === cashDay && e.status === 'active' && e.deductCash,
      )
      .reduce((n, e) => n + (e.amount || 0), 0)
    const deducted = expenseCashOut + manualDeducted
    const ending = beginning + cashIn - deducted
    const confirmedToday = readConfirmedCash(cashScope, cashDay)
    return {
      beginning,
      ending,
      deducted,
      expenseCashOut,
      manualDeducted,
      confirmedToday,
      cashDay,
      priorCashDay,
      companyCombined: false as const,
      cashReady,
      cashIn,
    }
  }, [
    cashScope,
    todayKey,
    scopedExpenses,
    cashTick,
    cashCollectedRpc,
    showCompanyCashOnHand,
    companyCashScopes,
    expenses,
    companyCashCollectedRpc,
  ])

  const customerBirthdays = useMemo(() => {
    const todayList: BirthdayCard[] = []
    const upcoming: BirthdayCard[] = []
    for (const c of scopedClients) {
      const dob = parseDob(c.dateOfBirth)
      if (!dob) continue
      const meta = birthdayMeta(dob, now)
      if (!meta || meta.daysUntil > 92) continue
      const card: BirthdayCard = {
        id: c.id,
        name: safeName(c.fullName, 'Client'),
        initials: initials(c.fullName),
        label: meta.daysUntil === 0 ? 'Today' : `in ${meta.daysUntil} days`,
        sub: `${meta.displayDate} | ${meta.age} years old`,
        daysUntil: meta.daysUntil,
      }
      if (meta.daysUntil === 0) todayList.push(card)
      else upcoming.push(card)
    }
    upcoming.sort((a, b) => a.daysUntil - b.daysUntil)
    return { today: todayList, upcoming: upcoming.slice(0, 12) }
  }, [scopedClients, now])

  const staffBirthdays = useMemo(() => {
    let staff: Staff[] = getDirectoryStaff().filter((s) => s.status === 'active')
    if (scopeBranchId) {
      const scoped = staff.filter((s) => s.branchId === scopeBranchId)
      if (scoped.length) staff = scoped
    }
    const todayList: BirthdayCard[] = []
    const upcoming: BirthdayCard[] = []
    for (const s of staff) {
      const dob = parseDob(s.birthDate)
      if (!dob) continue
      const meta = birthdayMeta(dob, now)
      if (!meta || meta.daysUntil > 92) continue
      const card: BirthdayCard = {
        id: s.id,
        name: safeName(s.fullName, 'Staff'),
        initials: initials(s.fullName),
        label: meta.daysUntil === 0 ? 'Today' : `in ${meta.daysUntil} days`,
        sub: `${meta.displayDate} | ${meta.age} years old`,
        daysUntil: meta.daysUntil,
        role: s.title || s.role,
      }
      if (meta.daysUntil === 0) todayList.push(card)
      else upcoming.push(card)
    }
    upcoming.sort((a, b) => a.daysUntil - b.daysUntil)
    return { today: todayList, upcoming: upcoming.slice(0, 12) }
  }, [scopeBranchId, now])

  async function confirmCash() {
    const cashDay = cash.cashDay
    const priorCashDay = cash.priorCashDay

    if (showCompanyCashOnHand) {
      try {
        // Always persist HQ combined row (source of truth across devices).
        await writeConfirmedCash(HQ_CASH_SCOPE, cashDay, cash.ending)
        const clinicsHaveCarry =
          companyCashScopes.some((id) => readConfirmedCash(id, priorCashDay) != null)
        // Only write per-clinic rows when those clinics already have drawer history —
        // otherwise clinic zeros would override the combined `all` beginning tomorrow.
        if (clinicsHaveCarry) {
          await Promise.all(
            companyCashScopes.map(async (branchId) => {
              const beginning = readCashBeginning(branchId, cashDay)
              const manualDeducted = readManualCashDeducted(branchId, cashDay)
              const branchCash = companyCashByBranch[branchId] ?? 0
              const expenseCashOut = expenses
                .filter(
                  (e) =>
                    e.expenseDate === cashDay &&
                    e.status === 'active' &&
                    e.deductCash &&
                    e.branchId === branchId,
                )
                .reduce((n, e) => n + (e.amount || 0), 0)
              const ending = beginning + branchCash - expenseCashOut - manualDeducted
              await writeConfirmedCash(branchId, cashDay, ending)
            }),
          )
        }
        setCashTick((n) => n + 1)
        toast.success('Cash on hand confirmed', {
          description: `Ending ${formatPesoExact(cash.ending)} saved for ${cashDay}. Becomes Beginning after ${CASH_DAY_CUTOVER_HOUR_MANILA}:00 AM Manila.`,
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save cash on hand')
      }
      return
    }

    try {
      await writeConfirmedCash(cashScope, cashDay, cash.ending)
      setCashTick((n) => n + 1)
      toast.success('Cash on hand confirmed', {
        description: `Ending ${formatPesoExact(cash.ending)} saved for ${cashDay}. Becomes Beginning after ${CASH_DAY_CUTOVER_HOUR_MANILA}:00 AM Manila.`,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save cash on hand')
    }
  }

  function openDeductCash() {
    setDeductAmount('')
    setDeductOpen(true)
  }

  function openRecoverCash() {
    const priorCashDay = cash.priorCashDay
    setRecoverAmounts({
      [BRANCH_IDS.sanMateo]: String(readConfirmedCash(BRANCH_IDS.sanMateo, priorCashDay) ?? ''),
      [BRANCH_IDS.pasig]: String(readConfirmedCash(BRANCH_IDS.pasig, priorCashDay) ?? ''),
      [BRANCH_IDS.cainta]: String(readConfirmedCash(BRANCH_IDS.cainta, priorCashDay) ?? ''),
      [BRANCH_IDS.lipa]: String(readConfirmedCash(BRANCH_IDS.lipa, priorCashDay) ?? ''),
    })
    setRecoverOpen(true)
  }

  async function submitRecoverCash() {
    const priorCashDay = cash.priorCashDay
    const clinics = [
      { branchId: BRANCH_IDS.sanMateo, label: 'San Mateo' },
      { branchId: BRANCH_IDS.pasig, label: 'Pasig' },
      { branchId: BRANCH_IDS.cainta, label: 'Cainta' },
      { branchId: BRANCH_IDS.lipa, label: 'Lipa' },
    ].map((c) => ({
      branchId: c.branchId,
      confirmedEnding: Math.max(0, Number(String(recoverAmounts[c.branchId] ?? '').replace(/[^\d.]/g, '')) || 0),
    }))
    if (clinics.every((c) => c.confirmedEnding <= 0)) {
      toast.error('Enter at least one clinic’s cash on hand amount')
      return
    }
    setRecoverSaving(true)
    try {
      const total = await recoverCompanyCashOnHand({ dateKey: priorCashDay, clinics })
      setCashTick((n) => n + 1)
      setRecoverOpen(false)
      toast.success('Cash on hand recovered', {
        description: `Saved ${formatPesoExact(total)} as prior-day ending (today’s Beginning) for the 4 company clinics.`,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not recover cash on hand')
    } finally {
      setRecoverSaving(false)
    }
  }

  async function submitDeductCash() {
    const amount = Number(String(deductAmount).replace(/[^\d.]/g, ''))
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter exact cash')
      return
    }
    if (amount > cash.ending) {
      toast.error('Deduction cannot exceed ending cash')
      return
    }
    setDeductSaving(true)
    try {
      const nextManual = cash.manualDeducted + amount
      const scope = showCompanyCashOnHand ? HQ_CASH_SCOPE : cashScope
      const cashDay = cash.cashDay
      await writeManualCashDeducted(scope, cashDay, nextManual)
      await writeConfirmedCash(scope, cashDay, cash.ending - amount)
      setCashTick((n) => n + 1)
      setDeductOpen(false)
      setDeductAmount('')
      toast.success('Cash deducted', {
        description: `${formatPesoExact(amount)} removed from ${branchLabel} drawer (saved to Supabase).`,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not deduct cash')
    } finally {
      setDeductSaving(false)
    }
  }

  const rangeLabel = formatRangeLabel(rangeFrom, rangeTo)
  const clinicNetHint =
    'Clinic net from Supabase (doctor’s procedure = clinic net). Not the same as Actual Sales (gross) or Cash on Hand.'
  const actualSalesHint = metrics.isSingleDay
    ? `Gross paid for ${rangeLabel} from Supabase — full customer total, no doctor fee deducted.`
    : `Gross paid across ${metrics.daySpan} days (${rangeLabel}) from Supabase — full customer total, no doctor fee deducted.`
  const monthlySalesHint = `Clinic net month-to-date through ${rangeTo} · ${metrics.monthlyLabel} (server).`
  const medicalProcedureHint = metrics.isSingleDay
    ? `Doctor fees for medical procedures on ${rangeLabel}.`
    : `Doctor fees for medical procedures in ${rangeLabel}.`
  const moneyDisplay = (n: number) =>
    moneyReady ? formatPesoExact(n) : '—'

  return (
    <div className="-mx-1 space-y-6 sm:mx-0">
      <SalesBreakdownModal
        open={Boolean(breakdown)}
        view={breakdown}
        onClose={() => setBreakdown(null)}
      />
      <DoctorFeeBreakdownModal
        open={Boolean(doctorBreakdown)}
        view={doctorBreakdown}
        onClose={() => setDoctorBreakdown(null)}
      />

      {salesRpcError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <p className="font-semibold">Could not load sales from server</p>
          <p className="mt-1 text-rose-800/90">{salesRpcError}</p>
          <button
            type="button"
            className="mt-2 text-xs font-bold uppercase tracking-wide text-rose-950 underline"
            onClick={() => setSalesRpcTick((n) => n + 1)}
          >
            Retry
          </button>
        </div>
      ) : null}
      {!salesRpcError && !moneyReady ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Loading sales totals from Supabase…
        </div>
      ) : null}

      <Dialog
        open={deductOpen}
        onClose={() => {
          if (deductSaving) return
          setDeductOpen(false)
        }}
        title="Deduct Cash"
        description="Please enter exact cash to deduct from today's drawer."
        confirmLabel={deductSaving ? 'Saving…' : 'Deduct Cash'}
        onConfirm={submitDeductCash}
        destructive
      >
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
            Exact cash (₱)
          </span>
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-[#073D2C] outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10"
            placeholder="0.00"
            value={deductAmount}
            onChange={(e) => setDeductAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitDeductCash()
              }
            }}
          />
          <span className="mt-1.5 block text-xs text-slate-500">
            Available ending cash: {formatPesoExact(cash.ending)}
          </span>
        </label>
      </Dialog>

      <Dialog
        open={recoverOpen}
        onClose={() => {
          if (recoverSaving) return
          setRecoverOpen(false)
        }}
        title="Recover clinic cash on hand"
        description="Old balances lived only on each clinic PC. Enter the last Ending cash from San Mateo, Pasig, Cainta, and Lipa (call each branch or open Dashboard once on that clinic computer while online). Amounts save to Supabase as yesterday’s beginning."
        confirmLabel={recoverSaving ? 'Saving…' : 'Save to Supabase'}
        onConfirm={submitRecoverCash}
        wide
      >
        <div className="space-y-3">
          {(
            [
              [BRANCH_IDS.sanMateo, 'San Mateo'],
              [BRANCH_IDS.pasig, 'Pasig'],
              [BRANCH_IDS.cainta, 'Cainta'],
              [BRANCH_IDS.lipa, 'Lipa'],
            ] as const
          ).map(([id, label]) => (
            <label key={id} className="block text-sm">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
                {label} ending (₱)
              </span>
              <input
                type="text"
                inputMode="decimal"
                className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-[#073D2C] outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10"
                placeholder="0.00"
                value={recoverAmounts[id] ?? ''}
                onChange={(e) =>
                  setRecoverAmounts((prev) => ({ ...prev, [id]: e.target.value }))
                }
              />
            </label>
          ))}
          <p className="text-xs text-slate-500">
            Tip: On each clinic PC, open Admin Dashboard while signed in — that also uploads
            local cash confirms to Supabase automatically.
          </p>
        </div>
      </Dialog>

      {/* Welcome */}
      <section className="relative rounded-2xl bg-[#05281F] text-white shadow-[0_16px_40px_rgba(5,40,31,0.28)]">
        {/* Decorative layer only — keep overflow clipped so the date popover can escape */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.28)_0%,transparent_70%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C5A059]/50 to-transparent" />
        </div>
        <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full bg-[#C5A059] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#05281F]">
              {BRAND.name}
            </p>
            <h1 className="mt-3 text-[1.65rem] font-semibold leading-tight tracking-tight text-white sm:text-[1.9rem]">
              Welcome back, {user?.fullName ?? 'Team'}!
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Here is your daily summary, branch performance metrics, and operational highlights.
            </p>
          </div>
          <div className={cn('relative flex flex-wrap items-center gap-2', rangeOpen && 'z-20')}>
            {!branchLocked && !branchOwner && hqView ? (
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none backdrop-blur"
              >
                <option value="all" className="text-slate-900">
                  All Branches
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="text-slate-900">
                    {b.name}
                  </option>
                ))}
              </select>
            ) : null}

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setFromDraft(rangeFrom)
                  setToDraft(rangeTo)
                  setRangeOpen((v) => !v)
                }}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none backdrop-blur hover:bg-white/15"
              >
                <CalendarDays className="h-4 w-4 text-[#C5A059]" />
                <span className="max-w-[14rem] truncate font-medium">{rangeLabel}</span>
              </button>
              {rangeOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="Close date range"
                    className="fixed inset-0 z-10 cursor-default bg-transparent"
                    onClick={() => setRangeOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.28)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Date range
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-medium text-slate-600">
                        From
                        <input
                          type="date"
                          value={fromDraft}
                          max={toDraft || undefined}
                          onChange={(e) => setFromDraft(e.target.value)}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                        />
                      </label>
                      <label className="text-xs font-medium text-slate-600">
                        To
                        <input
                          type="date"
                          value={toDraft}
                          min={fromDraft || undefined}
                          onChange={(e) => setToDraft(e.target.value)}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(
                        [
                          ['today', 'Today'],
                          ['week', 'This week'],
                          ['month', 'This month'],
                          ['lastMonth', 'Last month'],
                        ] as const
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => applyPreset(key)}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-emerald-700/40 hover:bg-emerald-50"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-xl"
                        onClick={() => setRangeOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="gold"
                        className="rounded-xl"
                        onClick={() => applyDateRange()}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C5A059]">
                Branch
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">{branchLabel}</p>
              {branchOwner || forcedBranchId ? (
                <p className="mt-0.5 text-xs text-white/65">{user?.fullName}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Metrics row 1 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={branchOwner ? 'Completed Bookings' : 'Total Bookings'}
          value={moneyReady ? Number(metrics.completedBookings).toLocaleString() : '—'}
          hint={`Distinct sale bookings in ${rangeLabel} (from live system).`}
          tag="Bookings"
          tagTone="amber"
          icon={<CalendarCheck2 className="h-4 w-4" />}
        />
        <StatCard
          title={branchOwner ? (metrics.isSingleDay ? "Today's Patients" : 'Patients') : 'Payments'}
          value={
            moneyReady
              ? String(branchOwner ? metrics.todayPatients : metrics.todayPaymentsCount)
              : '—'
          }
          hint={
            branchOwner
              ? `Clients with a sale in ${rangeLabel} (from live system).`
              : `Sale tickets in ${rangeLabel} (from live system).`
          }
          tag={metrics.isSingleDay ? 'Today' : 'Range'}
          tagTone="sky"
          icon={branchOwner ? <Users className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
        />
        <StatCard
          title="Payment Summary"
          value={moneyDisplay(metrics.paymentSummary)}
          hint={`Clinic net in ${rangeLabel}. ${clinicNetHint}`}
          tag="Clinic net"
          tagTone="amber"
          icon={<Wallet className="h-4 w-4" />}
          onClick={
            moneyReady
              ? () =>
                  openSalesBreakdown(
                    'Payment Summary',
                    `Clinic-recognized payments in ${rangeLabel}`,
                    metrics.rangeSalesLines,
                    'clinic',
                    metrics.paymentSummary,
                  )
              : undefined
          }
          action={
            <Link
              to="/admin/payments"
              className="text-xs font-semibold text-emerald-800 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View All
            </Link>
          }
        />
        <StatCard
          title="Medical Procedure"
          value={moneyDisplay(metrics.medicalProcedureCommission)}
          hint={`${medicalProcedureHint} From live system.`}
          tag="Doctors"
          tagTone="amber"
          icon={<Stethoscope className="h-4 w-4" />}
          onClick={
            moneyReady
              ? () =>
                  openDoctorFeeBreakdown(
                    'Medical Procedure',
                    medicalProcedureHint,
                    metrics.doctorCommissionRows,
                    metrics.medicalProcedureCommission,
                  )
              : undefined
          }
        />
      </div>

      {/* Metrics row 2 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={moneyDisplay(metrics.todaySales)}
          hint={`Clinic net for today (${formatRangeLabel(todayKey, todayKey)}). ${clinicNetHint}`}
          tag="Clinic net"
          tagTone="amber"
          icon={<TrendingUp className="h-4 w-4" />}
          onClick={
            moneyReady
              ? () =>
                  openSalesBreakdown(
                    "Today's Sales",
                    `Clinic-recognized sales for ${formatRangeLabel(todayKey, todayKey)}`,
                    metrics.todaySalesLines,
                    'clinic',
                    metrics.todaySales,
                  )
              : undefined
          }
        />
        <StatCard
          title="Monthly Sales"
          value={moneyDisplay(metrics.monthlySales)}
          hint={monthlySalesHint}
          tag="Clinic net"
          tagTone="amber"
          icon={<Receipt className="h-4 w-4" />}
          onClick={
            moneyReady
              ? () =>
                  openSalesBreakdown(
                    'Monthly Sales',
                    monthlySalesHint,
                    metrics.monthSalesLines,
                    'clinic',
                    metrics.monthlySales,
                  )
              : undefined
          }
        />
        <StatCard
          title="Actual Sales"
          value={moneyDisplay(metrics.actualSales)}
          hint={actualSalesHint}
          tag="Gross paid"
          tagTone="emerald"
          icon={<Receipt className="h-4 w-4" />}
          onClick={
            moneyReady
              ? () =>
                  openSalesBreakdown(
                    'Actual Sales',
                    actualSalesHint,
                    metrics.rangeSalesLines,
                    'gross',
                    metrics.actualSales,
                  )
              : undefined
          }
        />
        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-[#0A2E26] ring-1 ring-slate-200/80">
              <Wallet className="h-4 w-4" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Cash on Hand
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200/70">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Beginning
              </p>
              <p className="mt-1.5 font-metric text-lg font-semibold text-slate-900">
                {formatPesoExact(cash.beginning)}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3.5 py-3 ring-1 ring-emerald-100">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800/70">
                Ending
              </p>
              <p className="mt-1.5 font-metric text-lg font-semibold text-emerald-950">
                {cash.cashReady ? formatPesoExact(cash.ending) : '—'}
              </p>
            </div>
          </div>
          {cash.companyCombined ? (
            <p className="mt-2 text-[11px] font-medium text-[#073D2C]">
              This is the cash on hand on these 4 branches: San Mateo, Pasig, Cainta, and Lipa.
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-slate-500">
            Cash tenders only · 8am–8am Manila. Beginning = prior day&apos;s confirmed Ending (rolls
            over at {CASH_DAY_CUTOVER_HOUR_MANILA}:00 AM). Ending = beginning + cash in
            {cash.cashReady ? ` (${formatPesoExact(cash.cashIn)})` : ' (loading…)'} − cash out.
            Not the same as Actual Sales.
            {cash.expenseCashOut > 0
              ? ` Expenses (${formatPesoExact(cash.expenseCashOut)})`
              : ''}
            {cash.manualDeducted > 0
              ? ` − manual deductions (${formatPesoExact(cash.manualDeducted)})`
              : ''}
            {cash.confirmedToday != null
              ? ' · confirmed for tonight’s carryover'
              : ' · tap Confirm Cash at end of shift so Ending becomes tomorrow’s Beginning'}
            .
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
            <Button type="button" variant="gold" className="rounded-xl" onClick={() => void confirmCash()}>
              Confirm Cash
            </Button>
            {(branchOwner || hqView) ? (
              <Button type="button" variant="secondary" className="rounded-xl" onClick={openDeductCash}>
                <Minus className="mr-1.5 h-3.5 w-3.5" />
                Deduct Cash
              </Button>
            ) : null}
            {cash.companyCombined ? (
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl"
                onClick={openRecoverCash}
              >
                Recover clinic cash
              </Button>
            ) : null}
            <Link
              to="/admin/operations/expenses"
              className="text-xs font-semibold text-slate-500 hover:text-emerald-800"
            >
              Log expense
            </Link>
          </div>
        </div>
      </div>

      {/* HQ: Sales by Branch — all clinics */}
      {hqView && !scopeBranchId ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">Sales by Branch</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Clinic net from Supabase — San Mateo, Cainta, Pasig, Lipa, and franchises.
              </p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#C5A059]">
              {salesByBranch.periodLabel} · Clinic net
            </p>
          </div>
          <div className="mt-5 space-y-3.5">
            {!salesByBranch.ready ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
                {salesRpcError
                  ? 'Could not load branch sales from server.'
                  : 'Loading branch sales from Supabase…'}
              </p>
            ) : salesByBranch.rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
                No branch sales in this range.
              </p>
            ) : (
              salesByBranch.rows.map((row) => (
                <div key={row.id} className="grid gap-2 sm:grid-cols-[11rem_1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {row.bookings.toLocaleString()} bookings ·{' '}
                      {row.clients.toLocaleString()} clients
                    </p>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0A2E26] to-[#C5A059]"
                      style={{ width: `${row.barPct}%` }}
                    />
                  </div>
                  <div className="text-right sm:min-w-[8.5rem]">
                    <p className="font-metric text-sm font-semibold text-slate-900">
                      {formatPesoExact(row.periodSales)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Today {formatPesoExact(row.dailySales)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {/* Birthday banner */}
      <section className="relative overflow-hidden rounded-2xl bg-[#05281F] px-5 py-5 text-white sm:px-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.35)_0%,transparent_70%)]"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Happy Birthday to Our Valued Clients! 🎂
            </h2>
            <p className="mt-1 text-sm font-medium text-[#C5A059]">{branchLabel}</p>
          </div>
          <Gift className="h-12 w-12 text-[#C5A059]" strokeWidth={1.35} />
        </div>
      </section>

      {/* Customer birthdays */}
      <section className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-6">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Customer Birthdays</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Stay connected with your customers on their special day.
          </p>
        </div>
        <BirthdayBlock
          title="Today's Birthdays"
          empty="No customer birthdays today."
          items={customerBirthdays.today}
        />
        <BirthdayBlock
          title="Upcoming Birthdays"
          empty="No upcoming customer birthdays in the next 3 months."
          items={customerBirthdays.upcoming}
        />
      </section>

      {/* Staff birthdays */}
      <section className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-6">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Staff Birthdays</h3>
          <p className="mt-0.5 text-sm text-slate-500">Celebrate your team members.</p>
        </div>
        <BirthdayBlock
          title="Today's Birthdays"
          empty="No staff birthdays today."
          items={staffBirthdays.today}
        />
        <BirthdayBlock
          title="Upcoming Birthdays"
          empty="No upcoming staff birthdays in the next 3 months."
          items={staffBirthdays.upcoming}
        />
      </section>

      <p className="pb-1 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Imajica Medical Aesthetics
      </p>
    </div>
  )
}
