import { describe, expect, it } from 'vitest'
import { DIARY_REFLECTION_QUESTIONS, getDiaryFeelingLabel, getCompletedCheckInIterations, getCheckInDirections, getCheckInAnotherPrompt, getCheckInTopicPrompt, getDiaryOracleSuggestion, getDirectionQuestion, getReflectionQuestion, selectReflectionQuestion } from '../../src/diary/flow'
import { getDiaryDate, getNextReminderDueAt } from '../../src/diary/time'
import { createDiaryEntryV2Schema } from '../../src/diary/v2'
import { getManifestPromptSelection } from '../../src/diary/prompts'
import { buildFullDiaryMarkdown } from '../../src/diary/export-v2'

const base = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'completed' as const,
  occurredAt: '2026-09-28T17:00:00.000Z',
  entryDate: '2026-09-28',
  timezone: 'Europe/Sofia',
  title: null,
  topics: [],
  phaseId: null,
  phaseName: null,
  promptId: null,
  promptVersion: null,
  source: null,
  relatedEntryId: null,
  nextStep: null,
}

describe('diary v2 flow', () => {
  it('does not reinterpret old day ratings as specific feelings', () => {
    expect(getDiaryFeelingLabel({ mood: 2, content: {} })).toBe('Труден ден')
    expect(getDiaryFeelingLabel({ mood: 2, content: { feeling: 'anxious' } })).toBe('Тревожно')
    expect(getDiaryFeelingLabel({ mood: null, content: {} })).toBeNull()
  })

  it.each([
    ['sad', 1, 'Какво те натъжи?'], ['anxious', 2, 'Какво те тревожи?'],
    ['calm', 4, 'Какво ти донесе спокойствие?'], ['joyful', 5, 'Какво те зарадва?'],
  ] as const)('adapts follow-up questions to the feeling %s', (feeling, mood, question) => {
    expect(getCheckInTopicPrompt(mood, feeling)).toBe(question)
  })

  it('preserves feelings in saved notes and exports their labels', () => {
    const input = createDiaryEntryV2Schema.parse({ ...base, kind: 'note', mood: 2, content: { version: 1, body: 'Мисля за утрешния ден.', feeling: 'anxious' } })
    expect(input.content.feeling).toBe('anxious')
    const markdown = buildFullDiaryMarkdown([{ ...input, revision: 1, completedAt: base.occurredAt, createdAt: base.occurredAt, updatedAt: base.occurredAt }])
    expect(markdown).toContain('Тревожно')
    expect(markdown).not.toContain('2/5')
  })
  it('keeps the current answer when saving halfway through a check-in', () => {
    const current = {
      iterations: [], checkStep: 3, focusTopic: 'work' as const, direction: 'support' as const,
      reflectionQuestionId: 'work.support.1', reflectionQuestion: 'От каква подкрепа имаш нужда?',
      reflectionAnswer: '  От ясен приоритет за утре.  ', rejectedQuestionIds: [],
    }
    expect(getCompletedCheckInIterations(current)).toEqual([{
      topic: 'work', direction: 'support', questionId: 'work.support.1',
      question: current.reflectionQuestion, answer: 'От ясен приоритет за утре.', skippedQuestionIds: [],
    }])
    expect(current.iterations).toEqual([])
  })

  it('does not duplicate a reflection already added to the check-in', () => {
    const iteration = { topic: 'work' as const, direction: 'support' as const, questionId: 'work.support.1', question: 'Каква подкрепа ти е нужна?', answer: 'Почивка.', skippedQuestionIds: [] }
    expect(getCompletedCheckInIterations({ iterations: [iteration], checkStep: 4, focusTopic: 'work', direction: 'support', reflectionQuestionId: iteration.questionId, reflectionQuestion: iteration.question, reflectionAnswer: iteration.answer, rejectedQuestionIds: [] })).toEqual([iteration])
  })

  it('keeps earlier reflections when an additional question was left unanswered', () => {
    const iteration = { topic: 'work' as const, direction: 'support' as const, questionId: 'work.support.1', question: 'Каква подкрепа ти е нужна?', answer: 'Почивка.', skippedQuestionIds: [] }
    expect(getCompletedCheckInIterations({ iterations: [iteration], checkStep: 3, focusTopic: 'health', direction: 'understand', reflectionQuestionId: 'health.understand.1', reflectionQuestion: 'Как се чувстваш?', reflectionAnswer: ' ', rejectedQuestionIds: [] })).toEqual([iteration])
  })
  it('provides a broad curated question bank', () => {
    expect(DIARY_REFLECTION_QUESTIONS).toHaveLength(135)
  })
  it.each(['work', 'relationships', 'health', 'progress', 'other'] as const)('provides questions for every offered direction on %s', (topic) => {
    for (const option of getCheckInDirections(topic, 2)) {
      const question = selectReflectionQuestion({ entryId: 'daily', mood: 2, topics: [topic], direction: option.value })
      if (option.value === 'finish') expect(question).toBeNull()
      else {
        expect(question?.topic).toBe(topic)
        expect(question?.direction).toBe(option.value)
      }
    }
  })
  it('adapts direction labels to positive mood and the selected topic', () => {
    expect(getCheckInDirections('work', 5)[0].label).toContain('хубавия')
    expect(getCheckInDirections('work', 2)[1].label).toContain('работата')
  })
  it.each([
    [1, 'difficult'], [2, 'difficult'], [3, 'mixed'], [4, 'good'], [5, 'good'], [null, 'open'],
  ])('chooses a stable reflection branch for mood %s', (mood, id) => {
    expect(getReflectionQuestion(mood).id).toBe(id)
  })

  it('uses a repeat prompt for a positive next step', () => {
    expect(getDirectionQuestion('step', 5)).toContain('повториш')
    expect(getDirectionQuestion('finish', 1)).toBeNull()
  })

  it('adapts the topic and repeat prompts to the mood', () => {
    expect(getCheckInTopicPrompt(1)).toContain('притеснява')
    expect(getCheckInTopicPrompt(5)).toContain('внимание')
    expect(getCheckInAnotherPrompt(2)).toContain('друго')
  })

  it('selects a topic, direction, and mood-aware question without reading diary text', () => {
    const selected = selectReflectionQuestion({
      entryId: '11111111-1111-4111-8111-111111111111',
      mood: 1,
      topics: ['work'],
      direction: 'understand',
      history: [],
    })
    expect(selected?.topic).toBe('work')
    expect(selected?.direction).toBe('understand')
    expect(selected?.moods.some((mood) => mood === 'low' || mood === 'any')).toBe(true)
  })

  it('avoids a rejected question when another candidate exists', () => {
    const first = selectReflectionQuestion({ entryId: 'entry-1', mood: 4, topics: ['health'], direction: 'step' })
    const next = selectReflectionQuestion({ entryId: 'entry-1', mood: 4, topics: ['health'], direction: 'step', excludeQuestionIds: first ? [first.id] : [] })
    expect(next?.id).not.toBe(first?.id)
  })

  it.each([
    ['work', 'career'],
    ['relationships', 'love'],
    ['health', 'health'],
    ['progress', 'general'],
  ] as const)('maps diary topic %s to Oracle topic %s without diary text', (topic, expected) => {
    expect(getDiaryOracleSuggestion({ topics: [topic] }).topic).toBe(expected)
  })

  it('prefers the focused check-in topic for the Oracle suggestion', () => {
    expect(getDiaryOracleSuggestion({ topics: ['work', 'relationships'], content: { focusTopic: 'relationships' } }).topic).toBe('love')
  })

  it('keeps lunar prompt identity stable', () => {
    const selection = getManifestPromptSelection('full', 4)
    expect(selection.id).toBe('full:1')
    expect(selection.version).toBe(1)
    expect(selection.prompt).toEqual(getManifestPromptSelection('full', 1).prompt)
  })
})

