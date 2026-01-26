import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Enable role management for RLS with Supabase
  entities: {
    roles: {
      provider: 'supabase',
    },
  },
})
