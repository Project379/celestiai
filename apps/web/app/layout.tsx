import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { bgBG } from '@clerk/localizations'
import { dark } from '@clerk/themes'
import { Manrope, Inter } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Celestia AI - Твоят астрологичен приятел',
  description: 'Персонализирани хороскопи и астрологични прогнози, създадени за теб',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      localization={bgBG}
      dynamic
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#22d3ee',
          colorBackground: 'rgba(8, 12, 28, 0.95)',
          colorInputBackground: 'rgba(20, 28, 45, 0.8)',
          colorInputText: '#E2E8F0',
          borderRadius: '0.5rem',
          fontFamily: 'var(--font-display), var(--font-body), system-ui, sans-serif',
        },
      }}
    >
      <html lang="bg" className={`dark ${manrope.variable} ${inter.variable}`} suppressHydrationWarning>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body
          className="min-h-screen bg-background text-foreground antialiased font-body"
          suppressHydrationWarning
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
