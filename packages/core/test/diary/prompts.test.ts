import { describe, expect, it } from 'vitest'
import { getManifestPrompt, MANIFEST_PROMPTS } from '../../src/diary/prompts'
import type { LunarPhaseId } from '../../src/lib/moon-phase'

const ALL_PHASES: LunarPhaseId[] = [
  'new',
  'waxing_crescent',
  'first_quarter',
  'waxing_gibbous',
  'full',
  'waning_gibbous',
  'last_quarter',
  'waning_crescent',
]

describe('MANIFEST_PROMPTS', () => {
  it('has an entry for every lunar phase', () => {
    for (const phase of ALL_PHASES) {
      expect(MANIFEST_PROMPTS[phase]).toBeDefined()
      expect(MANIFEST_PROMPTS[phase].length).toBeGreaterThan(0)
    }
  })

  it('has exactly 2 variants for last_quarter and 3 for every other phase', () => {
    // Documented in prompts.ts as a deliberate exception (§8.0 "register
    // consistency over mechanical variety") — pinning it here so a future
    // edit that silently drops a variant elsewhere is caught.
    for (const phase of ALL_PHASES) {
      const expected = phase === 'last_quarter' ? 2 : 3
      expect(MANIFEST_PROMPTS[phase].length).toBe(expected)
    }
  })
})

describe('getManifestPrompt', () => {
  it('returns variant 0 for entry count 0', () => {
    expect(getManifestPrompt('new', 0)).toBe(MANIFEST_PROMPTS.new[0])
  })

  it('returns variant N for entry count N, within range', () => {
    expect(getManifestPrompt('new', 1)).toBe(MANIFEST_PROMPTS.new[1])
    expect(getManifestPrompt('new', 2)).toBe(MANIFEST_PROMPTS.new[2])
  })

  it('wraps around via modulo once entry count reaches the variant count (3-variant phase)', () => {
    expect(getManifestPrompt('new', 3)).toBe(MANIFEST_PROMPTS.new[0])
    expect(getManifestPrompt('new', 4)).toBe(MANIFEST_PROMPTS.new[1])
    expect(getManifestPrompt('new', 5)).toBe(MANIFEST_PROMPTS.new[2])
    expect(getManifestPrompt('new', 6)).toBe(MANIFEST_PROMPTS.new[0])
  })

  it('wraps at 2, not 3, for last_quarter — the deliberate 2-variant phase', () => {
    expect(getManifestPrompt('last_quarter', 0)).toBe(MANIFEST_PROMPTS.last_quarter[0])
    expect(getManifestPrompt('last_quarter', 1)).toBe(MANIFEST_PROMPTS.last_quarter[1])
    expect(getManifestPrompt('last_quarter', 2)).toBe(MANIFEST_PROMPTS.last_quarter[0])
    expect(getManifestPrompt('last_quarter', 3)).toBe(MANIFEST_PROMPTS.last_quarter[1])
  })

  it('handles a large entry count correctly (many cycles of rotation)', () => {
    // 101 % 3 === 2
    expect(getManifestPrompt('full', 101)).toBe(MANIFEST_PROMPTS.full[2])
  })
})
