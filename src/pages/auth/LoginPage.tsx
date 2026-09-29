import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  Eye,
  EyeOff,
  Flower2,
  Heart,
  Lock,
  Mail,
  Settings2,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import loginBackground from '@/assets/auth/login-background.jpg'
import logo from '@/assets/logo-imajica.jpg'
import { BRAND } from '@/constants/brand'
import { useAuth, isStaffRole } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'
import { cn } from '@/utils/cn'

/** Visual source of truth: reference/ui/01-login.png */

export function LoginPage() {
  const { login, isDemoMode } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@imajica.ph')
  const [password, setPassword] = useState('password123')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent, roleHint?: UserRole) {
    e.preventDefault()
    setLoading(true)
    try {
      const hintEmail =
        roleHint === 'CLIENT'
          ? 'client@imajica.ph'
          : roleHint === 'RECEPTIONIST' || roleHint === 'BRANCH_ADMIN'
            ? 'staff@imajica.ph'
            : email

      await login(hintEmail || email, password, roleHint)
      const stored = localStorage.getItem('imajica_auth_user')
      const user = stored ? (JSON.parse(stored) as { role: UserRole }) : null
      const role = roleHint ?? user?.role ?? 'HQ_ADMIN'
      toast.success('Welcome back')
      navigate(isStaffRole(role) ? '/admin/dashboard' : '/client/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative grid min-h-screen bg-[#F7F3EB] lg:grid-cols-[1.15fr_0.85fr]">
      {/* LEFT — clinic photo + marketing (ref) */}
      <aside className="relative hidden min-h-screen overflow-hidden lg:block">
        <img
          src={loginBackground}
          alt="Imajica clinic interior"
          className="absolute inset-0 h-full w-full object-cover object-left"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#041c18]/85 via-[#0A2E26]/72 to-[#0A2E26]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#041c18]/90 via-transparent to-[#041c18]/25" />

        <div className="relative z-10 flex h-full flex-col justify-between px-12 py-14 xl:px-16">
          <div className="max-w-xl pt-6">
            <h1 className="font-display text-[3.25rem] leading-[1.08] text-white xl:text-[3.75rem]">
              Beauty. Science.
              <br />
              Confidence.
            </h1>
            <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.28em] text-white/80">
              Advanced aesthetic care for a more radiant you
            </p>

            <ul className="mt-12 space-y-7">
              {[
                {
                  icon: Flower2,
                  title: 'Modern Clinic Management',
                  desc: 'Appointments, clients, treatments and more.',
                },
                {
                  icon: BarChart3,
                  title: 'Multi-Branch Ready',
                  desc: 'Manage all your branches in one platform.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Secure & Reliable',
                  desc: 'Your data is always protected.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C5A059]/70 text-[#C5A059]">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold text-white">{title}</p>
                    <p className="mt-0.5 text-sm text-white/70">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-8 border-t border-white/20 pt-7 text-sm">
            <div>
              <p className="font-metric text-[1.65rem] font-semibold tracking-tight text-[#C5A059]">15+</p>
              <p className="mt-0.5 text-white/75">Branches</p>
            </div>
            <div className="h-10 w-px bg-white/25" />
            <div>
              <p className="font-display text-[1.65rem] text-[#C5A059]">Thousands</p>
              <p className="mt-0.5 text-white/75">of Happy Clients</p>
            </div>
            <div className="h-10 w-px bg-white/25" />
            <div>
              <p className="font-display text-[1.65rem] text-[#C5A059]">One</p>
              <p className="mt-0.5 text-white/75">Beautiful System</p>
            </div>
          </div>
        </div>

        {/* Organic wave edge into right panel */}
        <svg
          className="pointer-events-none absolute -right-px top-0 z-20 hidden h-full w-[120px] text-[#F7F3EB] xl:block"
          viewBox="0 0 120 900"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M120 0C70 80 40 160 55 260C75 400 10 480 35 600C55 700 90 780 120 900V0Z"
          />
        </svg>
      </aside>

      {/* RIGHT — cream panel + login card */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 80% 20%, #F7F1E3 0%, transparent 55%), radial-gradient(ellipse 60% 45% at 10% 80%, #E8F2EE 0%, transparent 50%), linear-gradient(160deg, #FBF8F2 0%, #F3EEE4 100%)',
          }}
        />
        <svg
          aria-hidden
          className="pointer-events-none absolute -left-10 top-1/4 h-[70%] w-[180px] text-[#C5A059]/25"
          viewBox="0 0 180 600"
          fill="none"
        >
          <path d="M20 20C90 120 10 220 80 320C140 400 40 480 100 580" stroke="currentColor" strokeWidth="2" />
          <path d="M50 0C110 100 30 200 100 300C160 380 60 460 120 560" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        </svg>

        <form
          onSubmit={(e) => handleSubmit(e)}
          className="relative z-10 w-full max-w-[420px] rounded-[18px] border border-[#EDE7DC] bg-white px-8 py-9 shadow-[0_18px_50px_rgba(10,46,38,0.08)] sm:px-10 sm:py-10"
        >
          <div className="mb-7 text-center">
            <img src={logo} alt={BRAND.name} className="mx-auto h-[72px] w-[72px] rounded-full object-cover" />
            <p className="mt-3 font-display text-[22px] tracking-[0.08em] text-[#0A2E26]">IMAJICA</p>
            <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-[#C5A059]">
              Medical Aesthetics
            </p>
          </div>

          <div className="mb-6 text-center">
            <h2 className="font-display text-[2rem] text-[#1a1a1a]">Welcome Back</h2>
            <p className="mt-1.5 text-sm text-[#6b6b6b]">Sign in to your clinic management system.</p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#1a1a1a]">Email Address</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C5A059]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="h-12 w-full rounded-[10px] border border-[#E5E0D6] bg-white pl-11 pr-3 text-sm text-[#1a1a1a] placeholder:text-[#9a9a9a] focus:border-[#0A2E26] focus:outline-none focus:ring-2 focus:ring-[#0A2E26]/10"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#1a1a1a]">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C5A059]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-[10px] border border-[#E5E0D6] bg-white pl-11 pr-11 text-sm text-[#1a1a1a] placeholder:text-[#9a9a9a] focus:border-[#0A2E26] focus:outline-none focus:ring-2 focus:ring-[#0A2E26]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8a8a8a]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-[#1a1a1a]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-[#C5A059] accent-[#C5A059]"
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="font-medium text-[#C5A059] hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0A2E26] text-sm font-semibold text-white transition hover:bg-[#063B2A] disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-[#8a8a8a]">
            <div className="h-px flex-1 bg-[#E5E0D6]" />
            Or continue with
            <div className="h-px flex-1 bg-[#E5E0D6]" />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {(
              [
                { label: 'Admin', role: 'HQ_ADMIN' as const, icon: Settings2 },
                { label: 'Staff', role: 'RECEPTIONIST' as const, icon: Heart },
                { label: 'Branch', role: 'BRANCH_ADMIN' as const, icon: Building2 },
              ]
            ).map(({ label, role, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={(e) => void handleSubmit(e, role)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-[10px] border border-[#C5A059]/55 bg-[#FBF7F0] px-2 py-3 text-xs font-medium text-[#0A2E26] transition hover:bg-[#F7F1E3]',
                )}
              >
                <Icon className="h-4 w-4 text-[#C5A059]" />
                {label}
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-[#6b6b6b]">
            New here?{' '}
            <Link to="/register" className="font-medium text-[#C5A059] hover:underline">
              Create an account
            </Link>
          </p>

          {isDemoMode ? (
            <p className="mt-3 rounded-[10px] bg-[#F7F1E3] px-3 py-2 text-center text-[11px] text-[#6b6b6b]">
              Demo: admin@imajica.ph / password123
            </p>
          ) : null}
        </form>

        <p className="absolute bottom-4 right-5 text-[11px] text-[#8a8a8a]">{BRAND.copyright}</p>
      </section>
    </div>
  )
}
