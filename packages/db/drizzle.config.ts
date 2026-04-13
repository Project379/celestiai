import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

const configDir = dirname(fileURLToPath(import.meta.url))

config({ path: resolve(configDir, '../../apps/web/.env.local') })
config({ path: resolve(configDir, '.env.local'), override: true })

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required. Set it in apps/web/.env.local or packages/db/.env.local.'
  )
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Enable role management for RLS with Supabase
  entities: {
    roles: {
      provider: 'supabase',
    },
  },
})
