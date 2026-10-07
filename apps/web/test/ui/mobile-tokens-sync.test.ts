import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// app/mobile-tokens.css is a hand copy of the mobile design tokens. This fails
// when either side changes without the other.
const root = resolve(__dirname, '../../../..')
const tokensTs = readFileSync(resolve(root, 'apps/mobile/components/design-system/tokens.ts'), 'utf8')
const css = readFileSync(resolve(__dirname, '../../app/mobile-tokens.css'), 'utf8')

function cssVars(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of css.matchAll(/(--m-[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

/** Body of `export const <name> = { ... } as const` (top-level only). */
function block(name: string): string {
  const start = tokensTs.indexOf(`export const ${name} = {`)
  expect(start, `${name} not found in tokens.ts`).toBeGreaterThan(-1)
  const end = tokensTs.indexOf('\n} as const', start)
  return tokensTs.slice(start, end)
}

const kebab = (s: string) => s.replace(/([A-Z])/g, '-$1').toLowerCase()

describe('mobile-tokens.css mirrors tokens.ts', () => {
  const vars = cssVars()

  it('colors', () => {
    const body = block('color')
    const pairs = [...body.matchAll(/^\s{2}(\w+):\s*'([^']+)'/gm)]
    expect(pairs.length).toBeGreaterThan(10)
    for (const [, key, value] of pairs) {
      const norm = (v: string) => v.replace(/\s+/g, '')
      expect(norm(vars[`--m-${kebab(key)}`] ?? ''), key).toBe(norm(value))
    }
  })

  it('space and rhythm', () => {
    for (const [name, prefix] of [['space', 'space'], ['rhythm', 'rhythm']] as const) {
      const pairs = [...block(name).matchAll(/^\s{2}'?([\w]+)'?:\s*(\d+)/gm)]
      expect(pairs.length, name).toBeGreaterThan(3)
      for (const [, key, value] of pairs) {
        expect(vars[`--m-${prefix}-${key}`], `${name}.${key}`).toBe(`${value}px`)
      }
    }
  })

  it('type scale sizes and line heights', () => {
    const pairs = [...block('type').matchAll(/^\s{2}(\w+):\s*\{[^}]*fontSize:\s*([\d.]+)[^}]*lineHeight:\s*(\d+)/gm)]
    expect(pairs.length).toBe(8)
    for (const [, key, size, line] of pairs) {
      expect(vars[`--m-type-${key}-size`], key).toBe(`${size}px`)
      expect(vars[`--m-type-${key}-line`], key).toBe(`${line}px`)
    }
  })
})
