import { describe, expect, it } from 'vitest'
import { buildSystemPrompt, type ReadingTopic } from '@/lib/oracle/prompts'

describe('buildSystemPrompt', () => {
  it.each<ReadingTopic>(['general', 'love', 'career', 'health'])(
    'keeps the %s Oracle reading concise',
    (topic) => {
      const prompt = buildSystemPrompt(topic)

      expect(prompt).toContain('exactly 6 to 8 complete sentences')
      expect(prompt).toContain('3 compact paragraphs')
      expect(prompt).toContain('between 800 and 1200 characters')
    },
  )
})
