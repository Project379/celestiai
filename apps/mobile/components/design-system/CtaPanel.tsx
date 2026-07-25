import { Pressable, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { useBreathe } from './motion'
import { color, font, pressFeedback, rhythm, type } from './tokens'

// Warm/cool amendment — the invitation primitive. CORRECTED (2026-07-25):
// the first version of this component had a Surface2 background + border
// — a bordered box, exactly the thing the approved design bans ("no
// pill, no border, no chevron... a lit phrase, not a drawn container").
// That was a real bug, not a design decision — fixed here to match the
// approved Днес mockup: a lit phrase (text glow via textShadow, no fill/
// border anywhere) plus one continuously breathing ember, no container.
//
// Single-line default centers the ember against the one line. `hint` is
// for a SECOND LINE OF REAL DATA (e.g. Ритъм's active-transit name), not
// tap-explanation copy — passing one shifts to flex-start so the ember
// still anchors to the first line, not the combined block. See
// .planning/design/WARM_COOL_AMENDMENT.md §8.5 for the alignment bug this
// avoids and why Днес's own call site doesn't pass one.
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
  const breathe = useBreathe(2600, [0.5, 1])

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label} — ${hint}` : label}
      style={({ pressed }) => ({
        ...pressFeedback(pressed),
        marginTop: rhythm.group,
        flexDirection: 'row',
        alignItems: hint ? 'flex-start' : 'center',
        gap: 10,
      })}
    >
      <View style={{ flex: hint ? 1 : undefined }}>
        <Text
          style={{
            fontFamily: font.displaySemibold,
            fontSize: 17,
            color: accentTextColor,
            textShadowColor: `${accentColor}99`,
            textShadowRadius: 14,
            textShadowOffset: { width: 0, height: 0 },
          }}
        >
          {label}
        </Text>
        {hint && <Text style={{ ...type.caption, color: color.muted, marginTop: 2 }}>{hint}</Text>}
      </View>
      <Animated.View
        style={[
          {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: accentColor,
            marginTop: hint ? 5 : 0,
            shadowColor: accentColor,
            shadowOpacity: 0.9,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 0 },
          },
          breathe,
        ]}
      />
    </Pressable>
  )
}
