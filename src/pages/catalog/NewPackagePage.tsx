import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Tag, ToggleLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { demoBranches } from '@/constants/demoData'
import { createPackage, getServices } from '@/services/catalogService'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'

const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal'
const control =
  'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15'

export function NewPackagePage() {
  const navigate = useNavigate()
  const services = useMemo(() => getServices().filter((s) => s.status === 'active'), [])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [branchId, setBranchId] = useState(demoBranches[0]?.id ?? '')
  const [included, setIncluded] = useState<string[]>([])
  const [freeItems, setFreeItems] = useState('')
  const [price, setPrice] = useState('0')
  const [sessions, setSessions] = useState('1')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const branch = demoBranches.find((b) => b.id === branchId)
  const priceNum = Number(price) || 0
  const sessionsNum = Math.max(1, Number(sessions) || 1)
  const previewName = name.trim() || 'Package Name'
  const previewDesc =
    description.trim() || 'Provide a description to see how it displays here...'

  function toggleInclude(id: string) {
    setIncluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Package name is required')
      return
    }
    if (!branch) {
      toast.error('Select a branch')
      return
    }
    setSaving(true)
    try {
      createPackage({
        name,
        description,
        branchId: branch.id,
        branchName: branch.name.replace(/ Branch$/, ''),
        price: priceNum,
        sessions: sessionsNum,
        status: active ? 'active' : 'inactive',
        includedTreatmentIds: included,
        freeItems,
      })
      toast.success('Package saved')
      navigate('/admin/catalog/packages')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C5A059]">
          Catalog · Services & Packages
        </p>
        <h1 className="font-display text-4xl text-[#073D2C]">Package Management</h1>
        <p className="text-sm text-slate-ui">Create and manage treatment packages.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 text-[#C5A059]" />
              <div>
                <h2 className="font-semibold text-[#073D2C]">Package Details</h2>
                <p className="text-sm text-slate-ui">
                  Provide the package name, description, package contents, and free items.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className={label}>Package Name</span>
                <input
                  className={control}
                  placeholder="Enter package name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className={label}>Description</span>
                <textarea
                  className="min-h-[100px] w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
                  placeholder="Describe this package..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={label}>Branch</span>
                <select
                  className={control}
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  {demoBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name.replace(/ Branch$/, '')}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className={label}>Inclusions</span>
                <p className="mb-2 text-xs text-slate-ui">Select services to include</p>
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-[10px] border border-border p-2">
                  {services.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-sm hover:bg-ivory-100"
                    >
                      <input
                        type="checkbox"
                        checked={included.includes(s.id)}
                        onChange={() => toggleInclude(s.id)}
                      />
                      <span className="flex-1">{s.name}</span>
                      <span className="text-xs text-slate-ui">{formatPeso(s.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className={label}>Free Items / Services</span>
                <input
                  className={control}
                  placeholder="e.g. Free consultation"
                  value={freeItems}
                  onChange={(e) => setFreeItems(e.target.value)}
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
                  Set the package price and the number of sessions included.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={label}>Price</span>
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
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-[1.75rem] font-semibold leading-tight">
                {previewName}
              </h3>
              <span
                className={cn(
                  'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]',
                  active
                    ? 'border-[#C5A059] bg-[#C5A059]/15 text-[#E8D9B8]'
                    : 'border-white/30 text-white/70',
                )}
              >
                {active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="mt-3 text-sm text-white/80">{previewDesc}</p>
            {freeItems.trim() ? (
              <p className="mt-3 text-xs text-[#E8D9B8]/90">Includes: {freeItems}</p>
            ) : null}
            <div className="mt-8 flex items-end justify-between gap-3">
              <p className="font-metric text-3xl font-semibold tracking-tight text-[#E8D9B8]">{formatPeso(priceNum)}</p>
              <span className="rounded-full bg-black/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
                {sessionsNum} Session{sessionsNum === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <ToggleLeft className="h-4 w-4 text-[#C5A059]" />
              <h2 className="font-semibold text-[#073D2C]">Package Settings</h2>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Active Status</p>
                <p className="text-xs text-slate-ui">Control if this package is viewable.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setActive((v) => !v)}
                className={cn(
                  'relative h-7 w-12 rounded-full transition',
                  active ? 'bg-emerald-800' : 'bg-slate-300',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
                    active ? 'left-5' : 'left-0.5',
                  )}
                />
              </button>
            </div>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Link to="/admin/catalog/packages">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Package'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
