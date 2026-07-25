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
//
// Warm/cool amendment, Stage 1 (2026-07-25): this component's only
// consumer is Карта (verified — grep for DisclosureRow before touching
// it), so it carries the cool instrument treatment directly rather than
// via a prop: the caret shifts to the cool token on expand (color-family
// change, categorical) and the opened content gets a cool hairline top
// border instead of none (containment appearing, categorical) — the
// "instrument lights up when engaged" cue, adapted from the proof's
// bracket-switcher concept to the real component Карта actually uses (it
// has no segmented switcher).
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
        <Text style={{ fontSize: 14, color: expanded ? color.cool : color.faint }}>
          {expanded ? '⌃' : '⌄'}
        </Text>
      </Pressable>
      {expanded && (
        <View
          style={{
            paddingTop: 10,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderTopColor: 'rgba(91,143,199,0.25)',
          }}
        >
          {children}
        </View>
      )}
    </View>
  )
}
