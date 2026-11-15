import { spawn } from "child_process";
import fs from "fs";
import path from "path";
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
 */

let checked = false;

async function runSeedScript(cwd: string, script: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(cwd, script)], {
      cwd,
      env: process.env,
      stdio: "inherit",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`))));
    child.on("error", reject);
  });
}

export async function ensureSeeded(): Promise<void> {
  if (checked) return;
  checked = true;
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
