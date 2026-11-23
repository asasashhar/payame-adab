#!/usr/bin/env bash
# Payam-e-Adab — (re)start the production server on port 3000.
#
# Durability model (recycle-proof):
#   1. On every healthy start, take a consistent snapshot of db/custom.db into
#      db/backups/auto-<ts>.db (newest 8 kept) and mirror it to
#      db/backups/latest.db, which is TRACKED IN GIT — so every push carries
#      the newest user accounts, settings and submissions.
#   2. When the database is unhealthy (sandbox recycle wiped it), restore the
#      newest HEALTHY backup first; only fall back to the canonical seeds when
#      no healthy backup exists (first deployment).
#   3. public/uploads/ is also tracked in git, so uploaded media survives.
#
# Safe to run repeatedly: no-ops when the app answers 200 AND the database is
# healthy; otherwise restores, (re)builds and (re)starts as needed.
# Usage: bash /home/z/my-project/scripts/start-server.sh
set -u
cd /home/z/my-project
mkdir -p db/backups

db_user_count() {
  python3 - <<'PY'
import sqlite3, os, sys
path = os.environ.get("DB_PATH", "db/custom.db")
try:
    c = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    n = c.execute("select count(*) from User").fetchone()[0]
    c.close()
    print(n)
except Exception:
    print(0)
PY
}

snapshot_db() {
  # consistent snapshot via the sqlite3 backup API (safe while the server runs)
  python3 - "$1" <<'PY'
import sqlite3, sys
try:
    src = sqlite3.connect("db/custom.db")
    dst = sqlite3.connect(sys.argv[1])
    src.backup(dst)
    dst.close(); src.close()
except Exception as e:
    sys.stderr.write(f"snapshot failed: {e}\n")
    sys.exit(1)
PY
}

prune_backups() {
  ls -1t db/backups/auto-*.db 2>/dev/null | tail -n +9 | xargs -r rm -f
}

USER_COUNT=$(db_user_count)

# also restart when the standalone build is newer than the running server
STALE=0
if [ -f .next/standalone/BUILD_ID ]; then
  PID0=$(ss -tlnp 2>/dev/null | grep :3000 | grep -oE 'pid=[0-9]+' | head -1); PID0=${PID0#pid=}
  if [ -n "$PID0" ]; then
    BUILD_MTIME=$(stat -c %Y .next/standalone/BUILD_ID 2>/dev/null || echo 0)
    PID_EPOCH=$(ps -o etimes= -p "$PID0" 2>/dev/null | tr -d ' ' || echo 0)
    PID_START_EPOCH=$(( $(date +%s) - ${PID_EPOCH:-0} ))
    if [ "${BUILD_MTIME:-0}" -gt "$PID_START_EPOCH" ]; then STALE=1; fi
  fi
fi

if [ "$STALE" = "0" ] && code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ --max-time 5) && [ "$code" = "200" ] && [ "${USER_COUNT:-0}" -ge 4 ]; then
  # healthy → snapshot (durability) and exit
  if snapshot_db db/backups/auto-$(date +%Y%m%d-%H%M%S).db; then
    snapshot_db db/backups/latest.db >/dev/null 2>&1 || cp db/custom.db db/backups/latest.db
    prune_backups
    echo "server already up (200), database healthy (users=$USER_COUNT) — snapshot saved"
  else
    echo "server already up (200), database healthy (users=$USER_COUNT)"
  fi
  exit 0
fi

# kill anything stale on :3000 (also when the DB needs restoring underneath it)
PID=$(ss -tlnp 2>/dev/null | grep :3000 | grep -oE 'pid=[0-9]+' | head -1)
[ -n "$PID" ] && kill -9 "${PID#pid=}" 2>/dev/null && sleep 2

# standalone build missing → build it once
if [ ! -f .next/standalone/server.js ]; then
  echo "standalone build missing — running npm run build ..."
  npm run build > /tmp/build.log 2>&1 || { echo "BUILD FAILED — see /tmp/build.log"; exit 1; }
fi

# pre-start self-heal: restore the newest HEALTHY backup when the recycle
# wiped the database; canonical seeds run only when no healthy backup exists
# (both are idempotent, so seeds always run afterwards to fill schema drift)
if [ "${USER_COUNT:-0}" -lt 4 ]; then
  echo "database unhealthy (users=$USER_COUNT) — looking for a healthy backup ..."
  RESTORED=0
  for b in $(ls -1t db/backups/*.db 2>/dev/null | grep -v auto- | head -8) $(ls -1t db/backups/auto-*.db 2>/dev/null | head -8); do
    [ -f "$b" ] || continue
    C=$(DB_PATH="$b" db_user_count)
    if [ "${C:-0}" -ge 4 ]; then
      cp "$b" db/custom.db
      echo "restored database from backup: $b (users=$C)"
      RESTORED=1
      break
    fi
  done
  if [ "$RESTORED" = "0" ]; then
    echo "no healthy backup — restoring canonical seed data ..."
  fi
  node scripts/seed/index.js > /tmp/autoseed.log 2>&1
  node scripts/seed/upgrade.js >> /tmp/autoseed.log 2>&1
  node scripts/seed-qafiya-behr.js >> /tmp/autoseed.log 2>&1
  echo "merge-seed done on top (log: /tmp/autoseed.log)"
fi

set -a; . ./.env; set +a
export NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
export APP_ROOT=/home/z/my-project
export AUTO_SEED=1
# fully detach the server process: every std fd redirected away from any
# caller-owned pipe, stdin closed, job dropped from bash's table — the script
# must never linger waiting on the server it spawned
cd .next/standalone
nohup node server.js > /tmp/prodserver.log 2>&1 < /dev/null &
disown
cd /home/z/my-project
sleep 10

code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ --max-time 15)
echo "server status after restart: $code"

# snapshot the freshly (re)started healthy database
if [ "$code" = "200" ] && [ "$(db_user_count)" -ge 4 ]; then
  snapshot_db db/backups/auto-$(date +%Y%m%d-%H%M%S).db && snapshot_db db/backups/latest.db >/dev/null 2>&1 || true
  prune_backups
fi
