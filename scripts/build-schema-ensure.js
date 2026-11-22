#!/usr/bin/env node
/**
 * Generates src/lib/schema-ensure.ts — the boot-time database schema healer.
 *
 * Why: a deployment (e.g. Vercel + Turso) can point the app at a database
 * whose schema predates the current prisma/schema.prisma (missing tables or
 * columns). Every Prisma query selecting a missing column then throws and
 * whole pages 500, while unrelated tables (settings, users) keep working —
 * exactly the failure seen on payame-adab-2cvd.vercel.app. The generated
 * module embeds the CURRENT schema DDL and, on every cold start, applies
 * only the missing pieces (CREATE TABLE IF NOT EXISTS / guarded ADD COLUMN)
 * through @libsql/client — with zero writes when the schema is current.
 *
 * Re-run after any prisma/schema.prisma change:
 *   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > /tmp/full-schema.sql
 *   node scripts/build-schema-ensure.js /tmp/full-schema.sql
 */
const fs = require("fs");
const path = require("path");

const sqlPath = process.argv[2] || "/tmp/full-schema.sql";
const raw = fs.readFileSync(sqlPath, "utf8");

// strip `-- ...` comment lines and split into statements
const cleaned = raw
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n");

// Derive ALTER TABLE ... ADD COLUMN statements for every column of every
// table, so a database whose tables exist with an OLD shape (created from a
// previous schema) gains the columns it is missing. SQLite forbids PRIMARY
// KEY and UNIQUE in ADD COLUMN — those columns are skipped (an existing
// table always has its PK; the rare missing-unique-column case is a
// re-create-table job, not an alter).
const alterStatements = [];
for (const m of cleaned.matchAll(/CREATE TABLE "?(\w+)"? \(([\s\S]*?)\n\);/g)) {
  const table = m[1];
  for (const line of m[2].split("\n")) {
    const def = line.trim().replace(/,$/, "");
    if (!def || !def.startsWith('"')) continue; // skip table-level constraints
    if (/PRIMARY\s+KEY|UNIQUE/i.test(def)) continue;
    let colDef = def;
    // SQLite forbids ADD COLUMN with non-constant defaults (CURRENT_TIME /
    // CURRENT_DATE / CURRENT_TIMESTAMP) and with NOT NULL but no default —
    // for those, add the column as nullable (existing rows read NULL; the
    // alternative would be a full table rebuild, too risky for self-heal)
    const nonConstantDefault = /DEFAULT\s+CURRENT_(TIME|DATE|TIMESTAMP)\b/i.test(colDef);
    const notNullNoDefault = /NOT\s+NULL/i.test(colDef) && !/DEFAULT\s+/i.test(colDef);
    if (nonConstantDefault || notNullNoDefault) {
      colDef = colDef
        .replace(/\bNOT\s+NULL\b/i, "")
        .replace(/\bDEFAULT\s+CURRENT_(TIME|DATE|TIMESTAMP)\b/i, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }
    alterStatements.push(`ALTER TABLE "${table}" ADD COLUMN ${colDef};`);
  }
}

const fullSql = cleaned + "\n\n-- AddColumn (guarded at runtime; only missing columns are applied)\n" + alterStatements.join("\n");
const statements = fullSql
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter(Boolean);

// template-literal safety
const embed = fullSql.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const out = `/**
 * Boot-time database schema healer — GENERATED FILE, do not edit by hand.
 * Source of truth: prisma/schema.prisma, transformed by
 * scripts/build-schema-ensure.js (re-run it after schema changes).
 *
 * Deployments can point the app at a database (Turso/libSQL) whose schema
 * predates the current Prisma schema: missing tables/columns make every
 * Prisma query over them throw, so whole pages return 500 while unrelated
 * tables keep working. ensureSchema() applies ONLY the missing pieces with
 * idempotent DDL (CREATE TABLE IF NOT EXISTS, guarded ADD COLUMN) through a
 * direct @libsql/client connection — zero writes when the schema is current,
 * a handful of fast statements when it drifted.
 *
 * Local SQLite deployments (no TURSO_DATABASE_URL) are managed with
 * \`prisma db push\` and are skipped here.
 */

const SCHEMA_SQL = \`${embed}\`;

// split the DDL into individual statements (no semicolons inside table bodies)
const statements = SCHEMA_SQL
  .split(/;\\s*\\n/)
  .map((s) => s.trim())
  .filter(Boolean);

export type SchemaEnsureReport = {
  ran: boolean;
  mode: "turso" | "local-sqlite";
  createdTables: string[];
  createdIndexes: string[];
  addedColumns: string[];
  rebuiltTables: string[];
  errors: string[];
  checkedAt: string;
};

let report: SchemaEnsureReport = {
  ran: false,
  mode: "local-sqlite",
  createdTables: [],
  createdIndexes: [],
  addedColumns: [],
  rebuiltTables: [],
  errors: [],
  checkedAt: "",
};

let ran = false;

type LibsqlClient = {
  execute: (stmt: { sql: string; args?: unknown[] }) => Promise<unknown>;
};

function classify(stmt: string):
  | { kind: "table"; name: string; sql: string }
  | { kind: "index"; name: string; sql: string }
  | { kind: "column"; table: string; column: string; sql: string }
  | null {
  const table = stmt.match(/^CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?[\`\\"]?([\\w]+)[\`\\"]?/i);
  if (table) {
    // make idempotent
    const sql = stmt.replace(/^CREATE\\s+TABLE\\s+(?!IF\\s+NOT\\s+EXISTS)/i, "CREATE TABLE IF NOT EXISTS ");
    return { kind: "table", name: table[1], sql };
  }
  const index = stmt.match(/^CREATE\\s+(UNIQUE\\s+)?INDEX\\s+[\`\\"]?([\\w]+)[\`\\"]?/i);
  if (index) {
    const sql = stmt.replace(/^CREATE\\s+(UNIQUE\\s+)?INDEX\\s+(?!IF\\s+NOT\\s+EXISTS)/i, (_m, uniq) => \`CREATE \${uniq ?? ""}INDEX IF NOT EXISTS \`);
    return { kind: "index", name: index[2], sql };
  }
  const col = stmt.match(/^ALTER\\s+TABLE\\s+[\`\\"]?([\\w]+)[\`\\"]?\\s+ADD\\s+COLUMN\\s+[\`\\"]?([\\w]+)[\`\\"]?/i);
  if (col) return { kind: "column", table: col[1], column: col[2], sql: stmt };
  return null;
}

function columnsFromDdl(createSql: string): Set<string> {
  const cols = new Set<string>();
  const body = createSql.slice(createSql.indexOf("(") + 1, createSql.lastIndexOf(")"));
  for (const m of body.matchAll(/[\`\\"]?([\\w]+)[\`\\"]?\\s+[\\w\\"]+/g)) cols.add(m[1].toLowerCase());
  return cols;
}

// ordered column names from a CREATE TABLE body
function columnListFromDdl(createSql: string): string[] {
  const body = createSql.slice(createSql.indexOf("(") + 1, createSql.lastIndexOf(")"));
  const cols: string[] = [];
  for (const line of body.split("\\n")) {
    const def = line.trim().replace(/,$/, "");
    const m = def.match(/^[\`\\"]?(\\w+)[\`\\"]?\\s+/);
    if (m && !/^(PRIMARY|FOREIGN|CONSTRAINT|UNIQUE|CHECK)$/i.test(m[1])) cols.push(m[1]);
  }
  return cols;
}

// primary-key column(s) declared in a CREATE TABLE statement (inline or
// table-level), lower-cased
function primaryKeyFromDdl(createSql: string): Set<string> {
  const pk = new Set<string>();
  const body = createSql.slice(createSql.indexOf("(") + 1, createSql.lastIndexOf(")"));
  const tableLevel = body.match(/PRIMARY\\s+KEY\\s*\\(([^)]+)\\)/i);
  if (tableLevel) {
    for (const m of tableLevel[1].matchAll(/[\`\\"]?(\\w+)[\`\\"]?/g)) pk.add(m[1].toLowerCase());
    return pk;
  }
  for (const line of body.split("\\n")) {
    const m = line.trim().match(/^[\`\\"]?(\\w+)[\`\\"]?\\s+[^,]*PRIMARY\\s+KEY/i);
    if (m) pk.add(m[1].toLowerCase());
  }
  return pk;
}

async function ensureSchema(): Promise<SchemaEnsureReport> {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) return report; // local SQLite: schema managed via \`prisma db push\`
  if (ran) return report;
  ran = true;
  report = { ...report, ran: true, mode: "turso", checkedAt: new Date().toISOString() };
  try {
    const { createClient } = await import("@libsql/client");
    const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN ?? "" }) as unknown as LibsqlClient;

    // one introspection round-trip: existing tables, their DDL, existing indexes
    const master = (await client.execute({
      sql: "SELECT name, type, sql FROM sqlite_master WHERE type IN ('table','index')",
    })) as { rows: { name: string; type: string; sql: string | null }[] };
    const tables = new Set<string>();
    const tableDdl = new Map<string, string>();
    const indexes = new Set<string>();
    for (const r of master.rows) {
      if (r.type === "table") {
        tables.add(r.name.toLowerCase());
        if (r.sql) tableDdl.set(r.name.toLowerCase(), r.sql);
      } else if (r.type === "index" && r.name && !r.name.startsWith("sqlite_")) {
        indexes.add(r.name.toLowerCase());
      }
    }

    // ---- primary-key drift: rebuild tables whose PK shape changed ----
    // (e.g. Setting moved from an \`id\` PK to \`key\` as PK — the legacy id
    // column then breaks every Prisma create/upsert with a null-constraint
    // error, because the current client no longer supplies it)
    const currentTables = new Map<string, string>();
    for (const stmt of statements) {
      const m = stmt.match(/^CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?[\`\\"]?(\\w+)[\`\\"]?/i);
      if (m) currentTables.set(m[1].toLowerCase(), stmt);
    }
    for (const [name, createSql] of currentTables) {
      if (!tables.has(name)) continue;
      const oldDdl = tableDdl.get(name);
      if (!oldDdl) continue;
      const oldPk = primaryKeyFromDdl(oldDdl);
      const newPk = primaryKeyFromDdl(createSql);
      if (oldPk.size === 0 || newPk.size === 0) continue;
      const same = oldPk.size === newPk.size && [...oldPk].every((c) => newPk.has(c));
      if (same) continue;
      const oldCols = columnsFromDdl(oldDdl);
      const allCols = columnListFromDdl(createSql);
      const common = allCols.filter((c) => oldCols.has(c.toLowerCase()));
      if (common.length === 0) continue;
      try {
        const tmp = "__rebuild_" + name;
        const colsSql = common.map((c) => '"' + c + '"').join(",");
        const renamed = createSql.replace(/^CREATE\\s+TABLE\\s+"([^"]+)"/i, 'CREATE TABLE "' + tmp + '"');
        await client.execute({ sql: renamed });
        await client.execute({ sql: 'INSERT INTO "' + tmp + '" (' + colsSql + ') SELECT ' + colsSql + ' FROM "' + name + '"' });
        await client.execute({ sql: 'DROP TABLE "' + name + '"' });
        await client.execute({ sql: 'ALTER TABLE "' + tmp + '" RENAME TO "' + name + '"' });
        tableDdl.set(name, createSql);
        report.rebuiltTables.push(name);
      } catch (e) {
        report.errors.push(\`rebuild:\${name}: \${String(e).slice(0, 160)}\`);
        console.error(\`[schema-ensure] rebuild of \${name} failed:\`, String(e).slice(0, 200));
      }
    }

    // two passes: tables + columns first, indexes last — an index may target
    // a column that only exists after its ALTER TABLE ADD COLUMN runs (the
    // column statements sit at the tail of the embedded script)
    const stmts = statements
      .map((s) => classify(s))
      .filter((c): c is NonNullable<ReturnType<typeof classify>> => Boolean(c));

    for (const c of stmts) {
      if (c.kind === "index") continue;
      try {
        if (c.kind === "table") {
          if (!tables.has(c.name.toLowerCase())) {
            await client.execute({ sql: c.sql });
            tables.add(c.name.toLowerCase());
            report.createdTables.push(c.name);
          }
        } else {
          const ddl = tableDdl.get(c.table.toLowerCase());
          if (!ddl) continue; // table missing — the CREATE TABLE above brings it with all columns
          if (!columnsFromDdl(ddl).has(c.column.toLowerCase())) {
            await client.execute({ sql: c.sql });
            tableDdl.set(c.table.toLowerCase(), ddl.replace(/\\)\\s*$/, \`, \${c.sql.slice(c.sql.indexOf("ADD COLUMN") + 11)})\`));
            report.addedColumns.push(\`\${c.table}.\${c.column}\`);
          }
        }
      } catch (e) {
        report.errors.push(\`\${c.kind}:\${"name" in c ? c.name : c.table + "." + c.column}: \${String(e).slice(0, 160)}\`);
      }
    }

    for (const c of stmts) {
      if (c.kind !== "index") continue;
      try {
        if (!indexes.has(c.name.toLowerCase())) {
          await client.execute({ sql: c.sql });
          indexes.add(c.name.toLowerCase());
          report.createdIndexes.push(c.name);
        }
      } catch (e) {
        report.errors.push(\`index:\${c.name}: \${String(e).slice(0, 160)}\`);
      }
    }
    if (report.createdTables.length || report.createdIndexes.length || report.addedColumns.length || report.rebuiltTables.length) {
      console.log(
        \`[schema-ensure] healed: +\${report.createdTables.length} tables, +\${report.createdIndexes.length} indexes, +\${report.addedColumns.length} columns, rebuilt: \${report.rebuiltTables.join(", ") || "none"}\`
      );
    }
    for (const e of report.errors) console.error("[schema-ensure] statement error:", e);
  } catch (e) {
    report.errors.push(String(e).slice(0, 300));
    console.error("[schema-ensure] failed:", String(e).slice(0, 300));
  }
  return report;
}

export { ensureSchema, report as schemaReport };
`;

const target = path.join(__dirname, "..", "src", "lib", "schema-ensure.ts");
fs.writeFileSync(target, out, "utf8");
console.log(`wrote ${target} (${statements.length} statements embedded)`);
