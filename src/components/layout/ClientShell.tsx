import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { ClientHeader } from './ClientHeader'
import { ClientSidebar } from './ClientSidebar'

/** Admin-style shell for clients — same layout language, limited navigation. */
export function ClientShell() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-ivory">
      <ClientSidebar open={menuOpen} onOpenChange={setMenuOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ClientHeader menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((v) => !v)} />
        <main className="flex-1 px-4 py-5 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
