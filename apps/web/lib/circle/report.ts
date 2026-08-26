import type {
  CompatibilityDomainKey,
  CompatibilitySummary,
} from '@stellaeum/core/relationships/types'
import type {
  ConnectionReportContent,
  ConnectionReportSection,
  SavedProfileReportContent,
} from './types'

const DOMAIN_NAMES_BG: Record<CompatibilityDomainKey, string> = {
  emotional_resonance: 'Емоционален резонанс',
  communication: 'Комуникация',
  romance_attraction: 'Романтика и привличане',
  long_term_stability: 'Дългосрочна стабилност',
  conflict_friction: 'Конфликт и триене',
  growth_expansion: 'Растеж и разгръщане',
  power_dynamics: 'Сила и контрол',
  shared_values: 'Споделени ценности',
}

// 2026-08-26 sweep #5, corrected: these routes generate content from a
// deterministic template over already-computed compatibility scores — no
// OpenRouter/LLM call anywhere in this path (buildCompatibilityReportContent
// / buildSavedProfileFullContent / buildSavedProfileTeaserContent are pure
// functions). This is NOT an AI-spend control. It caps unbounded
// version-row growth per pair — each POST inserts a new row and re-runs
// the Swiss Ephemeris compatibility compute — for storage/compute hygiene,
// the same shape as birth-data's chart cap. 50 is generous enough that no
// real user reaches it (a handful of regenerations per relationship over
// its lifetime) and low enough that a client loop can't fill the table.
export const MAX_REPORT_VERSIONS_PER_PAIR = 50

function scoreBand(score: number): 'high' | 'mid' | 'low' {
  if (score >= 75) return 'high'
  if (score <= 45) return 'low'
  return 'mid'
}

function renderAspectList(summary: CompatibilitySummary, key: CompatibilityDomainKey): string {
  const parts = summary.domains[key].contributing_aspects
    .slice(0, 2)
    .map((aspect) => `${aspect.planet_a} ${aspect.aspect} ${aspect.planet_b}`)
  return parts.length > 0 ? parts.join(', ') : 'няма един доминиращ аспект'
}

function strongestSignalText(summary: CompatibilitySummary): string {
  return summary.domains[summary.strongest_domain].contributing_aspects
    .slice(0, 1)
    .map((aspect) => `${aspect.planet_a} ${aspect.aspect} ${aspect.planet_b}`)
    .join(', ')
}

function buildSavedProfileSnapshot(summary: CompatibilitySummary) {
  const strongestName = DOMAIN_NAMES_BG[summary.strongest_domain].toLowerCase()
  const growthName = DOMAIN_NAMES_BG[summary.growth_domain].toLowerCase()
  const strongestAspect = strongestSignalText(summary)
  const growth = summary.domains[summary.growth_domain]

  return {
    pull:
      strongestAspect.length > 0
        ? `Най-силното привличане идва през ${strongestName}. Най-ясно личи в ${strongestAspect}.`
        : `Най-силното привличане идва през ${strongestName}, където между вас има най-естествена искра.`,
    need: `Ако искаш това да се движи по-зряло, връзката ще иска повече яснота около ${growthName}. ${growth.summary}`,
    misread: `Рискът е да приемеш ${growthName} като знак за липса на интерес, когато то по-скоро показва различно темпо, стил или праг на близост.`,
  }
}

