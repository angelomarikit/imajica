import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useForcedBranchId } from '@/hooks/useEffectiveBranchId'
import { getBranches } from '@/services/branchService'
import { getPackagesCatalog, getServices } from '@/services/catalogService'
import {
  createCoupon,
  getCouponById,
  updateCoupon,
} from '@/services/couponService'
import type { CouponDiscountType } from '@/types'
import { cn } from '@/utils/cn'
import { isFranchiseBranchOwner } from '@/utils/franchiseAccess'

const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal'
const control =
  'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal placeholder:text-slate-ui/70 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15'

function Required() {
  return <span className="text-red-500"> *</span>
}

export function NewCouponPage() {
  const { pathname } = useLocation()
  const couponBase = pathname.includes('/admin/marketing/')
    ? '/admin/marketing/offers'
    : '/admin/catalog/promotions'
  const navigate = useNavigate()
  const { user } = useAuth()
  const franchiseOwner = isFranchiseBranchOwner(user)
  const forcedBranchId = useForcedBranchId()
  const [params] = useSearchParams()
  const editId = params.get('edit')
  const existing = editId ? getCouponById(editId) : undefined

  const branchOptions = useMemo(() => getBranches().filter((b) => b.status === 'active'), [])
  const services = useMemo(() => getServices().filter((s) => s.status === 'active'), [])
  const packages = useMemo(() => getPackagesCatalog().filter((p) => p.status === 'active'), [])

  const [code, setCode] = useState(existing?.code ?? '')
  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [discountType, setDiscountType] = useState<CouponDiscountType>(
    existing?.discountType ?? 'fixed',
  )
  const [discountValue, setDiscountValue] = useState(
    existing ? String(existing.discountValue) : '',
  )
  const [serviceId, setServiceId] = useState(existing?.serviceId ?? '')
  const [packageId, setPackageId] = useState(existing?.packageId ?? '')
  const [validFrom, setValidFrom] = useState(existing?.validFrom ?? '')
  const [validUntil, setValidUntil] = useState(existing?.validUntil ?? '')
  const [newCustomersOnly, setNewCustomersOnly] = useState(existing?.newCustomersOnly ?? true)
  const [branchId, setBranchId] = useState(
    existing?.branchId ?? forcedBranchId ?? branchOptions[0]?.id ?? '',
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (forcedBranchId) setBranchId(forcedBranchId)
  }, [forcedBranchId])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!code.trim() || !name.trim()) {
      toast.error('Coupon code and name are required')
      return
    }
    if (!discountValue || Number(discountValue) < 0) {
      toast.error('Discount value is required')
      return
    }
    if (!validFrom || !validUntil) {
      toast.error('Validity period is required')
      return
    }
    if (validUntil < validFrom) {
      toast.error('End date must be after start date')
      return
    }

    const branch = branchOptions.find((b) => b.id === branchId)
    const service = services.find((s) => s.id === serviceId)
    const pkg = packages.find((p) => p.id === packageId)

    setSaving(true)
    try {
      const payload = {
        code,
        name,
        description,
        discountType,
        discountValue: Number(discountValue) || 0,
        serviceId: service?.id,
        serviceName: service?.name,
        packageId: pkg?.id,
        packageName: pkg?.name,
        branchId: branch?.id,
        branchName: branch ? branch.name.replace(/ Branch$/, '') : 'All Branches',
        validFrom,
        validUntil,
        newCustomersOnly,
      }
      if (editId && existing) {
        updateCoupon(editId, payload)
        toast.success('Coupon updated')
      } else {
        createCoupon(payload)
        toast.success('Coupon saved')
      }
      navigate(couponBase)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AdminPageBanner
        eyebrow="Catalog · Promotions"
        title={editId ? 'Edit Promotion Coupon' : 'Create Promotion Coupon'}
        description="Register promo codes, adjust discounts, and select validity settings."
        actions={
          <Link to={couponBase}>
            <Button
              type="button"
              variant="secondary"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-2xl text-[#073D2C]">Coupon Specifications</h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className={label}>
                Coupon Code
                <Required />
              </span>
              <input
                className={control}
                placeholder="e.g. SUMMER25"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className={label}>
                Coupon Name
                <Required />
              </span>
              <input
                className={control}
                placeholder="e.g. Summer Promo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className={label}>Description</span>
              <textarea
                className="min-h-[90px] w-full rounded-[10px] border border-border px-3 py-2.5 text-sm"
                placeholder="Describe promotion conditions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="block">
              <span className={label}>Discount Type</span>
              <select
                className={control}
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as CouponDiscountType)}
              >
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage</option>
              </select>
            </label>
            <label className="block">
              <span className={label}>
                Discount Value
                <Required />
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                className={control}
                placeholder="0.00"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className={label}>Applicable Service</span>
              <select
                className={cn(control, !serviceId && 'text-slate-ui/70')}
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">Select Applicable Service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Applicable Package</span>
              <select
                className={cn(control, !packageId && 'text-slate-ui/70')}
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
              >
                <option value="">Select Applicable Package</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-2xl text-[#073D2C]">Catalog Parameters</h2>
          <div className="mt-4 space-y-4">
            <div>
              <span className={label}>Validity Period</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="date"
                  className={control}
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  required
                />
                <input
                  type="date"
                  className={control}
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  required
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-ui">YYYY-MM-DD to YYYY-MM-DD</p>
            </div>

            <div>
              <span className={label}>New Customers Only</span>
              <div className="inline-flex rounded-[10px] border border-border bg-ivory-100 p-1">
                <button
                  type="button"
                  onClick={() => setNewCustomersOnly(true)}
                  className={cn(
                    'rounded-[8px] px-5 py-2 text-sm font-semibold transition',
                    newCustomersOnly
                      ? 'bg-[#073D2C] text-white'
                      : 'text-slate-ui hover:text-[#073D2C]',
                  )}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setNewCustomersOnly(false)}
                  className={cn(
                    'rounded-[8px] px-5 py-2 text-sm font-semibold transition',
                    !newCustomersOnly
                      ? 'bg-[#073D2C] text-white'
                      : 'text-slate-ui hover:text-[#073D2C]',
                  )}
                >
                  No
                </button>
              </div>
            </div>

            <label className="block">
              <span className={label}>Scoping Branch</span>
              <select
                className={control}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={franchiseOwner}
              >
                <option value="">Select Branch</option>
                {(franchiseOwner
                  ? branchOptions.filter((b) => b.id === forcedBranchId)
                  : branchOptions
                ).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name.replace(/ Branch$/, '')}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Link to={couponBase}>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Coupon'}
        </Button>
      </div>
    </form>
  )
}
