import { auth, currentUser } from '@clerk/nextjs/server'
import { UserMenu } from '../../../components/auth/UserMenu'
import { SessionExpiryModal } from '../../../components/auth/SessionExpiryModal'

export default async function DashboardPage() {
  // Middleware already protects this route, but we get user info here
  const { userId } = await auth()
  const user = await currentUser()

  const firstName = user?.firstName || 'Потребител'

  return (
    <>
      {/* Session expiry modal (client component) */}
      <SessionExpiryModal />

      {/* User menu in header slot */}
      <div className="fixed right-4 top-4 z-50 sm:right-8">
        <UserMenu />
      </div>

      {/* Dashboard content */}
      <div className="mx-auto max-w-4xl">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">
            Добре дошли, {firstName}!
          </h1>
          <p className="mt-2 text-slate-400">
            Вашето табло за астрологични прогнози
          </p>
        </div>

        {/* Dashboard cards placeholder */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Today's horoscope card */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <svg
                  className="h-5 w-5 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-slate-200">
                Дневен хороскоп
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              Скоро: персонализирани дневни прогнози
            </p>
          </div>

          {/* Birth chart card */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                <svg
                  className="h-5 w-5 text-violet-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-slate-200">
                Натална карта
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              Скоро: детайлен анализ на раждането ви
            </p>
          </div>

          {/* Transits card */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                <svg
                  className="h-5 w-5 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-slate-200">
                Транзити
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              Скоро: планетарни влияния за деня
            </p>
          </div>
        </div>

        {/* User info section (for debugging/verification) */}
        <div className="mt-8 rounded-xl border border-slate-700/50 bg-slate-800/20 p-4">
          <p className="text-xs text-slate-500">
            User ID: {userId}
          </p>
        </div>
      </div>
    </>
  )
}
