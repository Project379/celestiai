import { Pressable, Text, View } from 'react-native'

import { color, font, pressFeedback, rhythm, type } from './tokens'

// Warm/cool amendment, Stage 1 (2026-07-25) — replaces the plain
// amber-text NavRow used for Днес's "Питай Оракула" exit. Surface2 tonal
// panel (existing elevation tier, reused per R7 calibration §210 — not new
// decorative chrome) + a leading sigil instead of the trailing chevron
// every other row on the screen uses, so this one reads as a considered
// object rather than another nav link.
//
// Single-line default centers the sigil naturally against the one line.
// `hint` is for a SECOND LINE OF REAL DATA (e.g. Ритъм's active-transit
// name), not tap-explanation copy — passing one switches to flex-start +
// a small sigil offset so it anchors to the first line, not the combined
// block. See .planning/design/WARM_COOL_AMENDMENT.md §8.5 for the
// alignment bug this fixes and why Днес's own call site doesn't pass one.
export function CtaPanel({
  label,
  hint,
  onPress,
  accentColor = color.bronze,
  accentTextColor = color.bronzeText,
}: {
  label: string
  hint?: string
  onPress: () => void
  accentColor?: string
  accentTextColor?: string
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label} — ${hint}` : label}
      style={({ pressed }) => ({
        ...pressFeedback(pressed),
        marginTop: rhythm.group,
        padding: 14,
        borderRadius: 10,
        backgroundColor: color.surface2,
        borderWidth: 1,
        borderColor: `${accentColor}47`,
        flexDirection: 'row',
        alignItems: hint ? 'flex-start' : 'center',
        gap: 12,
      })}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 1.4,
          borderColor: accentColor,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: hint ? -2 : 0,
        }}
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accentColor }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.bodyMedium, fontSize: 13.5, color: accentTextColor }}>{label}</Text>
        {hint && (
          <Text style={{ ...type.caption, color: color.muted, marginTop: 1 }}>{hint}</Text>
        )}
      </View>
    </Pressable>
  )
}
