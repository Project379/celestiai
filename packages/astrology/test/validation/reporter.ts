/**
 * Markdown reporter — converts CaseComparisonResult to human-readable output.
 *
 * Keep output stable and diff-friendly; reports get committed for review.
 */

import { formatArcsec } from './delta'
import type { CaseComparisonResult, Status } from './types'

function statusEmoji(status: Status): string {
  if (status === 'pass') return 'PASS'
  if (status === 'queue') return 'QUEUE'
  return 'PAUSE'
}

export function formatCaseReport(result: CaseComparisonResult): string {
  const { testCase, planetComparisons, houseComparisons, aspectComparisons } =
    result
  const lines: string[] = []

  lines.push(`# ${testCase.name} (${testCase.id})`)
  lines.push('')
  lines.push(`- Kind: ${testCase.kind}${testCase.rodden ? ` — Rodden ${testCase.rodden}` : ''}`)
  lines.push(
    `- Birth: ${testCase.birthDate}${testCase.birthTime ? ` ${testCase.birthTime}` : ''} ${testCase.birthTimeKnown ? '' : '(time unknown)'}`,
  )
  lines.push(
    `- Location: ${testCase.lat.toFixed(4)}°, ${testCase.lon.toFixed(4)}°${testCase.city ? ` (${testCase.city})` : ''}`,
  )
  lines.push(`- Overall: **${statusEmoji(result.overallStatus)}**`)
  lines.push('')

  if (planetComparisons.length > 0) {
    lines.push('## Planetary longitudes')
    lines.push('')
    lines.push('| Body | Source | Celestia | Reference | Δ | Threshold | Status |')
    lines.push('|---|---|---|---|---|---|---|')
    for (const c of planetComparisons) {
      lines.push(
        `| ${c.body} | ${c.referenceSource} | ${c.celestiaLongitude.toFixed(6)}° | ${c.referenceLongitude.toFixed(6)}° | ${formatArcsec(c.deltaArcsec)} | ${c.threshold}″ | ${statusEmoji(c.status)} |`,
      )
    }
    lines.push('')
  }

  if (houseComparisons.length > 0) {
    lines.push('## House cusps / ASC / MC')
    lines.push('')
    lines.push('| Point | Source | Celestia | Reference | Δ | Threshold | Status |')
    lines.push('|---|---|---|---|---|---|---|')
    for (const c of houseComparisons) {
      lines.push(
        `| ${c.label} | ${c.referenceSource} | ${c.celestia.toFixed(6)}° | ${c.reference.toFixed(6)}° | ${formatArcsec(c.deltaArcsec)} | ${c.threshold}″ | ${statusEmoji(c.status)} |`,
      )
    }
    lines.push('')
  }

  if (aspectComparisons.length > 0) {
    lines.push('## Aspects')
    lines.push('')
    lines.push('| Pair | Celestia | Reference | Type match | Applying match | Orb Δ | Status |')
    lines.push('|---|---|---|---|---|---|---|')
    for (const a of aspectComparisons) {
      const celestiaLabel = a.celestiaType
        ? `${a.celestiaType} (orb ${a.celestiaOrb?.toFixed(3)}°, ${a.celestiaApplying ? 'applying' : 'separating'})`
        : '—'
      const refLabel = a.referenceType
        ? `${a.referenceType} (orb ${a.referenceOrb?.toFixed(3)}°, ${a.referenceApplying ? 'applying' : 'separating'})`
        : '—'
      const orbDelta = a.orbDeltaArcsec !== undefined ? formatArcsec(a.orbDeltaArcsec) : '—'
      lines.push(
        `| ${a.body1}–${a.body2} | ${celestiaLabel} | ${refLabel} | ${a.typeMatch ? 'yes' : 'no'} | ${a.applyingMatch ? 'yes' : 'no'} | ${orbDelta} | ${statusEmoji(a.status)} |`,
      )
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function formatBatchReport(results: CaseComparisonResult[]): string {
  const lines: string[] = []
  lines.push('# §9 validation run')
  lines.push('')
  lines.push(
    `${results.length} case(s) — ${results.filter((r) => r.overallStatus === 'pass').length} pass, ${results.filter((r) => r.overallStatus === 'queue').length} queue, ${results.filter((r) => r.overallStatus === 'pause-and-fix').length} pause-and-fix.`,
  )
  lines.push('')
  for (const result of results) {
    lines.push(formatCaseReport(result))
    lines.push('')
    lines.push('---')
    lines.push('')
  }
  return lines.join('\n')
}
