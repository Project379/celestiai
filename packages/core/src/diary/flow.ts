import type { DiaryTopic } from './flow-types'

export type DiaryDirection = 'express' | 'understand' | 'step' | 'finish'

export interface DiaryQuestionHistoryItem {
  entryId: string
  questionId: string | null
  skippedQuestionIds?: string[]
  topics: DiaryTopic[]
  direction: DiaryDirection | null
  mood: number | null
}

export interface DiaryReflectionQuestion {
  id: string
  text: string
  topic: DiaryTopic
  direction: Exclude<DiaryDirection, 'finish'>
  moods: readonly ('low' | 'mixed' | 'high' | 'any')[]
  pattern?: boolean
}

export const DIARY_MOODS = [
  { value: 1, label: 'Много тежко' },
  { value: 2, label: 'Трудно' },
  { value: 3, label: 'Смесено' },
  { value: 4, label: 'Добре' },
  { value: 5, label: 'Много добре' },
] as const

export const DIARY_TOPICS: readonly { value: DiaryTopic; label: string }[] = [
  { value: 'work', label: 'Работа и учене' },
  { value: 'relationships', label: 'Отношения' },
  { value: 'health', label: 'Здраве и енергия' },
  { value: 'progress', label: 'Личен напредък' },
  { value: 'other', label: 'Друго' },
]

export const CHECK_IN_DIRECTIONS: readonly { value: DiaryDirection; label: string }[] = [
  { value: 'express', label: 'Да го изразя' },
  { value: 'understand', label: 'Да го осмисля' },
  { value: 'step', label: 'Да избера следваща стъпка' },
  { value: 'finish', label: 'Не сега' },
]

export function getCheckInTopicPrompt(mood: number | null): string {
  if (mood !== null && mood <= 2) return 'Какво те притеснява най-много?'
  if (mood === 3) return 'Кое е най-силно в мислите ти?'
  if (mood !== null && mood >= 4) return 'На какво искаш да обърнеш внимание?'
  return 'Какво е най-силно в мислите ти?'
}

export function getCheckInAnotherPrompt(mood: number | null): string {
  return mood !== null && mood <= 3
    ? 'Притеснява ли те нещо друго?'
    : 'Има ли още нещо, върху което искаш да помислиш?'
}

export function getDiaryEntryDisplayTitle(entry: {
  title: string | null
  phaseName: string | null
  kind: 'legacy_lunar' | 'check_in' | 'note' | 'lunar_practice'
  entryDate: string
  content: unknown
}): string {
  if (entry.title?.trim()) return entry.title.trim()
  if (entry.kind === 'lunar_practice') {
    const heading = (entry.content as { heading?: unknown } | null)?.heading
    if (typeof heading === 'string' && heading.trim()) return heading.trim()
  }
  if (entry.phaseName?.trim()) return entry.phaseName.trim()
  const kind = entry.kind === 'check_in'
    ? 'Проверка'
    : entry.kind === 'note'
      ? 'Свободен запис'
      : 'Лунен дневник'
  return `${kind} · ${entry.entryDate}`
}

export type DiaryOracleTopic = 'general' | 'love' | 'career' | 'health'

export function getDiaryOracleSuggestion(entry: {
  topics: readonly DiaryTopic[]
  content?: unknown
}): { topic: DiaryOracleTopic; eyebrow: string; title: string; description: string; action: string } {
  const focusTopic = (entry.content as { focusTopic?: DiaryTopic | null } | null)?.focusTopic
  const topic = focusTopic ?? entry.topics[0] ?? 'other'
  if (topic === 'work') return {
    topic: 'career',
    eyebrow: 'Продължи с Оракула',
    title: 'Разгледай темата за работата',
    description: 'Получи прочит за силните си страни, посоката и предизвикателствата в професионалния път.',
    action: 'Към прочита за кариера',
  }
  if (topic === 'relationships') return {
    topic: 'love',
    eyebrow: 'Продължи с Оракула',
    title: 'Погледни по-дълбоко в отношенията',
    description: 'Получи прочит за емоционалните си нужди и начина, по който създаваш близост.',
    action: 'Към прочита за любов',
  }
  if (topic === 'health') return {
    topic: 'health',
    eyebrow: 'Продължи с Оракула',
    title: 'Разгледай темата за енергията си',
    description: 'Получи прочит за личния си ритъм, възстановяването и грижата за себе си.',
    action: 'Към прочита за здраве',
  }
  return {
    topic: 'general',
    eyebrow: 'Продължи с Оракула',
    title: 'Опознай темата през своята личност',
    description: 'Получи личностен прочит за вътрешните си мотиви, силните страни и начина, по който взимаш решения.',
    action: 'Към личностния прочит',
  }
}

