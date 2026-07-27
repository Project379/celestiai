import { Pressable, Text, View } from 'react-native'

import { PLANETS_BG, PLANET_GLYPHS } from '@stellaeum/astrology/client'
import type { Planet, PlanetPosition } from '@stellaeum/astrology/client'
import { pressFeedback } from '@/components/design-system/tokens'

// Stage 2 (2026-07-27) LOC split — extracted out of NatalWheel.tsx, which
// had grown past the 500-line ceiling (proposed at investigation, not
// after the fact — see NatalWheel.tsx's own header). Pure UI, no wheel
// geometry: a stellium tap (see HIT_RADIUS_MIN in NatalWheel.tsx) opens
// this centered disambiguation list instead of guessing which planet was
// meant.
//
// Founder correction (2026-07-27, device pass): Decision (a) — uniform
// glyphless gems — is INVERTED. Per-planet color is back on the wheel's
// own gems (NatalWheel.tsx imports this same palette now, not a second
// copy), a deliberate departure from the ratified mockup. Exported
// (not duplicated) so the wheel and this list stay in sync.
export const PLANET_COLORS: Record<string, string> = {
  sun: '#fcd34d',
  moon: '#e2e8f0',
  mercury: '#c4b5fd',
  venus: '#fbcfe8',
  mars: '#fda4af',
  jupiter: '#fde68a',
  saturn: '#94a3b8',
  uranus: '#67e8f9',
  neptune: '#a78bfa',
  pluto: '#8b5cf6',
  northNode: '#c4b5fd',
}

export function PlanetDisambiguation({
  planets,
  onSelect,
  onDismiss,
  wheelSize,
}: {
  planets: PlanetPosition[]
  onSelect: (planet: PlanetPosition) => void
  onDismiss: () => void
  wheelSize: number
}) {
  return (
    <>
      <Pressable
        accessibilityLabel="Затвори"
        style={{ position: 'absolute', left: 0, top: 0, width: wheelSize, height: wheelSize, zIndex: 10 }}
        onPress={onDismiss}
      />
      <View
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: [{ translateX: -90 }, { translateY: -(planets.length * 22) }],
          width: 180,
          zIndex: 11,
          backgroundColor: '#161029',
          borderWidth: 1,
          borderColor: 'rgba(139,92,246,0.35)',
          borderRadius: 14,
          paddingVertical: 6,
        }}
      >
        {planets.map((planet) => (
          <Pressable
            key={planet.planet}
            onPress={() => onSelect(planet)}
            style={({ pressed }) => ({
              ...pressFeedback(pressed),
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
              minHeight: 44,
            })}
          >
            <Text style={{ color: PLANET_COLORS[planet.planet], fontSize: 16 }}>
              {PLANET_GLYPHS[planet.planet as Planet] ?? '?'}
            </Text>
            <Text style={{ color: '#e2e8f0', fontSize: 14 }}>
              {PLANETS_BG[planet.planet as Planet] ?? planet.planet}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  )
}
