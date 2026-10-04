import { Bell, ChevronDown, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { SearchInput, Select } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export function AdminHeader({
  searchPlaceholder = 'Search clients, appointments, or treatments...',
  menuOpen = false,
  onToggleMenu,
}: {
  searchPlaceholder?: string
  menuOpen?: boolean
  onToggleMenu?: () => void
}) {
  const { user, logout } = useAuth()
  const { branches, selectedBranchId, setSelectedBranchId, branchLocked } = useBranch()
  const [query, setQuery] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const navigate = useNavigate()

  const branchOptions = branchLocked
    ? branches.map((b) => ({ value: b.id, label: b.name }))
    : [{ value: 'all', label: 'All Branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-ivory/90 backdrop-blur">
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
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Select
            value={selectedBranchId}
            onChange={setSelectedBranchId}
            options={branchOptions}
            className="min-w-0 flex-1 basis-[10rem] sm:w-44 sm:flex-none"
          />
          <button
            type="button"
            className="relative shrink-0 rounded-full border border-border bg-white p-2.5"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 text-charcoal" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setAccountOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-border bg-white py-1.5 pl-1.5 pr-2 sm:pr-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-900">
                {user?.fullName?.slice(0, 1) ?? 'U'}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight">{user?.fullName}</p>
                <p className="text-[11px] text-slate-ui">{user?.role.replaceAll('_', ' ')}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-ui" />
            </button>
            {accountOpen ? (
              <div className="absolute right-0 z-[60] mt-2 w-44 rounded-[10px] border border-border bg-white p-1 shadow-lg">
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
