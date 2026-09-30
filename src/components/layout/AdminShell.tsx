import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { AdminHeader } from './AdminHeader'

export function AdminShell() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-ivory">
      <AdminSidebar open={menuOpen} onOpenChange={setMenuOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((v) => !v)} />
        <main className="flex-1 px-4 py-5 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
