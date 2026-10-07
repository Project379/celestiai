import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { bgBG } from '@clerk/localizations'
import { dark } from '@clerk/themes'
import { fontVariableClasses } from './fonts'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { PostHogProvider } from '@/components/analytics/PostHogProvider'
import { SignOutCacheSweeper } from '@/components/birth-data/ChartVersion'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Stellaeum AI - Твоят астрологичен приятел',
    template: '%s | Stellaeum AI',
  },
  description: 'Персонализирани хороскопи и астрологични прогнози, създадени за теб',
  applicationName: 'Stellaeum AI',
  keywords: ['астрология', 'хороскоп', 'натална карта', 'транзити', 'Stellaeum'],
  openGraph: {
    type: 'website',
    locale: 'bg_BG',
    siteName: 'Stellaeum AI',
    title: 'Stellaeum AI - Твоят астрологичен приятел',
    description: 'Персонализирани хороскопи и астрологични прогнози, създадени за теб',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stellaeum AI',
    description: 'Персонализирани хороскопи и астрологични прогнози',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      localization={{
        ...bgBG,
        // REVISIT-12 fix: Clerk's bgBG ships the delete-account input placeholder
        // as «Изтрий акаунта» (imperative) while the page title, actionDescription,
        // and confirm button all use «Изтриване на акаунта» (verbal-noun). A user
        // typing the placeholder text fails the match. Unify on the verbal-noun
        // form to match what the actionDescription explicitly asks the user to type.
        formFieldInputPlaceholder__confirmDeletionUserAccount: 'Изтриване на акаунта',
      }}
      dynamic
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#22d3ee',
          colorBackground: 'rgba(8, 12, 28, 0.95)',
          colorInputBackground: 'rgba(20, 28, 45, 0.8)',
          colorInputText: '#E2E8F0',
          borderRadius: '0.5rem',
          fontFamily: 'var(--font-display), Georgia, serif',
        },
      }}
    >
      <html lang="bg" className={`dark ${fontVariableClasses}`} suppressHydrationWarning>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body
          className="min-h-screen bg-background text-foreground antialiased font-body"
          suppressHydrationWarning
        >
          <SignOutCacheSweeper />
          <PostHogProvider>
            {children}
            <SiteFooter />
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
