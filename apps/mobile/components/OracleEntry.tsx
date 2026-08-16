import { Pressable, Text, View } from 'react-native'
import { usePathname } from 'expo-router'

import { pressFeedback } from '@/components/design-system/tokens'
import { useFirstChart } from '@/hooks/useFirstChart'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'

/**
 * Oracle persistent entry. Platform-specific expression per
 * MOBILE_UX_RESEARCH §2.6: Android/web = FAB, iOS = nav-bar glyph
 * (deferred; FAB used as placeholder).
 *
 * Sub-round 7.6 wires `handlePress` to a guarded push to `/oracle` and
 * hides the FAB until the user has a chart — same gating web's
 * `OracleFab` applies (`if (!hasChart) return null`). Without a chart
 * the Oracle screen has nothing to do, so showing the entry would be
 * a footgun.
 *
 * Founder correction (2026-07-27, device pass): this circle-with-star FAB
 * is mounted globally (TabsLayout, above every tab), separate from and
 * unaffected by Днес's own Stage 2 invite rebuild (CtaPanel — Playfair
 * SemiBold, glow, ember, no circle/border/fill). On Днес specifically it
 * sat right near that invite, reading as "the invitation is still the old
 * control" even though the real invite was already rebuilt underneath it.
 * Hidden on Днес now that screen has its own contextual entry; left as-is
 * on Ритъм/Ти/Кръг, which have no other Oracle entry point and weren't
 * part of this correction.
 *
 * Founder correction (2026-07-27, second pass): also hidden on Карта —
 * a bordered circular button directly contradicts that screen's own
 * design language ("invitations are not buttons") and competed visually
 * with Pedestal's «Детайли» invitation. Карта has no other Oracle entry
 * point either (same gap as Ритъм/Ти/Кръг below) — removing it here is a
 * scoped visual fix, not a claim that Карта doesn't need a route to
 * Oracle; that's a separate navigation decision, not made here.
 */
export function OracleEntry() {
  const { push } = useGuardedNavigation()
  const { data: firstChart } = useFirstChart()
  const pathname = usePathname()

  if (!firstChart) return null
  if (pathname === '/' || pathname === '/chart') return null

  const handlePress = () => {
    push('/oracle')
  }

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', right: 20, bottom: 90 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Отвори Оракула"
        onPress={handlePress}
        className="h-14 w-14 items-center justify-center rounded-full border border-bronze/40 bg-violet-stellaeum/20"
        style={({ pressed }) => ({
          ...pressFeedback(pressed),
          shadowColor: '#b8763e',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 8,
        })}
      >
        <Text className="font-cinzel text-[14px] text-bronze-text">✦</Text>
      </Pressable>
    </View>
  )
}
