/**
 * Vitest entry point for §9 validation harness.
 *
 * Iterates all fixtures, runs comparison against whatever reference data is available,
 * prints the markdown report, asserts no case has `pause-and-fix` status.
 *
 * Current scaffold state: no fixtures yet. Test is skipped until fixtures land.
 * §9.6 promotion: this file becomes the CI-enforced regression gate.
 */

import { describe, expect, it } from 'vitest'

import { runCaseComparison } from './comparison'
import { loadAllTestCases, loadReferenceData } from './loader'
import { formatBatchReport } from './reporter'
import type { CaseComparisonResult } from './types'

describe('§9 ephemeris validation', async () => {
  const cases = await loadAllTestCases()

  if (cases.length === 0) {
    it.skip('no fixtures loaded — waiting on §9.1 test-case list approval', () => {})
    return
  }

  const results: CaseComparisonResult[] = []
  for (const testCase of cases) {
    it(testCase.name, async () => {
      const references = await loadReferenceData(testCase.id)
      if (!references) {
        console.warn(`[${testCase.id}] no reference data — skipping comparison`)
        return
      }
      const result = runCaseComparison(testCase, references)
      results.push(result)
      expect(
        result.overallStatus,
        `overall status for ${testCase.name}`,
      ).not.toBe('pause-and-fix')
    })
  }

  it('prints batch report', () => {
    if (results.length === 0) return
    console.log('\n' + formatBatchReport(results) + '\n')
  })
})
