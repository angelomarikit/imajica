import { type ComponentType } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  CalendarPlus,
  CreditCard,
  LayoutDashboard,
  Package,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import logo from '@/assets/logo-imajica.jpg'
import { Button } from '@/components/ui/Button'
import { MobileDrawer } from '@/components/ui/MobileDrawer'
import { BRAND } from '@/constants/brand'
import { cn } from '@/utils/cn'

type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
}

type NavSection = {
  category?: string
  items: NavItem[]
}

/** Client-only navigation — same category pattern as admin, limited to customer views */
const navSections: NavSection[] = [
  {
    items: [{ to: '/client/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    category: 'Scheduling',
    items: [
      { to: '/client/appointments', label: 'My Appointments', icon: CalendarDays },
      { to: '/client/book', label: 'Book Appointment', icon: CalendarPlus },
    ],
  },
  {
    category: 'Catalog',
    items: [
      { to: '/client/treatments', label: 'Treatments', icon: Sparkles },
      { to: '/client/packages', label: 'My Packages', icon: Package },
    ],
  },
  {
    category: 'Account',
    items: [
      { to: '/client/payments', label: 'Payments', icon: CreditCard },
      { to: '/client/notifications', label: 'Notifications', icon: Bell },
      { to: '/client/profile', label: 'Profile', icon: User },
    ],
  },
]

export function ClientSidebar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const close = () => onOpenChange(false)

  const content = (
    <div className="flex h-full min-h-0 flex-col bg-emerald-950 text-white">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-5">
        <img src={logo} alt={BRAND.name} className="h-11 w-11 rounded-full object-cover" />
        <div>
          <p className="font-brand text-lg leading-tight tracking-wide">IMAJICA</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Client Portal</p>
        </div>
      </div>
      <nav className="scrollbar-sidebar min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section, sectionIdx) => (
          <div
            key={section.category ?? `section-${sectionIdx}`}
            className={cn(sectionIdx > 0 && 'mt-4')}
          >
            {section.category ? (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C5A059]/85">
                {section.category}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={close}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-[#1a4a3c] text-white shadow-[inset_0_0_0_1px_rgba(197,160,89,0.25)]'
                        : 'text-white/85 hover:bg-white/10',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive ? (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#C5A059]"
                        />
                      ) : null}
                      <Icon
                        className={cn('h-4 w-4', isActive ? 'text-[#C5A059]' : 'text-[#C5A059]/80')}
                      />
                      <span className="font-medium">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto shrink-0 m-3 overflow-hidden rounded-[12px] border border-white/10">
        <div className="bg-emerald-900 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Your journey</p>
          <p className="font-brand text-sm text-gold">{BRAND.tagline}</p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden h-full w-64 shrink-0 lg:block">{content}</aside>
      <MobileDrawer open={open} onClose={close} side="left" panelClassName="bg-emerald-950">
        <div className="relative h-full">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 text-white"
            onClick={close}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
          {content}
        </div>
      </MobileDrawer>
    </>
  )
}