function buildSection(
  summary: CompatibilitySummary,
  key: CompatibilityDomainKey,
): ConnectionReportSection {
  const domain = summary.domains[key]
  const name = DOMAIN_NAMES_BG[key]
  const band = scoreBand(domain.score)
  const aspects = renderAspectList(summary, key)

  if (band === 'high') {
    return {
      headline: `${name} е силна зона във връзката ви.`,
      core: `${domain.summary} В най-силния си вид тази тема прави усещането между вас по-лесно, по-бързо и по-интуитивно. Тук най-често се усеща естествен ритъм, а водещите аспекти са ${aspects}.`,
      dayToDay:
        'В ежедневието това се превежда като повече лекота в малките неща: по-лесно връщане един към друг, по-малко нужда от обясняване и по-бързо усещане кога другият има нужда от близост или пространство.',
      watchFor:
        'Силната зона може да стане самодоволна зона. Когато нещо върви естествено, има изкушение да го приемете за даденост и да спрете да го подхранвате съзнателно.',
    }
  }

  if (band === 'low') {
    return {
      headline: `${name} е мястото, което иска повече грижа.`,
      core: `${domain.summary} Това не е присъда, а карта на напрежението. Тук връзката вероятно има различно темпо, различен стил на реакция или по-голяма нужда от превод между вас. Най-силно се усещат ${aspects}.`,
      dayToDay:
        'В ежедневието тази зона често излиза като засичане, недоизказване или усещане, че говорите за едно и също, но през различни вътрешни езици.',
      watchFor:
        'Ако оставите тази тема без внимание, натрупването става тихо и се появява усещане, че проблемът е в човека, а не в динамиката. Полезното движение тук е ясна уговорка, а не четене на мисли.',
    }
  }

  return {
    headline: `${name} стои в балансирана, но чувствителна среда.`,
    core: `${domain.summary} Това е зона, в която потенциалът е налице, но резултатът зависи силно от моментния тон между вас. Има материал за близост и синхрон, но и достатъчно разлика, за да се иска участие. Водещите аспекти са ${aspects}.`,
    dayToDay:
      'На практика това означава, че в добрите дни тази тема се усеща гладко, а в претоварените дни по-бързо се появява шум. Връзката има нужда от ритъм, не от перфектност.',
    watchFor:
      'Рискът тук е колебанието да се тълкува като непостоянство. По-полезно е да гледате тази зона като нещо, което се настройва, а не като постоянна диагноза.',
  }
}

export function buildCompatibilityReportContent(
  summary: CompatibilitySummary,
  partnerName: string,
): ConnectionReportContent {
  const strongest = DOMAIN_NAMES_BG[summary.strongest_domain]
  const growth = DOMAIN_NAMES_BG[summary.growth_domain]

  return {
    overview: {
      title: `Профил на връзката с ${partnerName}`,
      summary: `Общият ритъм между вас идва с резултат ${summary.headline_score}/100. Най-естествено се движите през ${strongest.toLowerCase()}, а най-много съзнателност ще поискат темите около ${growth.toLowerCase()}.`,
      strongestDomain: strongest,
      growthDomain: growth,
    },
    domains: {
      emotional_resonance: buildSection(summary, 'emotional_resonance'),
      communication: buildSection(summary, 'communication'),
      romance_attraction: buildSection(summary, 'romance_attraction'),
      long_term_stability: buildSection(summary, 'long_term_stability'),
      conflict_friction: buildSection(summary, 'conflict_friction'),
      growth_expansion: buildSection(summary, 'growth_expansion'),
      power_dynamics: buildSection(summary, 'power_dynamics'),
      shared_values: buildSection(summary, 'shared_values'),
    },
  }
}

export function buildSavedProfileTeaserContent(
  summary: CompatibilitySummary,
  profileName: string,
): SavedProfileReportContent {
  return {
    mode: 'teaser',
    overview: {
      title: `Първо усещане за ${profileName}`,
      summary: `Има отчетлив потенциал ${summary.headline_score}/100. Най-силно се движите през ${DOMAIN_NAMES_BG[summary.strongest_domain].toLowerCase()}, а повече внимание ще иска ${DOMAIN_NAMES_BG[summary.growth_domain].toLowerCase()}.`,
      strongestDomain: DOMAIN_NAMES_BG[summary.strongest_domain],
      growthDomain: DOMAIN_NAMES_BG[summary.growth_domain],
    },
    snapshot: buildSavedProfileSnapshot(summary),
    teaser: `Това е краткият първи прочит. Premium отключва пълния breakdown по домейни, плюс секциите какво те дърпа към ${profileName}, какво ще искаш от него или нея и къде най-лесно можеш да разчетеш погрешно динамиката.`,
  }
}

export function buildSavedProfileFullContent(
  summary: CompatibilitySummary,
  profileName: string,
): SavedProfileReportContent {
  const full = buildCompatibilityReportContent(summary, profileName)
  return {
    mode: 'full',
    overview: full.overview,
    snapshot: buildSavedProfileSnapshot(summary),
    domains: full.domains,
  }
}
