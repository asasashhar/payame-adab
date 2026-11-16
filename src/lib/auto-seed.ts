import { db } from "@/lib/db";

/**
 * Boot-time self-healing for the database (Task: sandbox recycle resilience).
 *
 * The hosting sandbox resets db/custom.db to an empty schema whenever the
 * process is recycled, which previously left the live site without admins,
 * settings or content. On every server start we check whether the database
 * is still healthy; if not, the canonical idempotent seed scripts run
 * immediately, restoring the @admin super-admin, the three Gmail
 * administrators, settings and the literary content — before traffic arrives.
 *
 * Node builtins (child_process/fs/path) are resolved at runtime via require —
 * they must stay invisible to the bundler, which also compiles this module
 * for the edge runtime where those builtins do not exist.
 */

let checked = false;

/** Runtime-only require; returns null inside bundles without CJS require. */
function runtimeRequire(): ((m: string) => unknown) | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const req = new Function("return typeof require === 'function' ? require : null")() as
      | ((m: string) => unknown)
      | null;
    return req;
  } catch {
    return null;
  }
}

export async function ensureSeeded(): Promise<void> {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") return;
  if (checked) return;
  checked = true;
  const req = runtimeRequire();
  if (!req) {
    console.error("[auto-seed] require unavailable in this runtime — skipping");
    return;
  }
  const spawn = req("child_process") as unknown as (
    cmd: string,
    args: string[],
    opts: { cwd: string; env: NodeJS.ProcessEnv; stdio: string }
  ) => { on: (ev: string, cb: (a: unknown) => void) => void };
  const fs = req("fs") as unknown as { existsSync: (p: string) => boolean };
  const path = req("path") as unknown as { join: (...p: string[]) => string };
  try {
    const [users, settings, poems] = await Promise.all([
      db.user.count(),
      db.setting.count(),
      db.poem.count(),
    ]);
    // healthy DB: the four seeded admins (3 Gmail + @admin) plus content
    if (users >= 4 && settings > 0 && poems > 0) return;

    console.log(
      `[auto-seed] database looks empty (users=${users}, settings=${settings}, poems=${poems}) — restoring…`
    );

    const runSeedScript = (cwd: string, script: string) =>
      new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, [path.join(cwd, script)], {
          cwd,
          env: process.env,
          stdio: "inherit",
        });
        child.on("exit", (code) => ((code as number) === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`))));
        child.on("error", reject);
      });

    // find scripts/seed relative to the runtime root (works in dev and in the
    // standalone build, where scripts/ is copied next to server.js)
    const candidates = [
      process.cwd(),
      path.join(process.cwd(), ".."),
      path.join(process.cwd(), "..", ".."),
    ];
    const root = candidates.find((c) => fs.existsSync(path.join(c, "scripts", "seed", "index.js")));
    if (!root) {
      console.error("[auto-seed] scripts/seed/index.js not found next to the runtime — skipping");
      return;
    }
    await runSeedScript(root, path.join("scripts", "seed", "index.js"));
    await runSeedScript(root, path.join("scripts", "seed", "upgrade.js"));
    console.log("[auto-seed] database restored (admins, settings, content)");
  } catch (e) {
    console.error("[auto-seed] failed:", String(e).slice(0, 300));
  }
}
