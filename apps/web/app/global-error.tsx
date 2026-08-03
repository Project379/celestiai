'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="bg">
      <body>
        <h2>Нещо неочаквано се обърка.</h2>
        <p>Опитай да презаредиш страницата.</p>
      </body>
    </html>
  )
}
