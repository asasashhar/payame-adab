import { db, dbMode, resolveLocalSqliteUrl } from "@/lib/db";

/**
 * Boot-time self-healing for the database (sandbox recycle resilience).
 *
 * The hosting sandbox wipes untracked files (db/custom.db, .env) whenever the
 * process is recycled. On every server start we check whether the database is
 * still healthy; if not, the canonical idempotent seed scripts run immediately,
 * restoring the admins, settings, and literary content before traffic arrives.
 *
 * Node builtins are loaded with webpackIgnore dynamic imports so Next.js can
 * also compile instrumentation for the edge runtime without bundling errors.
 */

let checked = false;

type Spawn = typeof import("child_process").spawn;

export async function ensureSeeded(): Promise<void> {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.AUTO_SEED === "0") return; // explicit opt-out (e.g. serverless)
  if (checked) return;
  checked = true;
  try {
    const [users, settings, poems, words, editions] = await Promise.all([
      db.user.count(),
      db.setting.count(),
      db.poem.count(),
      db.wordOfDay.count(),
      db.newspaperEdition.count(),
    ]);
    // healthy DB: the four seeded admins (3 Gmail + @admin), content and the
    // dictionary/newspaper seeds
    if (users >= 4 && settings > 0 && poems > 0 && words > 0 && editions > 0) return;

    console.log(
      `[auto-seed] database looks empty (users=${users}, settings=${settings}, poems=${poems}) — restoring…`
    );

    const { spawn } = (await import(
      /* webpackIgnore: true */ "child_process"
    )) as typeof import("child_process");
    const fs = (await import(/* webpackIgnore: true */ "fs")) as typeof import("fs");
    const path = (await import(/* webpackIgnore: true */ "path")) as typeof import("path");

    const seedEnv: NodeJS.ProcessEnv =
      dbMode === "turso"
        ? { ...process.env }
        : {
            ...process.env,
            DATABASE_URL: resolveLocalSqliteUrl(),
            TURSO_DATABASE_URL: "",
          };

    const runSeedScript = (cwd: string, script: string) =>
      new Promise<void>((resolve, reject) => {
        const child: ReturnType<Spawn> = spawn(process.execPath, [path.join(cwd, script)], {
          cwd,
          env: seedEnv,
          stdio: "inherit",
        });
        child.on("exit", (code) =>
          (code as number) === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`))
        );
        child.on("error", reject);
      });

    // find scripts/seed: the project root (APP_ROOT) first, then relative to
    // the runtime (dev; standalone build where build:post copies scripts/ next
    // to server.js)
    const candidates = [
      process.env.APP_ROOT,
      process.cwd(),
      path.join(process.cwd(), ".."),
      path.join(process.cwd(), "..", ".."),
    ].filter(Boolean) as string[];
    const root = candidates.find((c) => fs.existsSync(path.join(c, "scripts", "seed", "index.js")));
    if (!root) {
      console.error("[auto-seed] scripts/seed/index.js not found next to the runtime — skipping");
      return;
    }
    await runSeedScript(root, path.join("scripts", "seed", "index.js"));
    await runSeedScript(root, path.join("scripts", "seed", "upgrade.js"));
    await runSeedScript(root, path.join("scripts", "seed-qafiya-behr.js"));
    console.log("[auto-seed] database restored (admins, settings, content, qafiya)");
  } catch (e) {
    console.error("[auto-seed] failed:", String(e).slice(0, 300));
  }
}
