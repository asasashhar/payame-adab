import { NextResponse } from "next/server";
import { db, dbMode } from "@/lib/db";

/**
 * Deployment diagnostic — GET /api/health
 *
 * Reports which database mode the app is running in (Turso vs local SQLite),
 * whether the connection answers, and per-table row counts so a broken
 * deployment can be pinpointed from the browser without server-log access
 * (e.g. schema drift on a Turso database shows up as failed counts with the
 * underlying Prisma error message). No secrets are exposed.
 */

const TABLES: { model: keyof typeof db; label: string }[] = [
  { model: "user", label: "User" },
  { model: "setting", label: "Setting" },
  { model: "poem", label: "Poem" },
  { model: "article", label: "Article" },
  { model: "news", label: "News" },
  { model: "book", label: "Book" },
  { model: "poet", label: "Poet" },
  { model: "memory", label: "Memory" },
  { model: "qafiyaEntry", label: "QafiyaEntry" },
  { model: "behr", label: "Behr" },
  { model: "wordOfDay", label: "WordOfDay" },
  { model: "newspaperEdition", label: "NewspaperEdition" },
];

export async function GET() {
  // Report the mode the live client was actually built with (see db.ts) —
  // re-reading env here could disagree with the connection below.
  const mode = dbMode;
  const tables: Record<string, { ok: boolean; count?: number; error?: string }> = {};

  let connected = false;
  let connectionError: string | undefined;
  try {
    await db.$queryRaw`SELECT 1`;
    connected = true;
  } catch (e) {
    connectionError = String(e).slice(0, 200);
  }

  for (const t of TABLES) {
    try {
      const count = await (db[t.model] as { count(): Promise<number> }).count();
      tables[t.label] = { ok: true, count };
    } catch (e) {
      tables[t.label] = { ok: false, error: String(e).slice(0, 220) };
    }
  }

  const broken = Object.entries(tables).filter(([, v]) => !v.ok);

  return NextResponse.json(
    {
      ok: connected && broken.length === 0,
      mode,
      connected,
      connectionError,
      tables,
      schemaHeal: { note: "applied at process boot — see server logs for details" },
      time: new Date().toISOString(),
    },
    { status: connected && broken.length === 0 ? 200 : 503 }
  );
}
