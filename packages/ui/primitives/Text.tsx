import React from 'react'

type TextElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'

interface TextProps {
  children: React.ReactNode
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'muted'
  className?: string
  as?: TextElement
}

const variantStyles: Record<string, string> = {
  h1: 'text-4xl font-bold text-foreground',
  h2: 'text-2xl font-semibold text-foreground',
  h3: 'text-xl font-medium text-foreground',
  body: 'text-base text-foreground',
  muted: 'text-sm text-muted',
}

const variantTags: Record<string, TextElement> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'p',
  muted: 'p',
}

/**
 * Text component with semantic variants for cosmic theme.
 */
export function Text({
  children,
  variant = 'body',
  className = '',
  as,
}: TextProps) {
  const Tag = as || variantTags[variant] || 'p'
  const styles = variantStyles[variant] || variantStyles.body

  return React.createElement(
    Tag,
    { className: `${styles} ${className}`.trim() },
    children
  )
}
