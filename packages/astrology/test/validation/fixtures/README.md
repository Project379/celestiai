# Test-case fixtures

Each test case lives in its own `.ts` file exporting a single named `testCase` constant:

```ts
import type { TestCase } from '../types'

export const testCase: TestCase = {
  id: 'queen-elizabeth-ii',
  name: 'Queen Elizabeth II',
  kind: 'famous',
  rodden: 'AA',
  birthDate: '1926-04-21',
  birthTime: '02:40',
  birthTimeKnown: true,
  lat: 51.5074,
  lon: -0.1278,
  city: 'London, UK',
  sources: ['https://www.astro.com/astro-databank/Elizabeth_II,_Queen_of_United_Kingdom'],
}
```

## Conventions

- `id` is a slug used to join against reference data. Must be unique.
- `birthTime` is in the birth location's local time; `@celestia/astrology` handles UTC conversion.
- Famous cases **must** be Rodden AA-rated (birth certificate or equivalent documentary source). B-rated and below get dropped.
- Synthetic cases use `kind: 'synthetic'` and omit `rodden`.
- Reference cases (validated against an independent native-SE tool) use `kind: 'reference'`.

## Loading

`loader.ts` auto-discovers all `*.ts` files in this directory. File name doesn't need to match `id` but naming them `{id}.ts` keeps the file list readable.
