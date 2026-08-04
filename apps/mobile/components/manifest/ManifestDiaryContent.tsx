import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { getLunarPhase, type LunarPhase } from '@stellaeum/core/moon-phase'

import { ManifestEntryForm } from './ManifestEntryForm'
import { ManifestHistory } from './ManifestHistory'
import { MoonGlyph } from '@/components/dashboard/MoonGlyph'
import { color, font, pressFeedback, rhythm } from '@/components/design-system/tokens'
import { useManifestEntries } from '@/hooks/useManifestEntries'
import { shareDiaryMarkdown } from '@/lib/diary/export'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'

const BG_DATE = new Intl.DateTimeFormat('bg-BG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Sofia',
})

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Лунен дневник root — hero + form + history + footer. Mobile port of
 * apps/web/components/manifest/ManifestDiaryContent.tsx (P.4-c1).
 *
 * Live phase state refreshed every minute so the prompt follows the sky
 * (same cadence as web). Ambient SVG radial-gradient overlays at the hero
 * block per HT 7 ratification (mobile editorial visual parity); P.2-e
 * WheelArrivalContainer's gradient pattern reused. No framer-motion entry
 * animations per HT 8 (data-display screen).
 */
export function ManifestDiaryContent() {
  const { push } = useGuardedNavigation()
  const [phase, setPhase] = useState<LunarPhase>(() => getLunarPhase())
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date()
      setNow(d)
      setPhase(getLunarPhase(d))
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  const today = useMemo(() => isoDate(now), [now])
  const todayFormatted = BG_DATE.format(now)

  const { entries, isLoaded, error, saveEntry, findByDate, clearError } =
    useManifestEntries()
  const existingToday = findByDate(today)
  const entryCountForPhase = useMemo(
    () => entries.filter((e) => e.phaseId === phase.id).length,
    [entries, phase.id],
  )

  const handleSave = (intentions: [string, string, string]) => {
    saveEntry({
      date: today,
      phaseId: phase.id,
      phaseName: phase.name,
      intentions,
    })
  }

  const handleShare = () => {
    void shareDiaryMarkdown(entries, now)
  }

  return (
    <View>
      {/* Hero rebuilt from scratch against journal-v1.html (ratified) —
          extends lunar-diary-v4.html's own read-mode language (mini-moon +
          dateline, warm-with-one-cool-touch) rather than the SVG-gradient
          hero + static "Три реда, един цикъл" tagline this screen carried
          before. The per-phase heading/lead (ManifestEntryForm, below) now
          carry the role that static tagline used to — no duplicate
          headline. rhythm.tsx was not open while designing this. */}
      <View style={{ marginBottom: rhythm.group, alignItems: 'center' }}>
        {/* Founder correction (this batch, round 6): matched to chart.tsx's
            «натална карта» specimen label — same 13px/0.32 letterSpacing
            treatment, the app's actual dominant heading convention.
            Founder correction (this batch, round 7): color corrected to
            bronze (color.bronzeText). «натална карта» itself stays faint
            deliberately — chart.tsx documents Карта as a COOL-temperature
            screen where bronze is reserved for the invite/pedestal
            fittings only. This screen (Лунен дневник) is warm, same as
            Днес, where bronze IS the caption/heading color — matching
            faint here would've copied a cool-screen rule onto a warm
            screen. Still centered (round 3) — the floating BackButton
            sits top-left of every pushed screen and would otherwise
            overlap a left-aligned label. */}
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
          лунен дневник
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
          <MoonGlyph illumination={phase.illumination} isWaxing={phase.isWaxing} size={20} animated={false} outlineWidth={0} darkOpacity={0.85} />
          <Text style={{ fontFamily: font.mono, fontSize: 10.5, letterSpacing: 0.4, color: color.cool }}>
            {todayFormatted} · {phase.name.toLowerCase()}
          </Text>
        </View>
      </View>

      {error && (
        <View
          className="mb-8 flex-row items-start rounded-xl border border-rose-400/15 bg-rose-500/[0.04] px-5 py-4"
          style={{ gap: 12 }}
          accessibilityRole="alert"
        >
          <Text className="flex-1 text-[13px] leading-[1.7] text-rose-300/90">
            {error.message}
          </Text>
          <Pressable
            onPress={clearError}
            accessibilityLabel="Затвори"
            hitSlop={12}
            className="rounded-full px-2 py-1"
            style={({ pressed }) => pressFeedback(pressed)}
          >
            <Text className="font-cinzel text-[11px] text-rose-300/70">✕</Text>
          </Pressable>
        </View>
      )}

      <View className="mb-14">
        {!isLoaded ? (
          <Text className="text-[14px] text-slate-500">Разгръщам дневника...</Text>
        ) : (
          <ManifestEntryForm
            phase={phase}
            existing={existingToday}
            entryCountForPhase={entryCountForPhase}
            onSave={handleSave}
          />
        )}
      </View>

      {/* Founder correction (this batch): both blocks below still carried
          font-cinzel on Bulgarian text — Cinzel has no Cyrillic glyphs
          (see tokens.ts's own warning), so "Предишни страници"/"Сподели
          дневника"/the guide sentence were silently rendering in a
          fallback font, not a style choice. Rebuilt in the same token
          family as the rest of this redesign (font.displayRegular for
          tracked caps, font.body for reading text, color.bronzeText for
          the one live link) instead of nativewind's slate/amber classes. */}
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 16, marginBottom: rhythm.paragraph }}>
          <Text style={{ fontFamily: font.displayRegular, fontSize: 12, letterSpacing: 1.68, textTransform: 'uppercase', color: color.bronzeText }}>
            Предишни страници
          </Text>
          <View style={{ height: 1, flex: 1, backgroundColor: 'rgba(226,232,240,0.1)' }} />
          <Text style={{ fontFamily: font.mono, fontSize: 10, color: color.faint }}>
            {entries.length} {entries.length === 1 ? 'запис' : 'записа'}
          </Text>
          {entries.length > 0 && (
            <Pressable onPress={handleShare} hitSlop={8} style={({ pressed }) => pressFeedback(pressed)}>
              <Text style={{ fontFamily: font.displayRegular, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: color.faint }}>
                ↗ Сподели дневника
              </Text>
            </Pressable>
          )}
        </View>

        {isLoaded && (
          <ManifestHistory entries={entries} currentDate={today} />
        )}
      </View>

      <View style={{ marginTop: rhythm.group + 24, borderTopWidth: 1, borderTopColor: 'rgba(226,232,240,0.08)', paddingTop: rhythm.paragraph }}>
        <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 23.8, color: color.faint }}>
          За повече за лунните фази — задача и облик за всяка — виж{' '}
          <Text onPress={() => push('/you/guide')} style={{ fontFamily: font.bodyMedium, color: color.bronzeText }}>
            Ръководството
          </Text>
          .
        </Text>
      </View>
    </View>
  )
}