type MoodBand = 'low' | 'mixed' | 'high' | 'any'
type QuestionSeed = readonly [text: string, moods: readonly MoodBand[], pattern?: boolean]

const QUESTION_TEXTS: Record<DiaryTopic, Record<Exclude<DiaryDirection, 'finish'>, readonly QuestionSeed[]>> = {
  work: {
    express: [
      ['Кое от работния ден още стои в мислите ти?', ['any']],
      ['Какво ти се искаше да кажеш, но остана неизказано?', ['low', 'mixed']],
      ['Кой момент те натовари най-много?', ['low']],
      ['Кой момент от деня ти донесе удовлетворение?', ['high']],
      ['Какво в работата напоследък се повтаря за теб?', ['any'], true],
      ['Какво искаш да оставиш извън работния ден?', ['any']],
    ],
    understand: [
      ['Кое те повлия повече — задачата, очакването или начинът, по който се случи?', ['low', 'mixed']],
      ['Къде пое повече, отколкото можеше да носиш спокойно?', ['low']],
      ['Кое беше в твоя контрол и кое не беше?', ['any']],
      ['Кое твое действие помогна денят да мине добре?', ['high']],
      ['Какъв работен модел забелязваш да се повтаря?', ['any'], true],
      ['Какво ти показва реакцията ти за това, което цениш в работата?', ['any']],
    ],
    step: [
      ['Коя е най-малката стъпка, която ще облекчи утрешния ден?', ['low', 'mixed']],
      ['Какво можеш да отложиш, откажеш или делегираш?', ['low']],
      ['Кой е един ясен приоритет за утре?', ['any']],
      ['Какво от днес си струва да повториш?', ['high']],
      ['Каква малка промяна би прекъснала повтарящия се модел?', ['any'], true],
      ['От какво имаш нужда, за да започнеш утре по-спокойно?', ['any']],
    ],
  },
  relationships: {
    express: [
      ['Какво ти се искаше другият човек да разбере?', ['any']],
      ['Какво почувства, но не успя да кажеш?', ['low', 'mixed']],
      ['Коя част от случилото се те засегна най-силно?', ['low']],
      ['Кой жест или разговор те накара да се почувстваш близо до някого?', ['high']],
      ['Какво остава неизказано в тези отношения напоследък?', ['any'], true],
      ['Какво искаш да признаеш пред себе си за тези отношения?', ['any']],
    ],
    understand: [
      ['От какво имаше нужда в този момент?', ['any']],
      ['Кое принадлежи на теб и кое — на другия човек?', ['low', 'mixed']],
      ['Какво предположи, без да го провериш?', ['mixed']],
      ['Какво направи тази среща или разговор ценен?', ['high']],
      ['Какъв модел забелязваш в отношенията си напоследък?', ['any'], true],
      ['Какво може да изглежда различно от гледната точка на другия човек?', ['any']],
    ],
    step: [
      ['Има ли нещо, което искаш да кажеш спокойно и ясно?', ['any']],
      ['Каква граница би ти помогнала?', ['low']],
      ['Какъв малък жест би създал повече близост?', ['mixed', 'high']],
      ['Как можеш да покажеш признателност за добрия момент?', ['high']],
      ['Какво можеш да направиш различно при следващ подобен момент?', ['any'], true],
      ['Кой разговор си струва да започнеш?', ['any']],
    ],
  },
  health: {
    express: [
      ['Какво ти подсказва тялото днес?', ['any']],
      ['Къде усещаш най-много напрежение или умора?', ['low', 'mixed']],
      ['От какво имаш нужда, но все отлагаш?', ['low']],
      ['Кога днес имаше най-много енергия?', ['high']],
      ['Какво усещане се повтаря напоследък?', ['any'], true],
      ['Кои три думи описват състоянието ти днес?', ['any']],
    ],
    understand: [
      ['Какво ти даде енергия и какво ти я отне?', ['any']],
      ['Какво се случи преди да се почувстваш така?', ['low', 'mixed']],
      ['Как почивката, храната или движението повлияха на деня ти?', ['any']],
      ['Кой избор ти помогна да се почувстваш добре?', ['high']],
      ['Какъв ритъм забелязваш в енергията си напоследък?', ['any'], true],
      ['Коя част от деня повлия най-силно на състоянието ти?', ['any']],
    ],
    step: [
      ['Коя малка грижа можеш да си дадеш днес?', ['low', 'mixed']],
      ['Какво можеш да намалиш, за да си дадеш повече въздух?', ['low']],
      ['Какво би подкрепило енергията ти утре?', ['any']],
      ['Кой полезен избор от днес искаш да повториш?', ['high']],
      ['Коя малка промяна би подкрепила ритъма ти през следващите дни?', ['any'], true],
      ['Как можеш да си осигуриш малко повече почивка?', ['any']],
    ],
  },
  progress: {
    express: [
      ['Как се чувстваш спрямо собствения си напредък?', ['any']],
      ['Какво те обезкуражи днес?', ['low']],
      ['Къде усещаш, че си между старото и новото?', ['mixed']],
      ['Коя малка победа не искаш да подминеш?', ['high']],
      ['Коя тема в развитието ти се връща напоследък?', ['any'], true],
      ['От какво в развитието си изпитваш най-голяма гордост?', ['high', 'any']],
    ],
    understand: [
      ['С какво сравняваш напредъка си?', ['low', 'mixed']],
      ['Кое очакване към себе си е прекалено тежко?', ['low']],
      ['Какво вече правиш по различен начин?', ['any']],
      ['Кое твое качество помогна за този успех?', ['high']],
      ['Какъв модел виждаш в моментите, когато напредваш или зацикляш?', ['any'], true],
      ['Кое доказателство за напредък пропускаш да забележиш?', ['any']],
    ],
    step: [
      ['Коя е следващата реалистична стъпка?', ['any']],
      ['Как можеш да направиш целта по-малка и по-лека?', ['low']],
      ['Какво си струва да продължиш, дори и бавно?', ['mixed']],
      ['Как ще надградиш днешния напредък?', ['high']],
      ['Кое едно действие може да промени повтарящия се модел?', ['any'], true],
      ['Кога конкретно можеш да направиш следващата стъпка?', ['any']],
    ],
  },
  other: {
    express: [
      ['Кое е най-силно в мислите ти сега?', ['any']],
      ['Какво остана неизказано?', ['low', 'mixed']],
      ['Коя част от случилото се тежи най-много?', ['low']],
      ['Какво направи този момент хубав?', ['high']],
      ['Какво се връща в мислите ти напоследък?', ['any'], true],
      ['Кое чувство е най-близо до преживяното?', ['any']],
    ],
    understand: [
      ['Кое е най-важното в това за теб?', ['any']],
      ['Кое беше в твоя контрол и кое не беше?', ['low', 'mixed']],
      ['Каква нужда стои зад чувството ти?', ['any']],
      ['Какво ти показа този добър момент?', ['high']],
      ['Какво общо виждаш между този и предишни подобни моменти?', ['any'], true],
      ['Какво промени това за теб?', ['any']],
    ],
    step: [
      ['Какво искаш да бъде различно утре?', ['any']],
      ['Коя е най-малката възможна стъпка оттук нататък?', ['low', 'mixed']],
      ['Каква подкрепа би ти помогнала?', ['low']],
      ['Какво от този момент искаш да запазиш?', ['high']],
      ['Какво можеш да опиташ различно следващия път?', ['any'], true],
      ['Към кого или какво можеш да се обърнеш за подкрепа?', ['any']],
    ],
  },
}

