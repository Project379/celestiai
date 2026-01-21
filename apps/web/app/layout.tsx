import type { Metadata } from 'next'
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
    <html lang="bg" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
