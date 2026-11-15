/**
 * Next.js instrumentation hook — runs once when the server process starts.
 * Restores the database (admins, settings, content) if the hosting sandbox
 * recycled it to an empty schema. See src/lib/auto-seed.ts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureSeeded } = await import("@/lib/auto-seed");
    await ensureSeeded();
  } catch (e) {
    console.error("[instrumentation] auto-seed error:", String(e).slice(0, 300));
  }
}
