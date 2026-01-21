import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Celestia AI',
  description: 'Вашият астрологичен спътник',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="bg">
      <body>{children}</body>
    </html>
  )
}