describe('diary v2 validation', () => {
  it('accepts mood-only completed check-ins', () => {
    expect(createDiaryEntryV2Schema.safeParse({
      ...base,
      kind: 'check_in', mood: 3,
      content: { version: 1, flowVersion: 'check-in-v1', currentStep: 'close', reflectionQuestionId: null, reflectionQuestion: null, reflectionAnswer: '', direction: 'finish', detailQuestion: null, detailAnswer: '' },
    }).success).toBe(true)
  })

  it('accepts several reflection iterations in one check-in', () => {
    expect(createDiaryEntryV2Schema.safeParse({
      ...base,
      kind: 'check_in', mood: 2, topics: ['work', 'relationships'],
      content: {
        version: 1, flowVersion: 'check-in-v3', currentStep: 'close', focusTopic: 'relationships',
        questionVersion: 1, skippedQuestionIds: [], reflectionQuestionId: 'relationships.understand.1',
        reflectionQuestion: 'От какво имаше нужда?', reflectionAnswer: 'От повече яснота.',
        direction: 'understand', detailQuestion: null, detailAnswer: '',
        iterations: [
          { topic: 'work', direction: 'express', questionId: 'work.express.1', question: 'Какво остана в мислите ти?', answer: 'Една задача.', skippedQuestionIds: [] },
          { topic: 'relationships', direction: 'understand', questionId: 'relationships.understand.1', question: 'От какво имаше нужда?', answer: 'От повече яснота.', skippedQuestionIds: [] },
        ],
      },
    }).success).toBe(true)
  })

  it('rejects empty completed notes but permits them as drafts', () => {
    const note = { ...base, kind: 'note' as const, mood: null, content: { version: 1 as const, body: '' } }
    expect(createDiaryEntryV2Schema.safeParse(note).success).toBe(false)
    expect(createDiaryEntryV2Schema.safeParse({ ...note, status: 'draft' }).success).toBe(true)
  })

  it('accepts partial lunar practices', () => {
    expect(createDiaryEntryV2Schema.safeParse({
      ...base, kind: 'lunar_practice', mood: null, phaseId: 'full', phaseName: 'Пълнолуние', promptId: 'full:0', promptVersion: 1,
      content: { version: 1, promptId: 'full:0', promptVersion: 1, heading: 'Благодарност', lead: '', fieldLabels: ['A', 'B', 'C'], answers: ['Едно', '', ''] },
    }).success).toBe(true)
  })
})

describe('diary timezone', () => {
  it('groups around the Sofia midnight boundary', () => {
    expect(getDiaryDate(new Date('2026-01-01T21:59:59Z'), 'Europe/Sofia')).toBe('2026-01-01')
    expect(getDiaryDate(new Date('2026-01-01T22:00:00Z'), 'Europe/Sofia')).toBe('2026-01-02')
  })

  it('calculates reminder UTC time across daylight saving time', () => {
    expect(getNextReminderDueAt('20:00', 'Europe/Sofia', new Date('2026-01-15T10:00:00Z')).toISOString()).toBe('2026-01-15T18:00:00.000Z')
    expect(getNextReminderDueAt('20:00', 'Europe/Sofia', new Date('2026-07-15T10:00:00Z')).toISOString()).toBe('2026-07-15T17:00:00.000Z')
  })
})
