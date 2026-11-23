#!/usr/bin/env bash
# Integration test for the boot-time schema healer (src/lib/schema-ensure.ts).
#
# Fabricates an "old-schema" SQLite database that contains ONLY User + Setting
# tables (mirroring the drifted Turso production database: settings/users work,
# every content table missing or outdated), boots the standalone server against
# it via TURSO_DATABASE_URL=file:... on port 3100, and verifies that
# instrumentation self-heals the schema: all tables/columns created, /api/health
# fully green, homepage renders 200.
set -u
cd /home/z/my-project
TESTDB=/tmp/old-test.db
LOG=/tmp/test-3100.log
PORT=3100

rm -f "$TESTDB" "$LOG" /tmp/health-result.json
python3 - "$TESTDB" <<'PY'
import sqlite3, sys
c = sqlite3.connect(sys.argv[1])
# old-shape tables: minimal columns, as a schema predating recent migrations
c.execute('CREATE TABLE "User" ("id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "name" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT \'USER\', "status" TEXT NOT NULL DEFAULT \'ACTIVE\')')
c.execute('CREATE UNIQUE INDEX "User_email_key" ON "User"("email")')
c.execute('CREATE TABLE "Setting" ("id" TEXT NOT NULL PRIMARY KEY, "key" TEXT NOT NULL, "value" TEXT NOT NULL)')
c.execute('CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key")')
for i, email in enumerate(["a@x.pk", "b@x.pk", "c@x.pk", "d@x.pk"]):
    c.execute('INSERT INTO "User" ("id","email","passwordHash","name","role","status") VALUES (?,?,?,?,?,?)',
              (f"u{i}", email, "x", f"U{i}", "ADMIN", "ACTIVE"))
c.execute('INSERT INTO "Setting" ("id","key","value") VALUES ("s1","siteName","پیامِ ادب")')
c.commit(); c.close()
print("old-schema DB ready (User+Setting only, 4 users)")
PY

# boot a fresh instance against the drifted DB
( cd .next/standalone && PORT=$PORT HOSTNAME=127.0.0.1 TURSO_DATABASE_URL="file:$TESTDB" \
  TURSO_AUTH_TOKEN="" DATABASE_URL="file:$TESTDB" AUTO_SEED=1 APP_ROOT=/home/z/my-project \
  nohup node server.js > "$LOG" 2>&1 & )

echo "waiting for boot + self-heal..."
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/api/health" --max-time 5 2>/dev/null || echo 000)
  [ "$code" = "200" ] || [ "$code" = "503" ] && break
  sleep 2
done

echo "== /api/health:"
curl -s "http://localhost:$PORT/api/health" --max-time 20 > /tmp/health-result.json
python3 - <<'PY'
import json
h = json.load(open("/tmp/health-result.json"))
print("mode:", h["mode"], "| connected:", h["connected"], "| ok:", h["ok"])
bad = {k: v.get("error", "")[:90] for k, v in h["tables"].items() if not v["ok"]}
print("broken tables:", bad if bad else "none — all", len(h["tables"]), "tables OK")
counts = {k: v.get("count") for k, v in h["tables"].items() if v["ok"]}
print("counts:", counts)
PY

echo "== homepage:"; curl -s -o /dev/null -w "status=%{http_code}\n" "http://localhost:$PORT/" --max-time 30
echo "== tables now in DB:"; python3 -c "
import sqlite3
c = sqlite3.connect('$TESTDB')
n = [r[0] for r in c.execute(\"select name from sqlite_master where type='table' and name not like 'sqlite_%'\")]
print(len(n), 'tables:', ', '.join(sorted(n)[:10]), '...')"
echo "== self-heal log lines:"; grep -E "schema-ensure|auto-seed" "$LOG" | head -4

# stop the test instance
PID=$(ss -tlnp 2>/dev/null | grep :$PORT | grep -oE 'pid=[0-9]+' | head -1); [ -n "$PID" ] && kill -9 "${PID#pid=}" && echo "test instance stopped"
