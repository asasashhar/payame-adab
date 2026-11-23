// Prove the app's writes land in the remote Turso DB:
// register a test member via the app API, then query Turso directly.
import { createClient } from "@libsql/client";

const BASE = "http://localhost:3000";
const email = `turso-probe-${Date.now()}@example.com`;
const username = "tursoprobe" + String(Date.now()).slice(-6);
const password = "Probe#12345";

const res = await fetch(BASE + "/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Turso Probe", email, username, password }),
});
const status = res.status;
const body = await res.json().catch(() => ({}));
console.log("register via app:", status, JSON.stringify(body).slice(0, 200));

const db = createClient({
  url: "libsql://payame-adab-mdnematullah1343-star.aws-ap-south-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const found = await db.execute({
  sql: "SELECT id, email, username, role FROM User WHERE email = ?",
  args: [email],
});
console.log(
  "rows in remote Turso User table:",
  found.rows.length,
  found.rows.length ? JSON.stringify(found.rows[0]) : ""
);

// cleanup: remove the probe row so the DB stays pristine
if (found.rows.length) {
  await db.execute({ sql: "DELETE FROM User WHERE email = ?", args: [email] });
  const after = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM User",
    args: [],
  });
  console.log("probe row deleted; remote users now:", after.rows[0].n);
}
