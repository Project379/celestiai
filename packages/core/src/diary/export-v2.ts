import type { DiaryEntryV2 } from './v2'

const BOM = String.fromCharCode(0xfeff)

function contentLines(entry: DiaryEntryV2): string[] {
  if (entry.kind === 'legacy_lunar') {
    const intentions = (entry.content as { intentions?: string[] }).intentions ?? []
    return intentions.map((text, index) => `${index + 1}. ${text}`)
  }
  if (entry.kind === 'note') {
    return [(entry.content as { body?: string }).body ?? '']
  }
  if (entry.kind === 'lunar_practice') {
    const content = entry.content as { fieldLabels?: string[]; answers?: string[] }
    return (content.answers ?? []).map((answer, index) =>
      `${content.fieldLabels?.[index] ?? `${index + 1}`}: ${answer}`,
    )
  }
  const content = entry.content as {
    iterations?: { question: string; answer: string }[]
    reflectionQuestion?: string | null
    reflectionAnswer?: string
    detailQuestion?: string | null
    detailAnswer?: string
  }
  if (content.iterations?.length) {
    return content.iterations
      .filter((iteration) => iteration.answer.trim())
      .map((iteration) => `${iteration.question}\n${iteration.answer}`)
  }
  return [
    content.reflectionQuestion && content.reflectionAnswer
      ? `${content.reflectionQuestion}\n${content.reflectionAnswer}`
      : content.reflectionAnswer ?? '',
    content.detailQuestion && content.detailAnswer
      ? `${content.detailQuestion}\n${content.detailAnswer}`
      : content.detailAnswer ?? '',
  ].filter(Boolean)
}

export function buildFullDiaryMarkdown(entries: DiaryEntryV2[], exportedAt = new Date()): string {
  const blocks = entries.map((entry) => {
    const header = entry.title || entry.phaseName || (
      entry.kind === 'check_in' ? 'Проверка със себе си' :
      entry.kind === 'note' ? 'Свободен запис' : 'Лунен дневник'
    )
    const metadata = [
      entry.mood ? `Настроение: ${entry.mood}/5` : null,
      entry.topics.length ? `Теми: ${entry.topics.join(', ')}` : null,
      entry.status === 'draft' ? 'Чернова' : null,
    ].filter(Boolean)
    const step = entry.nextStep ? `Следваща стъпка: ${entry.nextStep.text} (${entry.nextStep.status})` : null
    return [
      '---',
      '',
      `## ${entry.entryDate} · ${header}`,
      metadata.length ? metadata.join(' · ') : '',
      '',
      ...contentLines(entry),
      step ? `\n${step}` : '',
      '',
    ].join('\n')
  })
  return `${BOM}# Дневник\n\nИзтеглен на ${exportedAt.toISOString()}\n\n${blocks.join('\n')}`
}

export function buildFullDiaryJson(entries: DiaryEntryV2[], exportedAt = new Date()): string {
  return JSON.stringify({ exportedAt: exportedAt.toISOString(), entries }, null, 2)
}
