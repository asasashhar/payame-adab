import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// When Turso credentials are configured, every process (server, seeds, tools)
// talks to the same remote libSQL database — data survives sandbox recycles.
// Without them the app falls back to the local SQLite file as before.
function makeClient(): PrismaClient {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  if (url) {
    const adapter = new PrismaLibSQL({ url, authToken: token ?? '' })
    return new PrismaClient({ adapter })
  }
  return new PrismaClient({
    log: ['query'],
  })
}

// The mode the ACTUAL client was built with — health must report this, not
// re-read env per request, or a mid-process env change makes diagnostics lie
// (client still local while health claims turso).
export const dbMode: 'turso' | 'local-sqlite' = process.env.TURSO_DATABASE_URL
  ? 'turso'
  : 'local-sqlite'

export const db =
  globalForPrisma.prisma ?? makeClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
