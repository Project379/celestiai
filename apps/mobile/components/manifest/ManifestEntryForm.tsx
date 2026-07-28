import { useEffect, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import type { LunarPhase } from '@stellaeum/core/moon-phase'
import { getManifestPrompt } from '@stellaeum/core/diary/prompts'
import type { ManifestEntry } from '@stellaeum/core/diary/types'

import { color, font, pressFeedback, rhythm, type } from '@/components/design-system/tokens'

interface ManifestEntryFormProps {
  phase: LunarPhase
  existing: ManifestEntry | null
  entryCountForPhase: number
  onSave: (intentions: [string, string, string]) => void
}

/**
 * Лунен дневник — three-field intention form, phase-driven prompt.
 * Rebuilt (this batch) against journal-v1.html (ratified): each field is
 * Оракул's own ask-line device (bronze underline + italic placeholder),
 * not a bordered/filled box — same "no cards, bronze is a fitting not a
 * container" rule as the rest of this design system. Heading/lead now
 * render in font.displaySemibold/font.bodyItalic (was font-cinzel, which
 * has no Cyrillic glyphs at all — heading/lead are Bulgarian text, so
 * that was a silent fallback-font bug, not a style choice).
 *
 * Prompt heading/lead/fieldLabels/placeholders come from
 * @stellaeum/core/diary/prompts via getManifestPrompt() — variants
 * cycle by per-phase entry count (entryCountForPhase % variants.length).
 * Mobile and web pull from the same module after the P.4-a lift.
 *
 * `today` prop dropped (this batch): the phase-name + date caption that
 * used to render under prompt.heading/lead duplicated
 * ManifestDiaryContent's own dateline (the one directly under «лунен
 * дневник») — same two facts, shown twice on one screen. Kept the one
 * under the heading, removed this one.
 */
export function ManifestEntryForm({
  phase,
  existing,
  entryCountForPhase,
  onSave,
}: ManifestEntryFormProps) {
  const prompt = getManifestPrompt(phase.id, entryCountForPhase)
  const [values, setValues] = useState<[string, string, string]>(
    existing ? [...existing.intentions] : ['', '', ''],
  )
  const [savedFlash, setSavedFlash] = useState(false)

  // Seed form from existing entry when it loads (matches web hook's async
  // hydration pattern; existing flips from null to non-null after the
  // TanStack query resolves).
  useEffect(() => {
    if (existing) setValues([...existing.intentions])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id])

  const handleChange = (index: 0 | 1 | 2) => (text: string) => {
    const next: [string, string, string] = [...values] as [string, string, string]
    next[index] = text
    setValues(next)
  }

  const allFilled = values.every((v) => v.trim().length > 0)

  const handleSubmit = () => {
    if (!allFilled) return
    onSave(values.map((v) => v.trim()) as [string, string, string])
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2400)
  }

  return (
    <View style={{ gap: rhythm.group }}>
      <View>
        <Text style={{ fontFamily: font.displaySemibold, fontSize: 23, color: color.starlight, letterSpacing: -0.11 }}>
          {prompt.heading}
        </Text>
        {/* Founder correction (this batch, round 6): this screen missed
            the font-size uniformity pass moon-detail.tsx got — sized to
            `type.body` (17px/27 lineHeight) here now, same as
            physicalAppearance/field bodies there and the sign block's
            own quip text. */}
        <Text
          style={{
            fontFamily: font.bodyItalic,
            fontStyle: 'italic',
            fontSize: type.body.fontSize,
            lineHeight: type.body.lineHeight,
            color: color.muted,
            marginTop: rhythm.tight,
          }}
        >
          {prompt.lead}
        </Text>
      </View>

      <View style={{ gap: 26 }}>
        {[0, 1, 2].map((i) => {
          const idx = i as 0 | 1 | 2
          return (
            <Field
              key={i}
              label={prompt.fieldLabels[idx]}
              placeholder={prompt.placeholders[idx]}
              value={values[idx]}
              onChangeText={handleChange(idx)}
            />
          )
        })}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          borderTopWidth: 1,
          borderTopColor: 'rgba(226,232,240,0.08)',
          paddingTop: rhythm.paragraph,
        }}
      >
        <Text style={{ flex: 1, ...type.body, color: color.faint }}>
          {existing
            ? 'Вече писа днес — можеш да поправяш, докато цикълът не се смени.'
            : 'Запази, когато и трите са готови.'}
        </Text>
        <Pressable
          onPress={handleSubmit}
          disabled={!allFilled}
          style={({ pressed }) => ({ ...pressFeedback(pressed), opacity: allFilled ? (pressed ? 0.6 : 1) : 0.4 })}
        >
          <Text
            style={{
              fontFamily: font.displaySemibold,
              fontSize: 14,
              letterSpacing: 0.1,
              color: color.bronzeText,
              // Founder correction (this batch): gets the glow «Повече
              // детайли» explicitly does NOT — this is a live, tappable
              // commit action (same "lit phrase" language as CtaPanel's
              // invitations), only when actually enabled.
              ...(allFilled
                ? { textShadowColor: 'rgba(184,118,62,0.6)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } }
                : null),
            }}
          >
            {existing ? 'Обнови' : 'Запази в дневника'}
          </Text>
        </Pressable>
      </View>

      {savedFlash && (
        <Text style={{ textAlign: 'right', fontFamily: font.displayRegular, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: color.bronzeText }}>
          Записано в дневника
        </Text>
      )}
    </View>
  )
}

interface FieldProps {
  label: string
  placeholder: string
  value: string
  onChangeText: (text: string) => void
}

// Оракул's own ask-line device (ratified journal-v1.html): a tracked
// bronze caption above a single bottom-border line, italic placeholder —
// no box, no fill, no border on three sides. Replaces the prior
// rounded-lg bordered-box TextInput.
function Field({ label, placeholder, value, onChangeText }: FieldProps) {
  return (
    <View>
      {/* Founder correction (this batch, round 6): matched to
          moon-detail.tsx's own Field-label caption (12px/0.29
          letterSpacing) instead of a one-off 11px/1.54 — same nested
          "small caption above a value" role on both screens. */}
      <Text
        style={{
          fontFamily: font.displayRegular,
          fontSize: 12,
          letterSpacing: 0.29,
          textTransform: 'uppercase',
          color: color.bronzeText,
          marginBottom: 8,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(93,106,130,0.7)"
        multiline
        numberOfLines={2}
        maxLength={500}
        textAlignVertical="top"
        style={{
          fontFamily: font.bodyItalic,
          fontStyle: 'italic',
          fontSize: type.body.fontSize,
          lineHeight: type.body.lineHeight,
          color: color.text,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(184,118,62,0.5)',
          paddingBottom: 9,
          minHeight: 44,
        }}
      />
    </View>
  )
}
