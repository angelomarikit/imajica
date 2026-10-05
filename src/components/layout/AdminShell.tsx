import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { AdminHeader } from './AdminHeader'

export function AdminShell() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-ivory">
      <div className="print:hidden sticky top-0 h-screen shrink-0 self-start">
        <AdminSidebar open={menuOpen} onOpenChange={setMenuOpen} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <AdminHeader menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((v) => !v)} />
        </div>
        <main className="flex-1 px-4 py-5 lg:px-6 lg:py-6 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
