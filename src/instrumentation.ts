/**
 * Next.js instrumentation hook — runs once when the server process starts.
 * Restores the database (admins, settings, content) if the hosting sandbox
 * recycled it to an empty schema. See src/lib/auto-seed.ts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    // heal schema drift FIRST (e.g. a Turso database created from an older
    // schema — missing tables/columns make every content query throw), then
    // seed content when the database is empty
    const { ensureSchema } = await import("@/lib/schema-ensure");
    await ensureSchema();
    const { ensureSeeded } = await import("@/lib/auto-seed");
    await ensureSeeded();
  } catch (e) {
    console.error("[instrumentation] auto-seed error:", String(e).slice(0, 300));
  }
}
