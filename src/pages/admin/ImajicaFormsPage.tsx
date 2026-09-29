import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ChevronDown,
  Download,
  Eye,
  FilePenLine,
  History,
  Search,
  Settings2,
  Trash2,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { SignaturePad } from '@/components/forms/SignaturePad'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  formPdfUrl,
  getFormTemplate,
  IMAJICA_FORM_TEMPLATES,
  type FormFieldDef,
} from '@/constants/imajicaFormTemplates'
import {
  createGeneratedForm,
  deleteGeneratedForm,
  downloadGeneratedPacket,
  getGeneratedForms,
  subscribeGeneratedForms,
  type GeneratedFormRecord,
} from '@/services/imajicaFormsService'
import { cn } from '@/utils/cn'

function formatSubmitted(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ImajicaFormsPage() {
  const [templateId, setTemplateId] = useState(IMAJICA_FORM_TEMPLATES[0]?.id ?? '')
  const [patientName, setPatientName] = useState('')
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [clientSig, setClientSig] = useState('')
  const [otherSig, setOtherSig] = useState('')
  const [primaryOpen, setPrimaryOpen] = useState(true)
  const [assessmentOpen, setAssessmentOpen] = useState(false)
  const [history, setHistory] = useState(() => getGeneratedForms())
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<GeneratedFormRecord | null>(null)

  const template = getFormTemplate(templateId) ?? IMAJICA_FORM_TEMPLATES[0]

  useEffect(() => subscribeGeneratedForms(() => setHistory(getGeneratedForms())), [])

  useEffect(() => {
    setValues({})
    setClientSig('')
    setOtherSig('')
    setPrimaryOpen(true)
    setAssessmentOpen(false)
  }, [templateId])

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return history
    const q = search.toLowerCase()
    return history.filter(
      (h) =>
        h.clientName.toLowerCase().includes(q) ||
        h.formType.toLowerCase().includes(q) ||
        h.branch.toLowerCase().includes(q),
    )
  }, [history, search])

  function setField(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleGenerate() {
    if (!template) return
    if (!patientName.trim()) {
      toast.error('Enter patient/client name for signature')
      return
    }
    if (!clientSig) {
      toast.error('Client signature is required')
      return
    }
    const record = createGeneratedForm({
      template,
      clientName: patientName,
      fieldValues: values,
      clientSignature: clientSig,
      otherSignature: template.otherSignature ? otherSig || undefined : undefined,
    })
    toast.success(`Generated ${record.formType}`)
    downloadGeneratedPacket(record)
    setPatientName('')
    setValues({})
    setClientSig('')
    setOtherSig('')
  }

  function handleDelete(row: GeneratedFormRecord) {
    if (!window.confirm(`Delete form for ${row.clientName}?`)) return
    deleteGeneratedForm(row.id)
    toast.success('Form deleted')
  }

  const hasPrimary = !!template?.primaryFields?.length
  const hasAssessment = !!template?.assessmentFields?.length
  const hasMeta = !!template?.metaFields?.length

  return (
    <div className="space-y-5">
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <FilePenLine className="h-5 w-5 text-emerald-800" />
          <h1 className="text-lg font-bold text-charcoal sm:text-xl">Create New Consent Form</h1>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="mb-1.5 block font-bold uppercase tracking-[0.12em] text-charcoal">
              Choose Consent Form Template
            </span>
            <select
              className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {IMAJICA_FORM_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1.5 block font-bold uppercase tracking-[0.12em] text-charcoal">
              Patient/Client Name
            </span>
            <input
              className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm"
              placeholder="Enter Patient/Client Name for Signature"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
          </label>
        </div>

        {hasMeta ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {template.metaFields!.map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                value={values[f.key]}
                onChange={(v) => setField(f.key, v)}
              />
            ))}
          </div>
        ) : null}

        {hasPrimary ? (
          <Accordion
            title="Part 1: Primary Details"
            open={primaryOpen}
            onToggle={() => setPrimaryOpen((v) => !v)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {template.primaryFields!.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={values[f.key]}
                  onChange={(v) => setField(f.key, v)}
                />
              ))}
            </div>
          </Accordion>
        ) : null}

        {hasAssessment ? (
          <Accordion
            title="Part 2: Assessment & History"
            open={assessmentOpen}
            onToggle={() => setAssessmentOpen((v) => !v)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {template.assessmentFields!.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={values[f.key]}
                  onChange={(v) => setField(f.key, v)}
                />
              ))}
            </div>
          </Accordion>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-ui">
              Template Document Preview
            </p>
            <div className="overflow-hidden rounded-[10px] border border-border bg-[#525659]">
              <iframe
                title="Form template preview"
                src={formPdfUrl(template.fileName)}
                className="h-[520px] w-full bg-white"
              />
            </div>
          </div>
          <div className="space-y-4">
            <SignaturePad label="Client Signature" value={clientSig} onChange={setClientSig} />
            {template.otherSignature ? (
              <SignaturePad
                label="Other Signature"
                value={otherSig}
                onChange={setOtherSig}
                clearLabel="Clear"
              />
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleGenerate}>
            <Settings2 className="h-4 w-4" /> Generate Final PDF
          </Button>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-emerald-800" />
          <h2 className="text-lg font-bold text-charcoal">Generated Forms History</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-ui" />
            <input
              className="h-10 w-full rounded-[10px] border border-border pl-9 pr-3 text-sm"
              placeholder="Search client name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSearch(query)
              }}
            />
          </div>
          <Button onClick={() => setSearch(query)}>Search</Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] font-bold uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Client Name</th>
                <th className="px-2 py-3">Form Type</th>
                <th className="px-2 py-3">Branch</th>
                <th className="px-2 py-3">Date Submitted</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((row) => (
                <tr key={row.id} className="border-t border-border/70 hover:bg-ivory-100">
                  <td className="px-2 py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-[#073D2C]">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
                        <UserRound className="h-3.5 w-3.5" />
                      </span>
                      {row.clientName}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <Badge variant="info">{row.formType}</Badge>
                  </td>
                  <td className="px-2 py-3 text-slate-ui">{row.branch}</td>
                  <td className="px-2 py-3 text-slate-ui">{formatSubmitted(row.submittedAt)}</td>
                  <td className="px-2 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewing(row)}
                        className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-border bg-white px-2.5 text-xs font-medium text-charcoal hover:bg-ivory-100"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          downloadGeneratedPacket(row)
                          toast.success('Download started')
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-[#C5A059] px-2.5 text-xs font-medium text-white hover:brightness-105"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-rose-600 px-2.5 text-xs font-medium text-white hover:bg-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredHistory.length ? (
                <tr>
                  <td colSpan={5} className="px-2 py-10 text-center text-slate-ui">
                    No generated forms found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-emerald-950/40"
            aria-label="Close"
            onClick={() => setViewing(null)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[14px] bg-white p-5 shadow-xl">
            <h3 className="font-display text-2xl text-[#073D2C]">{viewing.formType}</h3>
            <p className="text-sm text-slate-ui">
              {viewing.clientName} · {viewing.branch} · {formatSubmitted(viewing.submittedAt)}
            </p>
            <iframe
              title="Template"
              src={formPdfUrl(viewing.templateFile)}
              className="mt-4 h-72 w-full rounded-[10px] border border-border"
            />
            {viewing.clientSignature ? (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase text-slate-ui">Client Signature</p>
                <img
                  src={viewing.clientSignature}
                  alt="Client signature"
                  className="mt-1 max-h-32 rounded border border-border"
                />
              </div>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setViewing(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  downloadGeneratedPacket(viewing)
                  toast.success('Download started')
                }}
              >
                <Download className="h-4 w-4" /> Download
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-[10px] border border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-[#F3F1EC] px-4 py-3 text-left text-sm font-semibold text-charcoal"
      >
        {title}
        <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
      </button>
      {open ? <div className="p-4">{children}</div> : null}
    </div>
  )
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormFieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const control =
    'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15'

  if (field.type === 'yes-no-family') {
    const current = (value as { client?: string; family?: string; comments?: string }) ?? {}
    return (
      <div className={cn(field.fullWidth && 'sm:col-span-2')}>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal">
          {field.label}
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.2fr]">
          <YesNo
            label="Client"
            value={current.client}
            onChange={(v) => onChange({ ...current, client: v })}
          />
          <YesNo
            label="Family"
            value={current.family}
            onChange={(v) => onChange({ ...current, family: v })}
          />
          <label className="block text-xs">
            <span className="mb-1 block font-bold uppercase text-slate-ui">Comments</span>
            <input
              className={control}
              value={current.comments ?? ''}
              onChange={(e) => onChange({ ...current, comments: e.target.value })}
            />
          </label>
        </div>
      </div>
    )
  }

  if (field.type === 'checkbox-group') {
    const selected = Array.isArray(value) ? (value as string[]) : []
    return (
      <div className={cn('sm:col-span-2')}>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal">
          {field.label}
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(field.choices ?? []).map((c) => {
            const checked = selected.includes(c)
            return (
              <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange(checked ? selected.filter((x) => x !== c) : [...selected, c])
                  }
                />
                {c}
              </label>
            )
          })}
        </div>
      </div>
    )
  }

  if (field.type === 'radio') {
    return (
      <div className={cn(field.fullWidth && 'sm:col-span-2')}>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal">
          {field.label}
        </p>
        <div className="flex flex-wrap gap-4">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="inline-flex cursor-pointer items-center gap-2 text-sm capitalize">
              <input
                type="radio"
                name={field.key}
                checked={value === opt}
                onChange={() => onChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <label className={cn('block text-xs', field.fullWidth && 'sm:col-span-2')}>
        <span className="mb-1.5 block font-bold uppercase tracking-[0.12em] text-charcoal">
          {field.label}
        </span>
        <textarea
          className="min-h-[88px] w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      </label>
    )
  }

  return (
    <label className={cn('block text-xs', field.fullWidth && 'sm:col-span-2')}>
      <span className="mb-1.5 block font-bold uppercase tracking-[0.12em] text-charcoal">
        {field.label}
      </span>
      <input
        type={field.type === 'date' ? 'date' : 'text'}
        className={control}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
      />
    </label>
  )
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string
  value?: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase text-slate-ui">{label}</p>
      <div className="flex gap-3 text-sm">
        {['yes', 'no'].map((opt) => (
          <label key={opt} className="inline-flex cursor-pointer items-center gap-1.5 capitalize">
            <input
              type="radio"
              checked={value === opt}
              onChange={() => onChange(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  )
}
