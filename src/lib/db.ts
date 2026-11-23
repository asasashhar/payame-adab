import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const useTurso =
  Boolean(process.env.TURSO_DATABASE_URL) &&
  (process.env.VERCEL === '1' || process.env.USE_TURSO === '1')

export function resolveLocalSqliteUrl(): string {
  const envUrl = process.env.DATABASE_URL?.trim()
  if (envUrl && envUrl.startsWith('file:/')) {
    return envUrl
  }
  // Vercel serverless filesystems (/var/task) are read-only; /tmp is writable.
  if (process.env.VERCEL === '1') {
    return 'file:/tmp/payame-adab.db'
  }
  const cwd = (
    process.env.APP_ROOT ||
    (typeof process !== 'undefined' && typeof process.cwd === 'function'
      ? process.cwd()
      : '.')
  ).replace(/[\\/]+$/, '')
  const root =
    cwd.endsWith('/.next/standalone') || cwd.endsWith('\\.next\\standalone')
      ? cwd.slice(0, -'/.next/standalone'.length)
      : cwd
  return `file:${root}/db/custom.db`
}

// Local SQLite is used when remote Turso is not configured (using /tmp on
// Vercel so SQLite remains writable even without Turso env vars). On Vercel
// (VERCEL=1) or when USE_TURSO=1 is set with TURSO_DATABASE_URL, Prisma
// connects to remote Turso/libSQL.
function makeClient(): PrismaClient {
  if (useTurso && process.env.TURSO_DATABASE_URL) {
    const adapter = new PrismaLibSQL({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN ?? '',
    })
    return new PrismaClient({ adapter })
  }

  return new PrismaClient({
    datasourceUrl: resolveLocalSqliteUrl(),
  })
}

export const dbMode: 'turso' | 'local-sqlite' = useTurso
  ? 'turso'
  : 'local-sqlite'

export const db =
  globalForPrisma.prisma ?? makeClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
