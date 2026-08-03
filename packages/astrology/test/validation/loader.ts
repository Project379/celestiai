/**
 * Fixture + reference-data loader.
 *
 * Fixtures and reference data live as TypeScript modules under fixtures/ and
 * reference-data/. Each file exports a single named `testCase` or `referenceData`
 * object. The loader dynamically imports all files in each directory.
 */

import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import type { ReferenceData, TestCase } from './types'

const thisDir = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(thisDir, 'fixtures')
const referenceDir = join(thisDir, 'reference-data')

function listTsModules(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts') && f !== 'index.ts')
      .sort()
  } catch {
    return []
  }
}

export async function loadAllTestCases(): Promise<TestCase[]> {
  const files = listTsModules(fixturesDir)
  const cases: TestCase[] = []
  for (const file of files) {
    const mod = (await import(join(fixturesDir, file))) as {
      testCase?: TestCase
    }
    if (mod.testCase) cases.push(mod.testCase)
  }
  return cases
}

export async function loadReferenceData(caseId: string): Promise<ReferenceData | null> {
  const files = listTsModules(referenceDir)
  for (const file of files) {
    const mod = (await import(join(referenceDir, file))) as {
      referenceData?: ReferenceData
    }
    if (mod.referenceData?.caseId === caseId) return mod.referenceData
  }
  return null
}
