import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, MapPin, Tag, ToggleLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getBranches, subscribeBranches } from '@/services/branchService'
import { getServiceById, saveServiceFromForm } from '@/services/catalogService'
import type { Branch } from '@/types'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'

const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal'
const control =
  'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15'

function Switch({
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition',
        checked ? 'bg-emerald-800' : 'bg-slate-300',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
          checked ? 'left-5' : 'left-0.5',
        )}
      />
    </button>
  )
}

export function NewServicePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('edit')
  const isEdit = Boolean(editId)

  const [branches, setBranches] = useState<Branch[]>(() => getBranches())
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('0')
  const [sessions, setSessions] = useState('1')
  const [active, setActive] = useState(true)
  const [availableGlobally, setAvailableGlobally] = useState(false)
  const [availableBranchIds, setAvailableBranchIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(!isEdit)

  useEffect(() => subscribeBranches(() => setBranches(getBranches())), [])

  useEffect(() => {
    if (!editId) {
      setLoaded(true)
      return
    }
    const existing = getServiceById(editId)
    if (!existing) {
      toast.error('Service not found')
      navigate('/admin/catalog/services', { replace: true })
      return
    }
    setName(existing.name)
    setDescription(existing.description)
    setPrice(String(existing.price))
    setSessions(String(existing.sessions ?? 1))
    setActive(existing.status === 'active')
    const global = Boolean(existing.availableGlobally)
    setAvailableGlobally(global)
    if (global) {
      setAvailableBranchIds(getBranches().map((b) => b.id))
    } else if (existing.availableBranchIds?.length) {
      setAvailableBranchIds([...existing.availableBranchIds])
    } else if (existing.branchId) {
      setAvailableBranchIds([existing.branchId])
    } else {
      setAvailableBranchIds([])
    }
    setLoaded(true)
  }, [editId, navigate])

  const priceNum = Number(price) || 0
  const sessionsNum = Math.max(1, Number(sessions) || 1)

  const previewName = name.trim() || 'New Service Name'
  const previewDesc =
    description.trim() || 'Provide a description to see how it displays here...'

  const activeBranches = useMemo(
    () => branches.filter((b) => b.status === 'active'),
    [branches],
  )

  function setGlobal(next: boolean) {
    setAvailableGlobally(next)
    if (next) {
      setAvailableBranchIds(activeBranches.map((b) => b.id))
    }
  }

  function toggleBranch(id: string, on: boolean) {
    if (availableGlobally) return
    setAvailableBranchIds((prev) => {
      if (on) return prev.includes(id) ? prev : [...prev, id]
      return prev.filter((x) => x !== id)
    })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Service name is required')
      return
    }
    if (!availableGlobally && availableBranchIds.length === 0) {
      toast.error('Select at least one branch, or turn on Global')
      return
    }
    setSaving(true)
    try {
      saveServiceFromForm(editId ?? undefined, {
        name,
        description,
        price: priceNum,
        sessions: sessionsNum,
        status: active ? 'active' : 'inactive',
        availableGlobally,
        availableBranchIds: availableGlobally
          ? activeBranches.map((b) => b.id)
          : availableBranchIds,
      })
      toast.success(isEdit ? 'Service updated' : 'Service saved')
      navigate('/admin/catalog/services')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return <p className="text-sm text-slate-ui">Loading service…</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C5A059]">
          Catalog · Services & Packages
        </p>
        <h1 className="font-display text-4xl text-[#073D2C]">
          {isEdit ? 'Edit Service' : 'Service Management'}
        </h1>
        <p className="text-sm text-slate-ui">
          {isEdit
            ? 'Modify service details and availabilities for your branches.'
            : 'Create and manage clinic service offerings.'}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 text-[#C5A059]" />
              <div>
                <h2 className="font-semibold text-[#073D2C]">Service Details</h2>
                <p className="text-sm text-slate-ui">
                  Provide the service name and a detailed description to describe the offering
                  clearly.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className={label}>Service Name</span>
                <input
                  className={control}
                  placeholder="Enter Service Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className={label}>Description</span>
                <textarea
                  className="min-h-[100px] w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
                  placeholder="Describe what is included in this service..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-start gap-2">
              <Tag className="mt-0.5 h-4 w-4 text-[#C5A059]" />
              <div>
                <h2 className="font-semibold text-[#073D2C]">Pricing & Sessions</h2>
                <p className="text-sm text-slate-ui">
                  Set the service cost and the number of sessions included.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={label}>Service Cost</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-ui">
                    ₱
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={cn(control, 'pl-7')}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </label>
              <label className="block">
                <span className={label}>Sessions</span>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    className={cn(control, 'pr-20')}
                    value={sessions}
                    onChange={(e) => setSessions(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-ui">
                    Sessions
                  </span>
                </div>
              </label>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-[16px] bg-[#073D2C] p-6 text-white shadow-[0_14px_36px_rgba(7,61,44,0.25)]">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                Service card preview
              </p>
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]',
                  active ? 'bg-[#E8D9B8] text-[#073D2C]' : 'bg-white/15 text-white/80',
                )}
              >
                {active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h3 className="mt-4 font-display text-[1.65rem] font-semibold leading-tight text-[#E8D9B8]">
              {previewName}
            </h3>
            <p className="mt-2 text-sm text-white/80">{previewDesc}</p>
            <div className="mt-8 flex items-end justify-between gap-3">
              <p className="font-metric text-3xl font-semibold tracking-tight text-white">
                {formatPeso(priceNum)}
              </p>
              <span className="rounded-full bg-black/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
                {sessionsNum} Session{sessionsNum === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <ToggleLeft className="h-4 w-4 text-[#C5A059]" />
              <h2 className="font-semibold text-[#073D2C]">Service Settings</h2>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Active Status</p>
                <p className="text-xs text-slate-ui">Control if this service is viewable.</p>
              </div>
              <Switch
                checked={active}
                onChange={setActive}
                ariaLabel="Active status"
              />
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#C5A059]" />
              <h2 className="font-semibold text-[#073D2C]">Branch Availability</h2>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-ivory-100/80 px-3 py-3">
              <div>
                <p className="text-sm font-semibold text-[#073D2C]">Global (All Branches)</p>
                <p className="text-xs text-slate-ui">
                  Make this service available across all current and future branches.
                </p>
              </div>
              <Switch
                checked={availableGlobally}
                onChange={setGlobal}
                ariaLabel="Global all branches"
              />
            </div>

            <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {activeBranches.length === 0 ? (
                <li className="rounded-[10px] border border-dashed border-border px-3 py-4 text-center text-xs text-slate-ui">
                  No branches yet. Add branches under Team → Branches.
                </li>
              ) : (
                activeBranches.map((b) => {
                  const on = availableGlobally || availableBranchIds.includes(b.id)
                  return (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-white px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#073D2C]">
                          {b.name.replace(/ Branch$/, '')}
                        </p>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-ui">
                          {b.code}
                        </p>
                      </div>
                      <Switch
                        checked={on}
                        disabled={availableGlobally}
                        onChange={(next) => toggleBranch(b.id, next)}
                        ariaLabel={`${b.name} availability`}
                      />
                    </li>
                  )
                })
              )}
            </ul>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Link to="/admin/catalog/services">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update Service' : 'Save Service'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