export const DIARY_REFLECTION_QUESTIONS: readonly DiaryReflectionQuestion[] = Object.entries(QUESTION_TEXTS).flatMap(
  ([topic, directions]) => Object.entries(directions).flatMap(([direction, questions]) =>
    questions.map(([text, moods, pattern], index) => ({
      id: `${topic}.${direction}.${index + 1}`,
      text,
      topic: topic as DiaryTopic,
      direction: direction as Exclude<DiaryDirection, 'finish'>,
      moods,
      pattern,
    })),
  ),
)

function moodBand(mood: number | null): MoodBand {
  if (mood === null) return 'any'
  if (mood <= 2) return 'low'
  if (mood === 3) return 'mixed'
  return 'high'
}

function stableNumber(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function selectReflectionQuestion(input: {
  entryId: string
  mood: number | null
  topics: readonly DiaryTopic[]
  focusTopic?: DiaryTopic | null
  direction: DiaryDirection | null
  history?: readonly DiaryQuestionHistoryItem[]
  excludeQuestionIds?: readonly string[]
}): DiaryReflectionQuestion | null {
  if (!input.direction || input.direction === 'finish') return null
  const topic = input.focusTopic ?? input.topics[0] ?? 'other'
  const band = moodBand(input.mood)
  const history = (input.history ?? []).filter((item) => item.entryId !== input.entryId)
  const recentIds = history.slice(0, 12).map((item) => item.questionId).filter(Boolean)
  const recentlySkippedIds = new Set(history.slice(0, 12).flatMap((item) => item.skippedQuestionIds ?? []))
  const topicCount = history.filter((item) => item.topics.includes(topic)).length
  const excluded = new Set(input.excludeQuestionIds ?? [])
  const matching = DIARY_REFLECTION_QUESTIONS.filter(
    (question) => question.topic === topic && question.direction === input.direction,
  )
  const candidates = matching.filter((question) => !excluded.has(question.id))
  const available = candidates.length > 0 ? candidates : matching

  return available
    .map((question) => {
      const recentIndex = recentIds.indexOf(question.id)
      const moodScore = question.moods.includes(band) ? 30 : question.moods.includes('any') ? 18 : 0
      const patternScore = question.pattern && topicCount >= 3 ? 24 : question.pattern ? -8 : 0
      const repetitionPenalty = recentIndex >= 0 ? 100 - recentIndex * 5 : 0
      const skippedPenalty = recentlySkippedIds.has(question.id) ? 50 : 0
      const tieBreaker = stableNumber(`${input.entryId}:${question.id}`) % 17
      return { question, score: moodScore + patternScore + tieBreaker - repetitionPenalty - skippedPenalty }
    })
    .sort((left, right) => right.score - left.score || left.question.id.localeCompare(right.question.id))[0]?.question ?? null
}

/** Compatibility helper for previously stored check-in-v1 entries. */
export function getReflectionQuestion(mood: number | null): { id: string; text: string } {
  if (mood === null) return { id: 'open', text: 'Кое е най-силно в мислите ти сега?' }
  if (mood <= 2) return { id: 'difficult', text: 'Коя беше най-трудната част?' }
  if (mood === 3) return { id: 'mixed', text: 'Какво те изтощи и какво ти помогна?' }
  return { id: 'good', text: 'Какво направи този момент хубав?' }
}

/** Compatibility helper for previously stored check-in-v1 entries. */
export function getDirectionQuestion(direction: string | null, mood: number | null): string | null {
  if (direction === 'express') return 'Какво ти се иска да кажеш?'
  if (direction === 'understand') return 'Какво беше в твоя контрол и какво не беше?'
  if (direction === 'step') return mood !== null && mood >= 4
    ? 'Какво от днес искаш да повториш утре?'
    : 'Коя е една малка стъпка за утре?'
  return null
}
