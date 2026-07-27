import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { AspectData, HouseData } from '@stellaeum/astrology/client'

import { AspectsList } from '@/components/chart/AspectsList'
import { AstrologyReference } from '@/components/chart/AstrologyReference'
import { HousesList } from '@/components/chart/HousesList'
import { color, font, pressFeedback, rhythm, space } from '@/components/design-system/tokens'

/**
 * Карта's «Детайли» sheet — Stage 2 (2026-07-27), Decision (b). Replaces
 * the three independent DisclosureRow sections (Детайли/Аспекти/Къщи) that
 * used to sit inline below BigThreeCards: BigThreeCards is gone (the
 * mockup's single engraved plaque line replaces it — see chart.tsx's
 * `Plaque`), and the former "Детайли" row (a flat PlanetsList of every
 * planet) is dropped too — the wheel itself is already the primary
 * per-planet detail surface (tap a gem → PlanetDetail), so a duplicate
 * flat list is redundant, not a second reachability path worth keeping.
 * What's left — Аспекти, Къщи, Речник — genuinely has no other home, so
 * it moves into this one sheet behind the single "Детайли" invitation
 * under the wheel. Same Modal bottom-sheet chrome as PlanetDetail.tsx
 * (siblings, not nested, backdrop+sheet — see that file's pan-responder
 * note for why nesting was wrong).
 *
 * Tabs are a genuine segmented control here (exactly one of three, always
 * selected) — unlike DisclosureRow's independent collapsible rows, this
 * sheet's three sections don't make sense shown together or all-collapsed,
 * so the "always exactly one selected" implication IS the correct
 * semantics for once.
 */

type Tab = 'aspects' | 'houses' | 'reference'

const TABS: { key: Tab; label: string }[] = [
  { key: 'aspects', label: 'Аспекти' },
  { key: 'houses', label: 'Къщи' },
  { key: 'reference', label: 'Речник' },
]

export function DetailsSheet({
  visible,
  onClose,
  aspects,
  houses,
  birthTimeKnown,
}: {
  visible: boolean
  onClose: () => void
  aspects: readonly AspectData[]
  houses: readonly HouseData[]
  birthTimeKnown: boolean
}) {
  const [tab, setTab] = useState<Tab>('aspects')

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          onPress={onClose}
          accessibilityLabel="Затвори"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          className="bg-black/85"
        />
        <View className="rounded-t-2xl border-t border-white/10 bg-bg" style={{ maxHeight: '88%' }}>
          <SafeAreaView edges={['bottom']}>
            <View style={{ paddingHorizontal: space.xl, paddingTop: space.xl }}>
              <View className="flex-row items-start justify-between" style={{ marginBottom: rhythm.paragraph }}>
                <Text style={{ fontFamily: font.displayRegular, fontSize: 20, color: color.starlight }}>
                  Детайли
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Затвори"
                  style={({ pressed }) => pressFeedback(pressed)}
                >
                  <Text style={{ fontSize: 22, color: color.faint }}>×</Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', gap: space.xl, borderBottomWidth: 1, borderBottomColor: 'rgba(150,180,220,0.14)' }}>
                {TABS.map((t) => (
                  <Pressable
                    key={t.key}
                    onPress={() => setTab(t.key)}
                    style={({ pressed }) => ({ ...pressFeedback(pressed), paddingBottom: rhythm.tight })}
                  >
                    <Text
                      style={{
                        fontFamily: font.bodyMedium,
                        fontSize: 13,
                        color: tab === t.key ? color.cool : color.faint,
                      }}
                    >
                      {t.label}
                    </Text>
                    {tab === t.key && (
                      <View style={{ height: 1, backgroundColor: color.cool, marginTop: rhythm.tight }} />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: rhythm.paragraph, paddingBottom: space['3xl'] }}>
              {tab === 'aspects' && <AspectsList aspects={aspects} />}
              {tab === 'houses' && <HousesList houses={houses} birthTimeKnown={birthTimeKnown} />}
              {tab === 'reference' && <AstrologyReference />}
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  )
}
