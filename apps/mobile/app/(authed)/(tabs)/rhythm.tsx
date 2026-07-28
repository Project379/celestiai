import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { TransitOverviewCard } from '@/components/horoscope/TransitOverviewCard'
import { font, pressFeedback } from '@/components/design-system/tokens'
import { useFirstChart } from '@/hooks/useFirstChart'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'
import { useTransitOverview } from '@/hooks/useTransitOverview'

// Systemic navbar-clearance rule (2026-07-27, audit): this screen doesn't
// use ScreenShell (its own SafeAreaView+ScrollView instead), so it never
// got that component's tab-bar-clearance fix — flat `paddingBottom: 120`
// gave only ~30px real clearance above the tab bar (120 - (56+~34
// inset)), short of the ~52px target Днес/Карта now use. Same formula
// applied here: keep in sync with (tabs)/_layout.tsx's tab-bar-height
// calculation and ScreenShell.tsx's TAB_BAR_CLEARANCE if either changes.
const TAB_BAR_BASE_HEIGHT = 56
const TAB_BAR_CLEARANCE = 52

/**
 * Ритъм tab — current-sky reading. Mobile port of
 * apps/web/app/(protected)/rhythm/page.tsx (P.3-a opener).
 *
 * P.3-a ships the skeleton: hero «Какво ти влияе сега» + diary CTA card
 * linking to /rhythm/journal + empty-state branch for chart-less users.
 * Lunar phase card lands at P.3-b; transit overview lands at P.3-c.
 *
 * The previous 4-chip shell (Днес/Седмица/Месец/Година) is deleted at
 * P.3-a per HT 2 ratification; design intent preserved as REVISIT-46
 * for restoration decision at Phase C or first multi-scale forecast
 * request.
 *
 * Hero (Round C1, MOBILE_ALPHA_REDESIGN.md §21, ratified 2026-07-23;
 * SUPERSEDED §22 2026-07-23 — MoonDisc is Ритъм's actual R1 hero, this
 * numeral is a secondary lead element, sized down from 72px to 56px so
 * it clearly cedes the eye to LunarPhaseCard's moon while still reading
 * well past the `hero` token (32px), not caption-scale):
 * the active-transit count, not the MoonDisc — repeating Днес's glyph one
 * tab over would dilute the one thing Днес's whole design rests on. 56px
 * is a one-off outside the named type scale, secondary to Днес's
 * MoonGlyph (§4.1) — a bare numeral needs to break past the `hero` token
 * (32px) to read as a Weather-style dominant number, not a headline.
 * On a quiet day (pacing.emphasis === 'quiet', exactly equivalent to
 * activeTransits.length === 0 — see transit-analysis.ts:510-518) the
 * hero swaps to «Тих ден» at the same size instead of showing a bare "0":
 * same underlying `pacing` field, word instead of number, not a fallback
 * to a different visual language. While chart-less or before the query
 * resolves, the hero falls back to plain descriptive text — no count to
 * show yet.
 */
const PACING_WORD: Record<'fast' | 'slow' | 'mixed' | 'quiet', string> = {
  fast: 'Бърз ритъм',
  slow: 'Бавен ритъм',
  mixed: 'Смесен ритъм',
  quiet: 'Тих ден',
}

// Bulgarian count-form agreement (бройна форма): "1 активен транзит" is
// the only singular case — every other count, including 21/31/101, takes
// the plural adjective + count-form noun ("21 активни транзита"), unlike
// Russian's genitive-singular-after-21 rule. See bulgarian-skill/grammar.md §1, §4.
function transitCountLabel(count: number): string {
  return count === 1 ? '1 активен транзит' : `${count} активни транзита`
}

