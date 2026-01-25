import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { bgBG } from '@clerk/localizations'
import { dark } from '@clerk/themes'
import './globals.css'

export const metadata: Metadata = {
  title: 'Celestia AI - Вашият астрологичен спътник',
  description: 'Персонализирани хороскопи и астрологични прогнози',
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
          colorPrimary: '#8B5CF6',
          colorBackground: 'rgba(15, 23, 42, 0.95)',
          colorInputBackground: 'rgba(30, 41, 59, 0.8)',
          colorInputText: '#E2E8F0',
          borderRadius: '0.75rem',
          fontFamily: 'inherit',
        },
      }}
    >
      <html lang="bg" className="dark" suppressHydrationWarning>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body
          className="min-h-screen bg-background text-foreground antialiased"
          suppressHydrationWarning
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
