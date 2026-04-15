import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import { crystals } from '../schema'
import { crystalsSeed } from './data/crystals'

/**
 * Seed crystal catalog into the database
 *
 * Idempotent: uses onConflictDoUpdate against the slug unique constraint so
 * re-running after a content edit refreshes the row without creating a
 * duplicate. Bulgarian fields stay null until the bulgarian-skill pass.
 *
 * Run with: pnpm --filter @celestia/db seed:crystals
 */
export async function seedCrystals() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const client = postgres(connectionString)
  const db = drizzle(client)

  console.log(`Seeding ${crystalsSeed.length} crystals...`)

  for (const crystal of crystalsSeed) {
    await db
      .insert(crystals)
      .values(crystal)
      .onConflictDoUpdate({
        target: crystals.slug,
        set: {
          nameEn: crystal.nameEn,
          taglineEn: crystal.taglineEn,
          descriptionEn: crystal.descriptionEn,
          planet: crystal.planet,
          zodiacSigns: crystal.zodiacSigns,
          moonPhases: crystal.moonPhases,
          element: crystal.element,
          chakra: crystal.chakra,
          hardness: crystal.hardness,
          colorPrimary: crystal.colorPrimary,
          colorSecondary: crystal.colorSecondary,
          colorAccent: crystal.colorAccent,
          svgVariant: crystal.svgVariant,
          rarity: crystal.rarity,
          keywords: crystal.keywords,
          properties: crystal.properties,
          updatedAt: sql`now()`,
        },
      })
  }

  console.log(`Seeding complete! ${crystalsSeed.length} crystals available.`)

  await client.end()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedCrystals()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Crystal seeding failed:', error)
      process.exit(1)
    })
}
