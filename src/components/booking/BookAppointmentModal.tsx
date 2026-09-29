import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppointmentCalendar } from '@/components/booking/AppointmentCalendar'
import { demoBranches, demoTreatments } from '@/constants/demoData'
import { useAuth } from '@/contexts/AuthContext'
import {
  createAppointment,
  getBookedDateKeys,
  listAppointments,
  toDateKey,
} from '@/services/appointmentService'
import type { Appointment } from '@/types'
import { cn } from '@/utils/cn'

type CustomerTab = 'existing' | 'new'
type ModalStep = 'book' | 'done'

const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
]

function formatDateLabel(d: Date) {
  return d.toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function resolveClientId(userId: string, email?: string) {
  if (email?.toLowerCase() === 'client@imajica.ph') return 'cl-maria'
  return userId
}

export function BookAppointmentModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { user, login, register, logout } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<ModalStep>('book')
  const [tab, setTab] = useState<CustomerTab>('existing')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [loginEmail, setLoginEmail] = useState('client@imajica.ph')
  const [loginPassword, setLoginPassword] = useState('password123')

  const [reg, setReg] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  const [branchId, setBranchId] = useState(demoBranches[0]?.id ?? '')
  const [treatmentId, setTreatmentId] = useState(demoTreatments[0]?.id ?? '')
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([])
  const [lastBooking, setLastBooking] = useState<Appointment | null>(null)

  const isClient = user?.role === 'CLIENT'

  const activeTreatments = useMemo(
    () => demoTreatments.filter((t) => t.status === 'active'),
    [],
  )
  const selectedTreatment = activeTreatments.find((t) => t.id === treatmentId)
  const selectedBranch = demoBranches.find((b) => b.id === branchId)
  const bookedDateKeys = useMemo(
    () => getBookedDateKeys(existingAppointments),
    [existingAppointments],
  )

  useEffect(() => {
    if (!open) return
    const now = new Date()
    setStep('book')
    setTab('existing')
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(now)
    setSelectedTime(null)
    setShowPassword(false)
    setLastBooking(null)
    void listAppointments()
      .then(setExistingAppointments)
      .catch(() => setExistingAppointments([]))
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function ensureAuthenticated(): Promise<{
    id: string
    fullName: string
    email: string
  } | null> {
    if (isClient && user) {
      return { id: user.id, fullName: user.fullName, email: user.email }
    }

    if (tab === 'existing') {
      await login(loginEmail, loginPassword, 'CLIENT')
      return {
        id: resolveClientId('user-client', loginEmail),
        fullName:
          loginEmail.toLowerCase() === 'client@imajica.ph' ? 'Maria Santos' : loginEmail.split('@')[0],
        email: loginEmail,
      }
    }

    if (reg.password !== reg.confirmPassword) {
      throw new Error('Passwords do not match')
    }
    if (reg.password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }

    await register({
      email: reg.email,
      password: reg.password,
      fullName: reg.fullName,
      phone: reg.phone,
    })
    await logout()
    await login(reg.email, reg.password, 'CLIENT')
    return {
      id: `client-${Date.now()}`,
      fullName: reg.fullName,
      email: reg.email,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDate || !selectedTime || !treatmentId || !branchId) {
      toast.error('Please choose a service, calendar date, and time')
      return
    }

    setLoading(true)
    try {
      const session = await ensureAuthenticated()
      if (!session) throw new Error('Please sign in or create an account')

      const saved = await createAppointment({
        clientId: resolveClientId(session.id, session.email),
        clientName: session.fullName,
        clientEmail: session.email,
        branchId,
        treatmentId,
        treatmentName: selectedTreatment?.name || 'Consultation',
        date: toDateKey(selectedDate),
        timeLabel: selectedTime,
        status: 'pending',
        notes: 'Booked via landing page',
      })
      setLastBooking(saved)
      setExistingAppointments((prev) => [...prev, saved])
      setStep('done')
      toast.success('Appointment saved — it will appear on the Appointments page')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not complete booking')
    } finally {
      setLoading(false)
    }
  }

  function goToClientPortal() {
    onClose()
    navigate('/client/appointments')
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#041c18]/55 backdrop-blur-[2px]"
        aria-label="Close booking modal"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-appointment-title"
        className="relative z-10 flex max-h-[94vh] w-full max-w-[880px] flex-col overflow-hidden rounded-[22px] border border-[#E8E2D6] bg-[#FDFBF7] shadow-[0_28px_80px_rgba(7,61,44,0.28)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E8E2D6] bg-white px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C5A059]">
              Imajica Medical Aesthetics
            </p>
            <h2
              id="book-appointment-title"
              className="mt-1 font-display text-[1.75rem] leading-tight text-[#073D2C] sm:text-[2rem]"
            >
              {step === 'book' ? 'Book an Appointment' : 'Request Received'}
            </h2>
            <p className="mt-1 text-sm text-[#6b6b6b]">
              {step === 'book'
                ? 'Pick a date on the calendar, choose your service and time, then sign in or register.'
                : 'Your booking is saved. Continue to your appointments.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#073D2C] transition hover:bg-[#F3EEE4]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {step === 'book' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Customer type */}
              {!isClient ? (
                <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-[#F3EEE4] p-1.5">
                  {(
                    [
                      { id: 'existing' as const, label: 'Existing Customer' },
                      { id: 'new' as const, label: 'New Customer' },
                    ]
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={cn(
                        'rounded-[10px] px-3 py-2.5 text-sm font-semibold transition',
                        tab === item.id
                          ? 'bg-[#073D2C] text-white shadow-sm'
                          : 'text-[#5a5a5a] hover:text-[#073D2C]',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-[12px] border border-[#E8E2D6] bg-white px-4 py-3 text-sm text-[#5a5a5a]">
                  Signed in as{' '}
                  <span className="font-semibold text-[#073D2C]">{user?.fullName}</span> — choose
                  your date and time below.
                </p>
              )}

              {/* Branch + service */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#1a1a1a]">
                    <MapPin className="h-3.5 w-3.5 text-[#C5A059]" />
                    Branch
                  </span>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className={selectClass}
                    required
                  >
                    {demoBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#1a1a1a]">
                    <Sparkles className="h-3.5 w-3.5 text-[#C5A059]" />
                    Service
                  </span>
                  <select
                    value={treatmentId}
                    onChange={(e) => setTreatmentId(e.target.value)}
                    className={selectClass}
                    required
                  >
                    {activeTreatments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {t.durationMinutes} min · ₱{t.price.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Calendar + times — always visible for existing & new */}
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <p className="mb-2 text-sm font-semibold text-[#073D2C]">Select a date</p>
                  <AppointmentCalendar
                    monthCursor={monthCursor}
                    onMonthChange={setMonthCursor}
                    selectedDate={selectedDate}
                    onSelectDate={(day) => {
                      setSelectedDate(day)
                      setSelectedTime(null)
                    }}
                    bookedDateKeys={bookedDateKeys}
                  />
                </div>

                <div className="rounded-[16px] border border-[#E8E2D6] bg-white p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#073D2C]">
                    <Clock className="h-4 w-4 text-[#C5A059]" />
                    Available times
                  </p>
                  {!selectedDate ? (
                    <p className="text-sm text-[#8a8a8a]">
                      Select a date on the calendar to see time slots.
                    </p>
                  ) : (
                    <>
                      <p className="mb-3 text-xs font-medium text-[#8a8a8a]">
                        {formatDateLabel(selectedDate)}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {TIME_SLOTS.map((slot) => {
                          const active = selectedTime === slot
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedTime(slot)}
                              className={cn(
                                'rounded-[10px] border px-2 py-2.5 text-[13px] font-medium transition',
                                active
                                  ? 'border-[#073D2C] bg-[#073D2C] text-white'
                                  : 'border-[#E8E2D6] text-[#073D2C] hover:border-[#C5A059] hover:bg-[#FBF7F0]',
                              )}
                            >
                              {slot}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Auth fields */}
              {!isClient ? (
                <div className="rounded-[16px] border border-[#E8E2D6] bg-white p-4 sm:p-5">
                  <p className="mb-3 text-sm font-semibold text-[#073D2C]">
                    {tab === 'existing' ? 'Sign in to confirm' : 'Create your account to confirm'}
                  </p>
                  {tab === 'existing' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Email Address"
                        icon={<Mail className="h-4 w-4" />}
                        type="email"
                        required
                        value={loginEmail}
                        onChange={setLoginEmail}
                        placeholder="Enter your email"
                      />
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-[#1a1a1a]">
                          Password
                        </span>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C5A059]" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="Enter your password"
                            className={`${inputClass} pr-11`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8a8a8a]"
                            aria-label="Toggle password"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </label>
                      <p className="sm:col-span-2 text-[12px] text-[#8a8a8a]">
                        Demo: client@imajica.ph / password123
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Full Name"
                        icon={<User className="h-4 w-4" />}
                        required
                        value={reg.fullName}
                        onChange={(v) => setReg((p) => ({ ...p, fullName: v }))}
                        placeholder="Your full name"
                      />
                      <Field
                        label="Contact Number"
                        icon={<Phone className="h-4 w-4" />}
                        required
                        value={reg.phone}
                        onChange={(v) => setReg((p) => ({ ...p, phone: v }))}
                        placeholder="09XX XXX XXXX"
                      />
                      <Field
                        label="Email Address"
                        icon={<Mail className="h-4 w-4" />}
                        type="email"
                        required
                        value={reg.email}
                        onChange={(v) => setReg((p) => ({ ...p, email: v }))}
                        placeholder="Enter your email"
                      />
                      <Field
                        label="Password"
                        icon={<Lock className="h-4 w-4" />}
                        type="password"
                        required
                        value={reg.password}
                        onChange={(v) => setReg((p) => ({ ...p, password: v }))}
                        placeholder="Create a password"
                      />
                      <div className="sm:col-span-2">
                        <Field
                          label="Confirm Password"
                          icon={<Lock className="h-4 w-4" />}
                          type="password"
                          required
                          value={reg.confirmPassword}
                          onChange={(v) => setReg((p) => ({ ...p, confirmPassword: v }))}
                          placeholder="Confirm password"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="rounded-[14px] border border-[#E8E2D6] bg-white px-4 py-3 text-sm text-[#5a5a5a]">
                <p>
                  <span className="font-semibold text-[#073D2C]">Summary:</span>{' '}
                  {selectedTreatment?.name ?? '—'} at {selectedBranch?.name ?? '—'}
                  {selectedDate ? ` · ${formatDateLabel(selectedDate)}` : ''}
                  {selectedTime ? ` · ${selectedTime}` : ''}
                </p>
              </div>

              <button type="submit" disabled={loading} className={primaryBtnClass}>
                {loading
                  ? 'Booking…'
                  : tab === 'new' && !isClient
                    ? 'Register & Confirm Appointment'
                    : 'Confirm Appointment'}
              </button>
            </form>
          ) : (
            <div className="py-4 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#073D2C] text-white">
                <Check className="h-7 w-7" strokeWidth={2.5} />
              </span>
              <h3 className="mt-4 font-display text-2xl text-[#073D2C]">You’re all set</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#5a5a5a]">
                We received your request for{' '}
                <span className="font-semibold text-[#073D2C]">
                  {lastBooking?.treatmentName ?? selectedTreatment?.name}
                </span>{' '}
                on{' '}
                <span className="font-semibold text-[#073D2C]">
                  {selectedDate ? formatDateLabel(selectedDate) : '—'}
                </span>{' '}
                at <span className="font-semibold text-[#073D2C]">{selectedTime ?? '—'}</span>
                {selectedBranch ? ` (${selectedBranch.name})` : ''}.
              </p>
              <button
                type="button"
                onClick={goToClientPortal}
                className={cn(primaryBtnClass, 'mt-6')}
              >
                View My Appointments
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const inputClass =
  'h-12 w-full rounded-[10px] border border-[#E5E0D6] bg-white pl-11 pr-3 text-sm text-[#1a1a1a] placeholder:text-[#9a9a9a] focus:border-[#0A2E26] focus:outline-none focus:ring-2 focus:ring-[#0A2E26]/10'

const selectClass =
  'h-12 w-full rounded-[10px] border border-[#E5E0D6] bg-white px-3 text-sm text-[#1a1a1a] focus:border-[#0A2E26] focus:outline-none focus:ring-2 focus:ring-[#0A2E26]/10'

const primaryBtnClass =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#073D2C] text-sm font-semibold text-white transition hover:bg-[#063B2A] disabled:opacity-60'

function Field({
  label,
  icon,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string
  icon: ReactNode
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-[#1a1a1a]">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5A059]">
          {icon}
        </span>
        <input
          type={type}
          required={required}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      </div>
    </label>
  )
}
