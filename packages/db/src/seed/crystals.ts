import 'dotenv/config'
import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { crystalsSeed } from './data/crystals'

// Also load the web app's .env.local so we can reuse the Supabase keys
// that already exist there — avoids needing a separate DB-password
// configuration in packages/db/.env.
loadEnv({
  path: resolve(process.cwd(), '../../apps/web/.env.local'),
})

/**
 * Seed crystal catalog into the database using the Supabase service-role
 * client. Bypasses the direct postgres connection so no DATABASE_URL /
 * DB password is required — only the service role key that the web app
 * already uses.
 *
 * Run with: pnpm --filter @celestia/db seed:crystals
 */
export async function seedCrystals() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — check apps/web/.env.local'
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`Seeding ${crystalsSeed.length} crystals...`)

  let upserted = 0
  for (const crystal of crystalsSeed) {
    const row = {
      slug: crystal.slug,
      name_en: crystal.nameEn,
      name_bg: crystal.nameBg,
      tagline_en: crystal.taglineEn,
      tagline_bg: crystal.taglineBg,
      description_en: crystal.descriptionEn,
      description_bg: crystal.descriptionBg,
      planet: crystal.planet,
      zodiac_signs: crystal.zodiacSigns,
      moon_phases: crystal.moonPhases,
      element: crystal.element,
      chakra: crystal.chakra,
      hardness: crystal.hardness,
      color_primary: crystal.colorPrimary,
      color_secondary: crystal.colorSecondary,
      color_accent: crystal.colorAccent,
      svg_variant: crystal.svgVariant,
      rarity: crystal.rarity,
      keywords: crystal.keywords,
      properties: crystal.properties ?? null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('crystals')
      .upsert(row, { onConflict: 'slug' })

    if (error) {
      console.error(`Failed to seed ${crystal.slug}:`, error.message)
      throw error
    }
    upserted += 1
    process.stdout.write(`\r  ${upserted}/${crystalsSeed.length}`)
  }

  console.log(`\nSeeding complete! ${upserted} crystals available.`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedCrystals()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Crystal seeding failed:', error)
      process.exit(1)
    })
}
