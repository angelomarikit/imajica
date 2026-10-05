import { useEffect, useMemo, useState } from 'react'
import { HandCoins, Pencil, Search, Sparkles, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { KpiCard } from '@/components/ui/KpiCard'
import { getBranches } from '@/services/branchService'
import {
  employeeStatutoryMonthly,
  employerBenefitMonthly,
  listPayrollProfilesForHr,
  monthlyBasicSalary,
  savePayrollProfile,
  subscribePayrollProfiles,
  suggestPhilhealthFromDaily,
  type PayrollProfileRecord,
} from '@/services/payrollProfileService'
import { formatPesoExact } from '@/utils/currency'
import { cn } from '@/utils/cn'

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-[#073D2C] outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10'
const labelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-ui'

type EditTab = 'pay' | 'deductions' | 'benefits' | 'ids'

export function HrDeductionsPage() {
  const [profiles, setProfiles] = useState<PayrollProfileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [branchId, setBranchId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [editing, setEditing] = useState<PayrollProfileRecord | null>(null)
  const [draft, setDraft] = useState<PayrollProfileRecord | null>(null)
  const [tab, setTab] = useState<EditTab>('deductions')
  const [saving, setSaving] = useState(false)

  const branches = useMemo(
    () => getBranches().filter((b) => b.status === 'active' && b.branchType !== 'warehouse'),
    [],
  )

  async function refresh() {
    setLoading(true)
    try {
      setProfiles(await listPayrollProfilesForHr())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payroll profiles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    return subscribePayrollProfiles(() => {
      void refresh()
    })
  }, [])

  const filtered = useMemo(() => {
    let list = profiles.filter((p) => p.status === 'active')
    if (branchId) list = list.filter((p) => p.branchId === branchId)
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((p) => {
      const hay = `${p.fullName} ${p.email} ${p.branchLabel} ${p.jobTitle} ${p.sssNo}`.toLowerCase()
      return hay.includes(q)
    })
  }, [profiles, query, branchId])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageStart = (safePage - 1) * pageSize
  const pageRows = filtered.slice(pageStart, pageStart + pageSize)

  const totals = useMemo(() => {
    const deductions = filtered.reduce((s, p) => s + employeeStatutoryMonthly(p), 0)
    const benefits = filtered.reduce((s, p) => s + employerBenefitMonthly(p) + (p.allowance || 0), 0)
    const configured = filtered.filter((p) => employeeStatutoryMonthly(p) > 0 || p.salaryPerDay > 0).length
    return { deductions, benefits, configured }
  }, [filtered])

  function openEdit(p: PayrollProfileRecord) {
    setEditing(p)
    setDraft({ ...p })
    setTab('deductions')
  }

  function closeEdit() {
    setEditing(null)
    setDraft(null)
  }

  function patch<K extends keyof PayrollProfileRecord>(key: K, value: PayrollProfileRecord[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
  }

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    try {
      const saved = await savePayrollProfile(draft)
      toast.success(`Saved recurring rates for ${saved.fullName}`)
      closeEdit()
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  function applyPhilhealthSuggestion() {
    if (!draft) return
    const share = suggestPhilhealthFromDaily(draft.salaryPerDay)
    setDraft({ ...draft, philhealthEmployee: share, philhealthEmployer: share })
    toast.message(`PhilHealth set to 2.5% of MBS (${formatPesoExact(share)})`)
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title="Deductions & Benefits"
        description="Recurring monthly statutory deductions and employer benefits for every employee — these feed Salary / payslips. Click a person to edit; no long forms."
        stat={{ value: totals.configured, label: 'Configured' }}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Employee deductions / mo"
          value={formatPesoExact(totals.deductions)}
          subtext="SSS + MPF + Pag-IBIG + PhilHealth + other"
          icon={<HandCoins className="h-5 w-5" />}
        />
        <KpiCard
          label="Employer + allowances / mo"
          value={formatPesoExact(totals.benefits)}
          subtext="Employer shares + recurring allowances"
          icon={<Sparkles className="h-5 w-5" />}
        />
        <KpiCard
          label="Employees listed"
          value={String(filtered.length)}
          subtext="From directory + payroll master"
          icon={<Wallet className="h-5 w-5" />}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-ui">
            Branch
            <select
              className="mt-1 block min-w-[180px] rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All clinics</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-ui">
            Per page
            <select
              className="mt-1 block min-w-[100px] rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
            >
              {[12, 24, 48].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search employee, branch, SSS no…"
              className="w-full rounded-[10px] border border-border bg-white py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-center text-sm text-slate-ui">Loading employees…</p>
        ) : pageRows.length === 0 ? (
          <p className="mt-8 text-center text-sm text-slate-ui">No employees match.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pageRows.map((p) => {
              const ded = employeeStatutoryMonthly(p)
              const ben = employerBenefitMonthly(p) + (p.allowance || 0)
              const ready = p.salaryPerDay > 0 || ded > 0
              return (
                <button
                  key={p.id + p.email}
                  type="button"
                  onClick={() => openEdit(p)}
                  className="rounded-[14px] border border-border bg-white p-4 text-left shadow-[0_1px_3px_rgba(10,46,38,0.04)] transition hover:border-emerald-800/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#073D2C]">{p.fullName}</p>
                      <p className="truncate text-[11px] text-slate-ui">
                        {p.jobTitle} · {p.branchLabel || '—'}
                      </p>
                    </div>
                    <Badge variant={ready ? 'success' : 'warning'}>{ready ? 'Set' : 'Needs setup'}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-[10px] bg-ivory-50 px-2.5 py-2">
                      <p className="text-slate-ui">Daily rate</p>
                      <p className="font-semibold text-[#073D2C]">{formatPesoExact(p.salaryPerDay)}</p>
                    </div>
                    <div className="rounded-[10px] bg-ivory-50 px-2.5 py-2">
                      <p className="text-slate-ui">MBS (×26)</p>
                      <p className="font-semibold text-[#073D2C]">
                        {formatPesoExact(monthlyBasicSalary(p.salaryPerDay))}
                      </p>
                    </div>
                    <div className="rounded-[10px] bg-red-50/60 px-2.5 py-2">
                      <p className="text-slate-ui">Deductions / mo</p>
                      <p className="font-semibold text-red-800">{formatPesoExact(ded)}</p>
                    </div>
                    <div className="rounded-[10px] bg-emerald-50/70 px-2.5 py-2">
                      <p className="text-slate-ui">Benefits / mo</p>
                      <p className="font-semibold text-emerald-900">{formatPesoExact(ben)}</p>
                    </div>
                  </div>
                  <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-900">
                    <Pencil className="h-3 w-3" /> Edit rates
                  </p>
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-ui">
          <span>
            Showing {filtered.length === 0 ? 0 : pageStart + 1}–
            {Math.min(pageStart + pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 min-w-8 rounded-[6px] border border-border bg-white px-2 disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(pageCount, 6) }, (_, i) => {
              let n = i + 1
              if (pageCount > 6 && safePage > 3) n = Math.min(pageCount - 5, safePage - 2) + i
              if (n < 1 || n > pageCount) return null
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    'h-8 min-w-8 rounded-[6px] border px-2 font-medium',
                    n === safePage
                      ? 'border-emerald-900 bg-emerald-900 text-white'
                      : 'border-border bg-white',
                  )}
                >
                  {n}
                </button>
              )
            })}
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="h-8 min-w-8 rounded-[6px] border border-border bg-white px-2 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </Card>

      <Drawer
        open={Boolean(editing && draft)}
        onClose={closeEdit}
        title={draft?.fullName || 'Edit deductions'}
        widthClass="w-full max-w-lg"
        footer={
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeEdit}>
              Cancel
            </Button>
            <Button type="button" className="flex-1" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Saving…' : 'Save for salary'}
            </Button>
          </div>
        }
      >
        {draft ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-ui">
              {draft.jobTitle} · {draft.branchLabel || '—'} · {draft.email}
            </p>

            <div className="flex flex-wrap gap-1 rounded-[10px] bg-ivory-100 p-1">
              {(
                [
                  ['pay', 'Pay'],
                  ['deductions', 'Deductions'],
                  ['benefits', 'Benefits'],
                  ['ids', 'IDs'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    'flex-1 rounded-[8px] px-2 py-2 text-xs font-semibold',
                    tab === id ? 'bg-white text-[#073D2C] shadow-sm' : 'text-slate-ui',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'pay' ? (
              <div className="space-y-3">
                <label className="block">
                  <span className={labelClass}>Salary per day (₱)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={fieldClass}
                    value={draft.salaryPerDay}
                    onChange={(e) => patch('salaryPerDay', Number(e.target.value) || 0)}
                  />
                </label>
                <div className="rounded-[10px] border border-border bg-ivory-50 p-3 text-sm">
                  <p className="text-slate-ui">Monthly basic salary (rate × 26)</p>
                  <p className="font-semibold text-[#073D2C]">
                    {formatPesoExact(monthlyBasicSalary(draft.salaryPerDay))}
                  </p>
                </div>
                <label className="block">
                  <span className={labelClass}>Recurring allowance / benefit (₱ / mo)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={fieldClass}
                    value={draft.allowance}
                    onChange={(e) => patch('allowance', Number(e.target.value) || 0)}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Job title</span>
                  <input
                    className={fieldClass}
                    value={draft.jobTitle}
                    onChange={(e) => patch('jobTitle', e.target.value)}
                  />
                </label>
              </div>
            ) : null}

            {tab === 'deductions' ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-ui">
                  Monthly employee shares — prorated into each salary run.
                </p>
                <MoneyField
                  label="SSS (employee)"
                  value={draft.sssEmployee}
                  onChange={(v) => patch('sssEmployee', v)}
                />
                <MoneyField
                  label="MPF (employee)"
                  value={draft.mpfEmployee}
                  onChange={(v) => patch('mpfEmployee', v)}
                />
                <MoneyField
                  label="Pag-IBIG (employee)"
                  value={draft.pagibigEmployee}
                  onChange={(v) => patch('pagibigEmployee', v)}
                />
                <MoneyField
                  label="PhilHealth (employee)"
                  value={draft.philhealthEmployee}
                  onChange={(v) => patch('philhealthEmployee', v)}
                />
                <Button type="button" variant="secondary" onClick={applyPhilhealthSuggestion}>
                  Suggest PhilHealth = 2.5% of MBS
                </Button>
                <MoneyField
                  label="Other recurring deduction"
                  value={draft.otherDeduction}
                  onChange={(v) => patch('otherDeduction', v)}
                />
                <div className="rounded-[10px] bg-red-50 px-3 py-2 text-sm">
                  <span className="text-slate-ui">Total employee deductions / mo · </span>
                  <strong className="text-red-800">{formatPesoExact(employeeStatutoryMonthly(draft))}</strong>
                </div>
              </div>
            ) : null}

            {tab === 'benefits' ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-ui">
                  Monthly employer contributions (company benefit side of the same remittances).
                </p>
                <MoneyField
                  label="SSS (employer)"
                  value={draft.sssEmployer}
                  onChange={(v) => patch('sssEmployer', v)}
                />
                <MoneyField
                  label="MPF (employer)"
                  value={draft.mpfEmployer}
                  onChange={(v) => patch('mpfEmployer', v)}
                />
                <MoneyField
                  label="EC (employer)"
                  value={draft.ecEmployer}
                  onChange={(v) => patch('ecEmployer', v)}
                />
                <MoneyField
                  label="Pag-IBIG (employer)"
                  value={draft.pagibigEmployer}
                  onChange={(v) => patch('pagibigEmployer', v)}
                />
                <MoneyField
                  label="PhilHealth (employer)"
                  value={draft.philhealthEmployer}
                  onChange={(v) => patch('philhealthEmployer', v)}
                />
                <div className="rounded-[10px] bg-emerald-50 px-3 py-2 text-sm">
                  <span className="text-slate-ui">Total employer benefits / mo · </span>
                  <strong className="text-emerald-900">
                    {formatPesoExact(employerBenefitMonthly(draft))}
                  </strong>
                </div>
              </div>
            ) : null}

            {tab === 'ids' ? (
              <div className="space-y-3">
                <label className="block">
                  <span className={labelClass}>TIN</span>
                  <input className={fieldClass} value={draft.tin} onChange={(e) => patch('tin', e.target.value)} />
                </label>
                <label className="block">
                  <span className={labelClass}>SSS number</span>
                  <input className={fieldClass} value={draft.sssNo} onChange={(e) => patch('sssNo', e.target.value)} />
                </label>
                <label className="block">
                  <span className={labelClass}>Pag-IBIG number</span>
                  <input
                    className={fieldClass}
                    value={draft.pagibigNo}
                    onChange={(e) => patch('pagibigNo', e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>PhilHealth number</span>
                  <input
                    className={fieldClass}
                    value={draft.philhealthNo}
                    onChange={(e) => patch('philhealthNo', e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Notes</span>
                  <textarea
                    className={cn(fieldClass, 'min-h-[80px] resize-y')}
                    value={draft.notes || ''}
                    onChange={(e) => patch('notes', e.target.value)}
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        min={0}
        step="0.01"
        className={fieldClass}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </label>
  )
}
