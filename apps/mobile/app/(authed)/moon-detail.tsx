import { Text, View } from 'react-native'

import { getLunarPhase } from '@stellaeum/core/moon-phase'

import { MoonGlyph } from '@/components/dashboard/MoonGlyph'
import { CtaPanel } from '@/components/design-system/CtaPanel'
import { ScreenShell } from '@/components/design-system/ScreenShell'
import { color, font, rhythm, type } from '@/components/design-system/tokens'
import { formatDaysHours } from '@/lib/formatDaysHours'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'

/**
 * «Повече детайли» destination — reached from Днес's небесен ритъм block.
 * Rebuilt from scratch against dnes-v4.html's own warm language (this
 * batch), replacing the LunarPhaseCard port that shipped here previously.
 * LunarPhaseCard.tsx, rhythm.tsx, and the prior version of this file were
 * not open while designing — see .planning/design/mockups/moon-detail-v1.html
 * (ratified) for the source of every layout/type/spacing decision below.
 *
 * Static content only (no expand/collapse, no meteor-shower banner, no
 * "за лунните фази" accordion) — this screen is the phase's own detail
 * view, not a port of Ритъм's card. Content is 1:1 from
 * packages/core/src/lib/moon-phase.ts's PHASE_META for the current phase;
 * nothing here is invented copy.
 *
 * Closing invitation reuses CtaPanel — the same "screen's one true exit"
 * primitive Днес's «Питай Оракула» and Карта's «Детайли»/Pedestal already
 * use for their own single exits. That's a different case from «Повече
 * детайли» on Днес (fixed this batch): CtaPanel is fine when it IS the
 * screen's one exit, wrong when it's a second one competing with another.
 */
export default function MoonDetailScreen() {
  const { push } = useGuardedNavigation()
  const phase = getLunarPhase()
  const countdown =
    phase.nextMajor.daysAway < 1 / 24 ? 'съвсем скоро' : formatDaysHours(phase.nextMajor.daysAway)

  return (
    <ScreenShell temperature="warm" back stars>
      {/* Founder correction (this batch, round 6): every one-off text
          size on this screen (12/3.5-letterspacing, 14, 13.5,
          10.5/2.3-letterspacing...) was already replaced once with
          index.tsx's SECTION_CAPTION_STYLE (12px/0.29/bronzeText) for
          this caption. Corrected again: the actual dominant heading SIZE
          convention across the app is chart.tsx's «натална карта»
          specimen label (13px/0.32 letterSpacing) — matched to that.
          Founder correction (this batch, round 7): color corrected to
          bronze (color.bronzeText), not «натална карта»'s own faint —
          that screen (Карта) is documented COOL-temperature, where bronze
          is reserved for the invite/pedestal fittings only. This screen
          (moon-detail) is warm, same as Днес, where bronze IS the
          caption/heading color. Reading/body text below still uses
          tokens.ts's `type.body` (17px/27 lineHeight, the sign block's
          own quip size) — that part of round 4 stands. */}
      <Text
        style={{
          fontFamily: font.displayRegular,
          fontSize: 13,
          letterSpacing: 0.32,
          color: color.bronzeText,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        небесен ритъм
      </Text>

      <Text
        style={{
          fontFamily: font.displaySemibold,
          fontSize: 26,
          color: color.starlight,
          textAlign: 'center',
          marginTop: 10,
          letterSpacing: -0.13,
        }}
      >
        {phase.name}
      </Text>
      {/* subLabel matches MoonHero's own subLabel treatment (Днес) —
          same eyebrow+data-line pairing, same 15px/italic/muted — rather
          than a size invented separately for this screen. */}
      <Text
        style={{
          fontFamily: font.bodyItalic,
          fontStyle: 'italic',
          fontSize: 15,
          color: color.muted,
          textAlign: 'center',
          marginTop: 5,
        }}
      >
        {phase.illumination}% осветена · до {phase.nextMajor.name.toLowerCase()}: {countdown}
      </Text>

      <View style={{ alignItems: 'center', marginTop: rhythm.group }}>
        <MoonGlyph
          illumination={phase.illumination}
          isWaxing={phase.isWaxing}
          size={172}
          outlineWidth={0}
          haloRatio={1.4}
          haloGradient="bronzeViolet"
          darkOpacity={0.88}
          depthDouble
        />
      </View>

      <Text
        style={{
          ...type.body,
          color: color.text,
          textAlign: 'center',
          marginTop: rhythm.group,
          paddingHorizontal: 6,
        }}
      >
        {phase.physicalAppearance}
      </Text>

      <View style={{ marginTop: rhythm.group + 10, borderTopWidth: 1, borderTopColor: 'rgba(226,232,240,0.08)' }}>
        <Field label="Най-добра за" body={phase.bestFor} first />
        <Field label="Афирмация" body={phase.affirmation} italic />
        <Field label="Кристал" body={phase.crystal} />
        <Field label="Ритуал" body={phase.ritual} />
      </View>

      <View style={{ marginTop: rhythm.group + 10 }}>
        <Text
          style={{
            fontFamily: font.bodyItalic,
            fontStyle: 'italic',
            fontSize: type.body.fontSize,
            lineHeight: type.body.lineHeight,
            color: color.muted,
            textAlign: 'center',
            marginBottom: rhythm.paragraph,
            paddingHorizontal: 6,
          }}
        >
          {phase.journalPrompt}
        </Text>
        <CtaPanel label="Лунен Дневник" onPress={() => push('/rhythm/journal')} />
      </View>
    </ScreenShell>
  )
}

function Field({ label, body, italic, first }: { label: string; body: string; italic?: boolean; first?: boolean }) {
  return (
    <View
      style={{
        paddingVertical: 16,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: 'rgba(226,232,240,0.06)',
      }}
    >
      <Text
        style={{
          fontFamily: font.displayRegular,
          fontSize: 12,
          letterSpacing: 0.29,
          textTransform: 'uppercase',
          color: color.bronzeText,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          ...type.body,
          fontFamily: italic ? font.bodyItalic : font.body,
          fontStyle: italic ? 'italic' : 'normal',
          color: color.text,
          marginTop: 7,
        }}
      >
        {body}
      </Text>
    </View>
  )
}
