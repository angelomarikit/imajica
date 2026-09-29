import type { CouponDiscountType, PromoCoupon } from '@/types'

const STORAGE_KEY = 'imajica_promo_coupons'
const CHANGE_EVENT = 'imajica:coupons-changed'

const DEFAULT_COUPONS: PromoCoupon[] = []

function emit() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function readStored(): PromoCoupon[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PromoCoupon[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readDeleted(): Set<string> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_deleted`)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function getCoupons(): PromoCoupon[] {
  const extra = readStored()
  const deleted = readDeleted()
  const seedIds = new Set(DEFAULT_COUPONS.map((c) => c.id))
  const overrides = new Map(extra.filter((c) => seedIds.has(c.id)).map((c) => [c.id, c]))
  const customs = extra.filter((c) => !seedIds.has(c.id))
  return [...customs, ...DEFAULT_COUPONS.map((c) => overrides.get(c.id) ?? c)].filter(
    (c) => !deleted.has(c.id),
  )
}

export function getCouponById(id: string): PromoCoupon | undefined {
  return getCoupons().find((c) => c.id === id)
}

export function couponStatus(coupon: PromoCoupon, now = new Date()): 'active' | 'scheduled' | 'expired' {
  const start = new Date(coupon.validFrom)
  const end = new Date(coupon.validUntil)
  end.setHours(23, 59, 59, 999)
  if (now < start) return 'scheduled'
  if (now > end) return 'expired'
  return 'active'
}

export function daysSinceEnded(coupon: PromoCoupon, now = new Date()): number {
  const end = new Date(coupon.validUntil)
  end.setHours(23, 59, 59, 999)
  const diff = now.getTime() - end.getTime()
  return Math.max(0, Math.floor(diff / (24 * 3600 * 1000)))
}

export type CouponInput = {
  code: string
  name: string
  description?: string
  discountType: CouponDiscountType
  discountValue: number
  serviceId?: string
  serviceName?: string
  packageId?: string
  packageName?: string
  branchId?: string
  branchName: string
  validFrom: string
  validUntil: string
  newCustomersOnly: boolean
}

export function saveCoupon(coupon: PromoCoupon): PromoCoupon {
  const extra = readStored()
  const idx = extra.findIndex((c) => c.id === coupon.id)
  const next = idx >= 0 ? extra.map((c, i) => (i === idx ? coupon : c)) : [coupon, ...extra]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emit()
  return coupon
}

export function createCoupon(input: CouponInput): PromoCoupon {
  return saveCoupon({
    id: `cpn-${Date.now()}`,
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    discountType: input.discountType,
    discountValue: input.discountValue,
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    packageId: input.packageId,
    packageName: input.packageName,
    branchId: input.branchId,
    branchName: input.branchName,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    newCustomersOnly: input.newCustomersOnly,
    createdAt: new Date().toISOString().slice(0, 10),
  })
}

export function updateCoupon(id: string, input: CouponInput): PromoCoupon {
  const existing = getCouponById(id)
  return saveCoupon({
    id,
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    discountType: input.discountType,
    discountValue: input.discountValue,
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    packageId: input.packageId,
    packageName: input.packageName,
    branchId: input.branchId,
    branchName: input.branchName,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    newCustomersOnly: input.newCustomersOnly,
    createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
  })
}

export function deleteCoupon(id: string) {
  if (id.startsWith('cpn-') && !DEFAULT_COUPONS.some((c) => c.id === id)) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(readStored().filter((c) => c.id !== id)),
    )
  } else {
    const deleted = readDeleted()
    deleted.add(id)
    localStorage.setItem(`${STORAGE_KEY}_deleted`, JSON.stringify([...deleted]))
  }
  emit()
}

export function subscribeCoupons(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === `${STORAGE_KEY}_deleted`) listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}
