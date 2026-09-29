import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingBag,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { SelectPatientModal } from '@/components/booking/SelectPatientModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getPackagesCatalog, getServices } from '@/services/catalogService'
import { getCoupons } from '@/services/couponService'
import { getCatalogProducts } from '@/services/productCatalogService'
import type { Client } from '@/types'
import { formatPeso } from '@/utils/currency'
import { cn } from '@/utils/cn'

type TabId = 'services' | 'products' | 'today' | 'list'
type CartLine = { id: string; name: string; price: number; sessions: number; kind: string }

function makeInvoiceId() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const seq = String(Math.floor(Math.random() * 9000) + 1000)
  return `INV-${y}${m}${d}-${seq}`
}

export function BookingPage() {
  const [patient, setPatient] = useState<Client | null>(null)
  const [patientOpen, setPatientOpen] = useState(false)
  const [tab, setTab] = useState<TabId>('services')
  const [typeFilter, setTypeFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 8
  const [cart, setCart] = useState<CartLine[]>([])
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [discountMode, setDiscountMode] = useState('none')
  const [invoiceId] = useState(() => makeInvoiceId())
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(t)
  }, [])

  const offerings = useMemo(() => {
    const services = getServices()
      .filter((s) => s.status === 'active')
      .map((s) => ({
        id: s.id,
        name: s.name.toUpperCase(),
        price: s.price,
        sessions: s.sessions ?? 1,
        kind: 'service' as const,
      }))
    const packages = getPackagesCatalog()
      .filter((p) => p.status === 'active')
      .map((p) => ({
        id: p.id,
        name: p.name.toUpperCase(),
        price: p.promoPrice ?? p.regularPrice,
        sessions: p.sessions,
        kind: 'package' as const,
      }))
    return [...services, ...packages]
  }, [])

  const products = useMemo(
    () =>
      getCatalogProducts().map((p) => ({
        id: p.id,
        name: p.name,
        price: p.retailPrice,
        sessions: 1,
        kind: 'product' as const,
      })),
    [],
  )

  const catalog = tab === 'products' ? products : offerings

  const filtered = useMemo(() => {
    return catalog.filter((item) => {
      if (typeFilter === 'service' && item.kind !== 'service') return false
      if (typeFilter === 'package' && item.kind !== 'package') return false
      if (typeFilter === 'product' && item.kind !== 'product') return false
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [catalog, typeFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const pageRows = filtered.slice(start, start + pageSize)

  const subtotal = cart.reduce((s, i) => s + i.price, 0)
  const coupon = appliedCoupon
    ? getCoupons().find((c) => c.code.toUpperCase() === appliedCoupon.toUpperCase())
    : undefined
  let discount = 0
  if (coupon) {
    discount =
      coupon.discountType === 'percentage'
        ? Math.round((subtotal * coupon.discountValue) / 100)
        : coupon.discountValue
  } else if (discountMode === 'vip' && patient?.isVip) {
    discount = Math.round(subtotal * 0.05)
  } else if (discountMode === '10') {
    discount = Math.round(subtotal * 0.1)
  }
  const total = Math.max(0, subtotal - discount)

  function addToCart(item: (typeof catalog)[number]) {
    if (!patient) {
      toast.error('Please select a patient before placing order')
      setPatientOpen(true)
      return
    }
    setCart((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          sessions: item.sessions,
          kind: item.kind,
        },
      ]
    })
  }

  function applyCoupon() {
    const found = getCoupons().find(
      (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase(),
    )
    if (!found) {
      toast.error('Invalid coupon code')
      setAppliedCoupon(null)
      return
    }
    setAppliedCoupon(found.code)
    toast.success(`Coupon ${found.code} applied`)
  }

  function checkout() {
    if (!patient) {
      toast.error('Please select a patient before placing order')
      setPatientOpen(true)
      return
    }
    if (!cart.length) {
      toast.error('Add at least one offering to the cart')
      return
    }
    toast.success(`Checkout for ${patient.fullName} · ${formatPeso(total)}`)
    setCart([])
    setAppliedCoupon(null)
    setCouponCode('')
  }

  const clock = now.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-4">
      <SelectPatientModal
        open={patientOpen}
        onClose={() => setPatientOpen(false)}
        onSelect={setPatient}
      />

      {/* Top status bar */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-900">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-[#073D2C]">
                {patient ? patient.fullName : 'No Patient Selected'}
              </p>
              <Badge variant="neutral">Booking Center</Badge>
            </div>
            <p className="text-sm text-slate-ui">
              {patient
                ? `${patient.code} · ${patient.phone}`
                : 'Please select a patient before placing order.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <div className="rounded-[10px] border border-border bg-ivory-100 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-ui">Date</p>
            <p className="font-medium text-[#073D2C]">{clock}</p>
          </div>
          <div className="rounded-[10px] border border-border bg-ivory-100 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-ui">Invoice</p>
            <p className="font-medium text-[#073D2C]">{invoiceId}</p>
          </div>
        </div>
      </Card>

      {/* Operations */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h1 className="font-display text-2xl text-[#073D2C] sm:text-3xl">
            Create a polished booking flow
          </h1>
          <p className="text-sm text-slate-ui">
            Select a patient, add services or products, then check out with coupons and discounts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPatientOpen(true)}>Select Patient</Button>
          <Button variant="secondary" disabled={!patient}>
            Sessions
          </Button>
          <Button variant="secondary" disabled={!patient}>
            Installments
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="space-y-4">
          <div className="inline-flex flex-wrap gap-1 rounded-[12px] border border-border bg-white p-1">
            {(
              [
                ['services', 'Services'],
                ['products', 'Products'],
                ['today', "Today's Booking"],
                ['list', 'Booking List'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id)
                  setPage(1)
                }}
                className={cn(
                  'rounded-[10px] px-3.5 py-2 text-sm font-semibold transition',
                  tab === id
                    ? 'bg-[#073D2C] text-white'
                    : 'text-slate-ui hover:text-[#073D2C]',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'services' || tab === 'products' ? (
            <Card className="p-4 sm:p-5">
              <h2 className="font-display text-2xl text-[#073D2C]">
                {tab === 'products' ? 'Products' : 'Services and packages'}
              </h2>
              <p className="text-sm text-slate-ui">
                Pick one or more offerings for this patient.
              </p>

              <div className="mt-4 flex flex-wrap items-end gap-2">
                <label className="text-sm">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-ui">
                    Type
                  </span>
                  <select
                    className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm"
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value)
                      setPage(1)
                    }}
                  >
                    <option value="all">All Offerings</option>
                    {tab === 'services' ? (
                      <>
                        <option value="service">Services</option>
                        <option value="package">Packages</option>
                      </>
                    ) : (
                      <option value="product">Products</option>
                    )}
                  </select>
                </label>
                <div className="flex min-w-[220px] flex-1 items-center gap-2">
                  <input
                    className="h-10 flex-1 rounded-[10px] border border-border px-3 text-sm"
                    placeholder={tab === 'products' ? 'Search products...' : 'Search services...'}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSearch(query)
                        setPage(1)
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      setSearch(query)
                      setPage(1)
                    }}
                  >
                    Search
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {pageRows.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addToCart(item)}
                    className="rounded-[12px] border border-border p-4 text-left transition hover:border-emerald-800/40 hover:bg-emerald-50/40"
                  >
                    <p className="font-semibold uppercase tracking-wide text-[#073D2C]">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-ui">
                      {item.kind === 'package'
                        ? 'Package offering'
                        : item.kind === 'product'
                          ? 'Product'
                          : 'Service offering'}
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <p className="font-metric text-xl font-semibold tracking-tight text-[#073D2C]">{formatPeso(item.price)}</p>
                      <p className="text-xs text-slate-ui">
                        {item.sessions} session{item.sessions === 1 ? '' : 's'}
                      </p>
                    </div>
                  </button>
                ))}
                {pageRows.length === 0 ? (
                  <p className="col-span-full py-10 text-center text-sm text-slate-ui">
                    No offerings found.
                  </p>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-ui">
                <p>
                  {filtered.length === 0 ? 0 : start + 1}-{Math.min(start + pageSize, filtered.length)}{' '}
                  of {filtered.length} items
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-border disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={cn(
                        'inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] px-2 text-sm font-semibold',
                        n === safePage
                          ? 'bg-[#073D2C] text-white'
                          : 'border border-border bg-white',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                  {totalPages > 5 ? (
                    <>
                      <span>…</span>
                      <button
                        type="button"
                        onClick={() => setPage(totalPages)}
                        className="inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] border border-border px-2 text-sm font-semibold"
                      >
                        {totalPages}
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-border disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-sm text-slate-ui">
              {tab === 'today' ? (
                <div className="mx-auto max-w-sm space-y-2">
                  <CalendarDays className="mx-auto h-8 w-8 text-[#C5A059]" />
                  <p className="font-medium text-[#073D2C]">Today&apos;s Booking</p>
                  <p>Today&apos;s confirmed bookings will appear here once connected to Supabase.</p>
                </div>
              ) : (
                <div className="mx-auto max-w-sm space-y-2">
                  <Package className="mx-auto h-8 w-8 text-[#C5A059]" />
                  <p className="font-medium text-[#073D2C]">Booking List</p>
                  <p>Full booking history and filters will live in this tab.</p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Order summary */}
        <Card className="flex h-fit flex-col p-4 sm:p-5">
          <h2 className="font-display text-2xl text-[#073D2C]">Order Summary</h2>

          <div className="mt-4 min-h-[140px] rounded-[12px] border border-dashed border-border bg-ivory-100/80 p-4">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center text-sm text-slate-ui">
                <ShoppingBag className="h-8 w-8 text-slate-ui/50" />
                <p>You haven&apos;t added anything to your cart yet.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {cart.map((line) => (
                  <li key={line.id} className="flex items-start justify-between gap-2 text-sm">
                    <div>
                      <p className="font-medium text-[#073D2C]">{line.name}</p>
                      <p className="text-xs text-slate-ui capitalize">
                        {line.kind} · {line.sessions} session{line.sessions === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPeso(line.price)}</p>
                      <button
                        type="button"
                        className="text-[11px] text-red-600"
                        onClick={() => setCart((prev) => prev.filter((p) => p.id !== line.id))}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-ui">Promotions</p>
            <div className="flex gap-2">
              <input
                className="h-10 flex-1 rounded-[10px] border border-border px-3 text-sm"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <Button type="button" onClick={applyCoupon}>
                Apply
              </Button>
            </div>
            <select
              className="h-10 w-full rounded-[10px] border border-border px-3 text-sm"
              value={discountMode}
              onChange={(e) => setDiscountMode(e.target.value)}
            >
              <option value="none">No Discount</option>
              <option value="vip">VIP 5%</option>
              <option value="10">Staff 10%</option>
            </select>
          </div>

          <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-ui">Sub-total</span>
              <span>{formatPeso(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-ui">Discount</span>
              <span>-{formatPeso(discount)}</span>
            </div>
            <div className="flex justify-between font-metric text-2xl font-semibold tracking-tight text-[#073D2C]">
              <span>Total</span>
              <span>{formatPeso(total)}</span>
            </div>
          </div>

          <Button className="mt-5 w-full" onClick={checkout}>
            CHECK OUT
          </Button>
        </Card>
      </div>
    </div>
  )
}
