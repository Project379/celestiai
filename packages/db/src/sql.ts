import postgres from 'postgres'

let sqlClient: ReturnType<typeof postgres> | null = null

export function getSqlClient() {
  if (sqlClient) {
    return sqlClient
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  sqlClient = postgres(connectionString, {
    max: 3,
    prepare: false,
  })

  return sqlClient
}
