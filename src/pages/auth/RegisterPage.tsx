import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Gem,
  IdCard,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import logo from '@/assets/logo-imajica.jpg'
import { BRAND } from '@/constants/brand'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'

/** Visual source of truth: reference/ui/02-registration.png */

const steps = [
  { id: 0, label: 'Personal Information' },
  { id: 1, label: 'Account Details' },
  { id: 2, label: 'Preferences' },
]

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dob: '',
    email: '',
    gender: 'female' as 'female' | 'male' | 'prefer_not_to_say',
    password: '',
    confirmPassword: '',
    preferredBranch: 'br-pasig',
  })

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (step < 2) {
      setStep((s) => s + 1)
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register({
        email: form.email,
        password: form.password,
        fullName: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone,
      })
      toast.success('Account created')
      navigate('/client/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FDFBF7]">
      {/* Full-bleed clinic photo behind composition */}
      <img
        src="https://images.unsplash.com/photo-1633681926022-84c1037d7c5a?w=1800&q=85"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#FDFBF7] via-[#FDFBF7]/92 to-[#FDFBF7]/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#FDFBF7]/50 via-transparent to-[#FDFBF7]/20" />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1240px] items-center gap-8 px-5 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10 lg:px-8">
        {/* LEFT branding column */}
        <div className="hidden max-w-lg lg:block">
          <div className="flex items-center gap-3">
            <img src={logo} alt={BRAND.name} className="h-12 w-12 rounded-full object-cover" />
            <div>
              <p className="font-brand text-[22px] tracking-[0.06em] text-[#0A2E26]">IMAJICA</p>
              <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#C5A059]">
                Medical Aesthetics
              </p>
            </div>
          </div>

          <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C5A059]">
            Create Your Account
          </p>
          <h1 className="mt-3 font-brand text-[2.75rem] leading-[1.1] text-[#0A2E26] xl:text-[3.25rem]">
            Start Your Aesthetic Journey With Us
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#5a5a5a]">
            Create your Imajica account to book treatments, track packages, and manage your beauty
            journey across our branches.
          </p>

          <ul className="mt-10 space-y-6">
            {[
              {
                icon: CalendarDays,
                title: 'Easy Booking',
                desc: 'Schedule appointments anytime, anywhere.',
              },
              {
                icon: IdCard,
                title: 'Personalized Care',
                desc: 'Access your treatment history and recommendations.',
              },
              {
                icon: Gem,
                title: 'Exclusive Benefits',
                desc: 'Get access to promos, VIP packages, and loyalty rewards.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C5A059] text-[#C5A059]">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="font-semibold text-[#0A2E26]">{title}</p>
                  <p className="mt-0.5 text-sm text-[#6b6b6b]">{desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-14 flex items-center gap-4">
            <p className="font-brand text-xl italic text-[#C5A059]">Enhancing Natural Beauty</p>
            <div className="h-px flex-1 max-w-[120px] bg-[#C5A059]/50" />
          </div>
        </div>

        {/* RIGHT form card */}
        <form
          onSubmit={handleNext}
          className="w-full rounded-[24px] border border-[#EDE7DC] bg-white p-6 shadow-[0_20px_60px_rgba(10,46,38,0.1)] sm:p-8 lg:p-9"
        >
          <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-display text-[1.75rem] font-semibold tracking-tight text-[#0A2E26]">Create Your Account</h2>
            <Link to="/login" className="shrink-0 text-sm text-[#6b6b6b]">
              Already have an account?{' '}
              <span className="font-medium text-[#C5A059] hover:underline">Sign In →</span>
            </Link>
          </div>
          <p className="mb-7 text-sm text-[#6b6b6b]">
            Join Imajica Medical Aesthetics and experience beauty, science, and confidence.
          </p>

          {/* Stepper */}
          <div className="mb-8 flex items-start justify-between gap-2">
            {steps.map((s, index) => (
              <div key={s.id} className="flex flex-1 flex-col items-center">
                <div className="mb-2 flex w-full items-center">
                  {index > 0 ? (
                    <div className={cn('h-px flex-1', index <= step ? 'bg-[#0A2E26]' : 'bg-[#E5E0D6]')} />
                  ) : (
                    <div className="flex-1" />
                  )}
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                      index <= step ? 'bg-[#0A2E26] text-white' : 'bg-[#F0EBE3] text-[#8a8a8a]',
                    )}
                  >
                    {index + 1}
                  </div>
                  {index < steps.length - 1 ? (
                    <div className={cn('h-px flex-1', index < step ? 'bg-[#0A2E26]' : 'bg-[#E5E0D6]')} />
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
                <p
                  className={cn(
                    'text-center text-[11px] font-medium',
                    index === step ? 'text-[#1a1a1a]' : 'text-[#9a9a9a]',
                  )}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {step === 0 ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-base font-semibold tracking-tight text-[#0A2E26]">Personal Information</h3>
                <p className="text-sm text-[#6b6b6b]">Let’s get to know you.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="First Name"
                  required
                  icon={<User className="h-4 w-4" />}
                  value={form.firstName}
                  onChange={(v) => update('firstName', v)}
                />
                <Field
                  label="Last Name"
                  required
                  icon={<User className="h-4 w-4" />}
                  value={form.lastName}
                  onChange={(v) => update('lastName', v)}
                />
              </div>

              <Field
                label="Contact Number"
                required
                icon={<Phone className="h-4 w-4" />}
                placeholder="09XX XXX XXXX"
                value={form.phone}
                onChange={(v) => update('phone', v)}
              />
              <Field
                label="Date of Birth"
                required
                type="date"
                icon={<CalendarDays className="h-4 w-4" />}
                value={form.dob}
                onChange={(v) => update('dob', v)}
              />
              <Field
                label="Email Address"
                required
                type="email"
                icon={<Mail className="h-4 w-4" />}
                value={form.email}
                onChange={(v) => update('email', v)}
              />

              <div>
                <p className="mb-2 text-sm font-semibold text-[#1a1a1a]">
                  Gender <span className="text-red-500">*</span>
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      ['female', 'Female'],
                      ['male', 'Male'],
                      ['prefer_not_to_say', 'Prefer not to say'],
                    ] as const
                  ).map(([value, label]) => {
                    const active = form.gender === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => update('gender', value)}
                        className={cn(
                          'rounded-[10px] border px-2 py-3 text-xs font-medium transition',
                          active
                            ? 'border-[#C5A059] bg-[#FBF7F0] text-[#C5A059]'
                            : 'border-[#E5E0D6] bg-white text-[#5a5a5a]',
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-base font-semibold tracking-tight text-[#0A2E26]">Account Details</h3>
                <p className="text-sm text-[#6b6b6b]">Create a secure password for your account.</p>
              </div>
              <Field
                label="Password"
                required
                type="password"
                icon={<Lock className="h-4 w-4" />}
                value={form.password}
                onChange={(v) => update('password', v)}
              />
              <Field
                label="Confirm Password"
                required
                type="password"
                icon={<Lock className="h-4 w-4" />}
                value={form.confirmPassword}
                onChange={(v) => update('confirmPassword', v)}
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-base font-semibold tracking-tight text-[#0A2E26]">Preferences</h3>
                <p className="text-sm text-[#6b6b6b]">Tell us where you’d like to book.</p>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-[#1a1a1a]">
                  Preferred Branch <span className="text-red-500">*</span>
                </span>
                <select
                  className="h-12 w-full rounded-[10px] border border-[#E5E0D6] px-3 text-sm focus:border-[#0A2E26] focus:outline-none focus:ring-2 focus:ring-[#0A2E26]/10"
                  value={form.preferredBranch}
                  onChange={(e) => update('preferredBranch', e.target.value)}
                >
                  <option value="br-pasig">Pasig Branch</option>
                  <option value="br-makati">Makati Branch</option>
                  <option value="br-alabang">Alabang Branch</option>
                  <option value="br-santacruz">Santa Cruz Branch</option>
                </select>
              </label>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0A2E26] text-sm font-semibold text-white transition hover:bg-[#063B2A] disabled:opacity-60"
          >
            {step < 2 ? 'Next Step →' : loading ? 'Creating…' : 'Create Account'}
          </button>

          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="mt-3 w-full text-center text-sm font-medium text-[#6b6b6b] hover:text-[#0A2E26]"
            >
              ← Back
            </button>
          ) : null}

          <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] text-[#8a8a8a]">
            <Lock className="h-3.5 w-3.5" />
            Your information is secure and protected with industry-standard encryption.
          </p>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  icon,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  required?: boolean
  icon: ReactNode
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-[#1a1a1a]">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
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
          className="h-12 w-full rounded-[10px] border border-[#E5E0D6] bg-white pl-11 pr-3 text-sm text-[#1a1a1a] placeholder:text-[#9a9a9a] focus:border-[#0A2E26] focus:outline-none focus:ring-2 focus:ring-[#0A2E26]/10"
        />
      </div>
    </label>
  )
}