export default function RhythmScreen() {
  const firstChart = useFirstChart()
  const overview = useTransitOverview(firstChart.data?.id)
  const insets = useSafeAreaInsets()

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        {/* Hero — active-transit count, or «Тих ден» on a quiet day */}
        <View className="mb-10">
          {/* R3-reserved eyebrow — was font-cinzel on Cyrillic (REVISIT-42's
              bug, unloaded, silently rendering in system font); swapped to
              the loaded EB Garamond token as part of closing this file's
              font gap (§23), not a new R3 decision. */}
          <Text
            style={{ fontFamily: font.bodyMedium }}
            className="mb-3 text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500"
          >
            Текущо небе
          </Text>

          {overview.data ? (
            overview.data.pacing.emphasis === 'quiet' ? (
              <>
                <Text
                  style={{ fontFamily: font.displaySemibold, fontSize: 56, lineHeight: 62 }}
                  className="tracking-tight text-amber-200/95"
                >
                  Тих ден
                </Text>
                <Text style={{ fontFamily: font.body }} className="mt-3 max-w-xl text-[15px] font-light leading-relaxed text-slate-500">
                  Няма силни аспекти към наталната карта точно сега.
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={{ fontFamily: font.displaySemibold, fontSize: 56, lineHeight: 62 }}
                  className="tracking-tight text-amber-200/95"
                >
                  {overview.data.activeTransits.length}
                </Text>
                <Text style={{ fontFamily: font.body }} className="mt-1 text-[15px] font-light text-slate-400">
                  {transitCountLabel(overview.data.activeTransits.length)}
                </Text>
                <Text style={{ fontFamily: font.body }} className="mt-1 text-[13px] font-light text-slate-500">
                  {PACING_WORD[overview.data.pacing.emphasis]}
                </Text>
              </>
            )
          ) : (
            <>
              <Text style={{ fontFamily: font.body }} className="text-[28px] leading-[1.15] tracking-tight">
                <Text className="font-light text-slate-400">Какво ти </Text>
                <Text className="font-semibold text-amber-200/95">влияе сега</Text>
              </Text>
              <Text style={{ fontFamily: font.body }} className="mt-3 max-w-xl text-[15px] font-light leading-relaxed text-slate-500">
                Активните транзити към картата ти — как планетите говорят с теб точно днес.
              </Text>
            </>
          )}
        </View>

        {/* IA move (this batch) — LunarPhaseCard and the journal CTA moved
            off Ритъм onto Днес's «повече детайли» → moon-detail.tsx.
            Ритъм keeps ONLY the hero above and the transits/dictionary
            below (ratified: "the transit count, driven by the same hook
            as the transit list — that is the transit section's own
            header, not lunar context"). Structured so a later move of
            this whole tab into Ти is a clean removal — nothing here
            depends on lunar content that used to sit in this file. */}

        {/* Transit overview — gated on chart presence. EmptyTransitsState
            for chart-less users mirrors the chart.tsx pattern inline. */}
        {firstChart.data === null && <EmptyTransitsState />}
        {firstChart.data && <TransitOverviewCard chartId={firstChart.data.id} />}
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * No-chart fallback — duplicates the chart.tsx pattern inline per HT 5
 * (rule of three; refactor when a third surface needs the abstraction).
 */
function EmptyTransitsState() {
  const { push } = useGuardedNavigation()
  return (
    <View>
      <Text style={{ fontFamily: font.body }} className="mb-5 text-[16px] font-light leading-[1.85] text-slate-200/90">
        За да видиш транзитите си, първо трябва да имаш натална карта. Въведи рождените си данни.
      </Text>
      <Pressable
        onPress={() => push('/wizard/date')}
        className="self-start flex-row items-center rounded-full border border-amber-300/40 px-5 py-2.5"
        style={({ pressed }) => ({ ...pressFeedback(pressed), gap: 10 })}
      >
        <Text style={{ fontFamily: font.bodyMedium }} className="text-[15px] font-medium text-amber-200">
          Въведи рождени данни
        </Text>
        <Text style={{ fontFamily: font.body }} className="text-[15px] text-amber-300">›</Text>
      </Pressable>
    </View>
  )
}
