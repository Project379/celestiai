import { Pressable, Text, View } from 'react-native'

import { color, pressFeedback, type } from './tokens'
import { hapticSelect } from '@/lib/haptics'

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
      onPress={() => {
        hapticSelect()
        onPress()
      }}
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

// DisclosureRow (independent collapsible rows for Карта's Детайли/
// Аспекти/Къщи breakdown) was removed Stage 2 (2026-07-27) — that
// breakdown consolidated into DetailsSheet.tsx's tabbed sheet behind a
// single «Детайли» invitation (Decision (b)). It had exactly one
// consumer (chart.tsx); deleted rather than kept unused.
