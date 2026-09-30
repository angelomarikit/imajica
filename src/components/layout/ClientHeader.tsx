import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Home, Menu, X } from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'

export function ClientHeader({
  menuOpen = false,
  onToggleMenu,
}: {
  menuOpen?: boolean
  onToggleMenu?: () => void
}) {
  const { user, logout } = useAuth()
  const [query, setQuery] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-ivory/90 backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {onToggleMenu ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className={cn(
                'shrink-0 transition duration-300 lg:hidden',
                menuOpen && 'border-emerald-800 bg-emerald-900 text-white hover:bg-emerald-800 hover:text-white',
              )}
              onClick={onToggleMenu}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <span className="relative h-5 w-5">
                <Menu
                  className={cn(
                    'absolute inset-0 h-5 w-5 transition duration-300',
                    menuOpen ? 'scale-75 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100',
                  )}
                />
                <X
                  className={cn(
                    'absolute inset-0 h-5 w-5 transition duration-300',
                    menuOpen ? 'scale-100 rotate-0 opacity-100' : 'scale-75 -rotate-90 opacity-0',
                  )}
                />
              </span>
            </Button>
          ) : null}
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search appointments, treatments, or packages..."
            className="min-w-0 flex-1"
          />
        </div>
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/"
            className="hidden items-center gap-1.5 rounded-full border border-border bg-white px-3 py-2 text-xs font-medium text-charcoal transition hover:bg-ivory-100 sm:inline-flex"
          >
            <Home className="h-3.5 w-3.5" />
            Website
          </Link>
          <button
            type="button"
            onClick={() => navigate('/client/notifications')}
            className="relative rounded-full border border-border bg-white p-2.5"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 text-charcoal" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-border bg-white py-1.5 pl-1.5 pr-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-900">
                {user?.fullName?.slice(0, 1) ?? 'C'}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight">{user?.fullName}</p>
                <p className="text-[11px] text-slate-ui">Client</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-ui" />
            </button>
            {accountOpen ? (
              <div className="absolute right-0 mt-2 w-48 rounded-[10px] border border-border bg-white p-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-ivory-100"
                  onClick={() => {
                    setAccountOpen(false)
                    navigate('/client/profile')
                  }}
                >
                  Profile
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-ivory-100"
                  onClick={async () => {
                    await logout()
                    navigate('/login')
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
