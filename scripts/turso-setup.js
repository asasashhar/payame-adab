/**
 * Applies the Prisma schema to the Turso/libSQL database and reports row
 * counts. Idempotent: skips creation when the User table already exists.
 * Usage: node scripts/turso-setup.js  (reads .env for TURSO_* credentials)
 */
require("dotenv").config();
const { createClient } = require("@libsql/client");
const fs = require("fs");

(async () => {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    console.error("TURSO_DATABASE_URL is not set");
    process.exit(1);
  }
  const client = createClient({ url, authToken: token });

  const existing = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='User'"
  );
  if (existing.rows.length > 0) {
    console.log("schema already present — skipping creation");
  } else {
    const sql = fs.readFileSync("/tmp/fix5/schema.sql", "utf8");
    await client.executeMultiple(sql);
    console.log("schema created");
  }

  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log("tables:", tables.rows.map((r) => r.name).join(", "));
  await client.close();
})();
