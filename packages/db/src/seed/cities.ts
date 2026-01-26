import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { cities } from '../schema'
import data from './data/bulgarian-cities.json'

/**
 * Seed Bulgarian cities into the database
 * Data sourced from SimpleMaps (MIT license)
 *
 * Run with: pnpm --filter @celestia/db seed
 */
export async function seedCities() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const client = postgres(connectionString)
  const db = drizzle(client)

  console.log('Seeding Bulgarian cities...')

  // Insert cities in batches to avoid overwhelming the database
  const batchSize = 50
  let inserted = 0

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    await db.insert(cities).values(batch).onConflictDoNothing()
    inserted += batch.length
    console.log(`Inserted ${inserted}/${data.length} cities...`)
  }

  console.log(`Seeding complete! ${data.length} Bulgarian cities available.`)

  await client.end()
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedCities()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding failed:', error)
      process.exit(1)
    })
}
