import { auth } from '@clerk/nextjs/server'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Middleware handles auth.protect() - this layout provides the shell
  // for authenticated pages with common elements
  const { userId } = await auth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-purple-900/20">
      {/* Header area for navigation and UserMenu */}
      <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-semibold text-slate-100">Celestia</span>
          </div>

          {/* UserMenu will be rendered here via dashboard page */}
          <div id="user-menu-slot" />
        </div>
      </header>

      {/* Main content area */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
