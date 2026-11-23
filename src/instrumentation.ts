/**
 * Next.js instrumentation hook — runs once when the server process starts.
 * Initializes/heals schema and restores seeded content when the database is empty.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureDbReady } = await import("@/lib/auto-seed");
    await ensureDbReady();
  } catch (e) {
    console.error("[instrumentation] auto-seed error:", String(e).slice(0, 300));
  }
}
