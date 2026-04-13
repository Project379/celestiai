'use client'

import { OracleButton } from './OracleButton'

interface OracleButtonGlobalProps {
  chartId: string | null
  subscriptionTier: 'free' | 'premium'
}

/**
 * Wrapper rendered in the protected layout.
 * Shows the floating Oracle button on every protected page when user has birth data.
 */
export function OracleButtonGlobal({ chartId, subscriptionTier }: OracleButtonGlobalProps) {
  if (!chartId) return null

  return (
    <OracleButton
      chartId={chartId}
      subscriptionTier={subscriptionTier}
      onPlanetHighlight={() => {}}
    />
  )
}
