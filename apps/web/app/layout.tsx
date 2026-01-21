import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { connection } from 'next/server'
import './globals.css'

export const metadata: Metadata = {
  title: 'Celestia AI - Вашият астрологичен спътник',
  description: 'Персонализирани хороскопи и астрологични прогнози',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Force dynamic rendering to get fresh nonce on each request
  await connection()

  // Get nonce from middleware-set header
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') ?? undefined

  return (
    <html lang="bg" className="dark" suppressHydrationWarning>
      <head>
        {/* Nonce will be used by Next.js for inline scripts */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  )
}
