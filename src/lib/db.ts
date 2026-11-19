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

export const db =
  globalForPrisma.prisma ?? makeClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
