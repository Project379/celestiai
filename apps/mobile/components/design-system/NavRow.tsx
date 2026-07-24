import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import { color, pressFeedback, type } from './tokens'

// THE one tappability mechanism for this redesign (Step 3 point 4): a
// trailing chevron. It's the existing iOS disclosure-indicator
// convention — already used elsewhere in this codebase (wizard CTAs,
// empty-state buttons) — reused consistently instead of introducing a
// second/competing affordance (underline, color-shift, card border).
// Every row/link that navigates or opens something uses this component;
// nothing else in these two screens signals tappability a different way.
export function NavRow({
  label,
  hint,
  onPress,
  tone = 'default',
}: {
  label: string
  hint?: string
  onPress: () => void
  tone?: 'default' | 'accent'
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        ...pressFeedback(pressed),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 44,
        paddingVertical: 12,
      })}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ ...type.row, color: tone === 'accent' ? color.amberText : color.text }}>
          {label}
        </Text>
        {hint && (
          <Text style={{ ...type.caption, color: color.faint, marginTop: 2 }}>{hint}</Text>
        )}
      </View>
      <Text style={{ fontFamily: type.row.fontFamily, fontSize: 18, color: color.faint }}>›</Text>
    </Pressable>
  )
}

// A deliberately DIFFERENT trailing glyph (⌄/⌃, not ›) for a genuinely
// different consequence: expands/collapses inline content on the same
// screen, rather than navigating away. This isn't a second competing
// affordance system — it's the same standard iOS distinction between a
// disclosure indicator (navigate) and a disclosure triangle (expand) —
// used here instead of a segmented control specifically because a
// segmented control implies exactly-one-always-selected, mutually
// exclusive state, and this needs independent, collapsible-to-none rows.
export function DisclosureRow({
  label,
  expanded,
  onToggle,
  children,
}: {
  label: string
  expanded: boolean
  onToggle: () => void
  children?: ReactNode
}) {
  return (
    <View>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => ({
          ...pressFeedback(pressed),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 44,
          paddingVertical: 12,
        })}
      >
        <Text style={{ ...type.row, color: color.text }}>{label}</Text>
        <Text style={{ fontSize: 14, color: color.faint }}>{expanded ? '⌃' : '⌄'}</Text>
      </Pressable>
      {expanded && <View style={{ paddingBottom: 12 }}>{children}</View>}
    </View>
  )
}
