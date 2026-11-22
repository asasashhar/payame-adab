#!/usr/bin/env bash
# Payam-e-Adab — (re)start the production server on port 3000.
# Safe to run repeatedly: no-ops when the app answers 200 AND the database is
# healthy; otherwise restores the seed data and (re)starts the server.
# Usage: bash /home/z/my-project/scripts/start-server.sh
set -u
cd /home/z/my-project

# DB health first — a recycled sandbox can leave a "healthy-looking" server
# running over a wiped database, so never trust an early-exit before this
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.user.count().then(async (n) => { console.log(n); await db.\$disconnect(); }).catch(() => console.log(0));
" 2>/dev/null || echo 0)

# also restart when the standalone build is newer than the running server
STALE=0
if [ -f .next/standalone/BUILD_ID ]; then
  PID0=$(ss -tlnp 2>/dev/null | grep :3000 | grep -oE 'pid=[0-9]+' | head -1); PID0=${PID0#pid=}
  if [ -n "$PID0" ]; then
    PIDSTART=$(ps -o lstart= -p "$PID0" 2>/dev/null)
    BUILD_MTIME=$(stat -c %Y .next/standalone/BUILD_ID 2>/dev/null || echo 0)
    PID_EPOCH=$(ps -o etimes= -p "$PID0" 2>/dev/null | tr -d ' ' || echo 0)
    NOW_EPOCH=$(date +%s)
    PID_START_EPOCH=$(( NOW_EPOCH - ${PID_EPOCH:-0} ))
    if [ "${BUILD_MTIME:-0}" -gt "$PID_START_EPOCH" ]; then STALE=1; fi
  fi
fi

if [ "$STALE" = "0" ] && code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ --max-time 5) && [ "$code" = "200" ] && [ "${USER_COUNT:-0}" -ge 4 ]; then
  echo "server already up (200), database healthy (users=$USER_COUNT)"
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

# pre-start self-heal: if the recycle wiped the database, restore admins,
# settings, content and qafiya BEFORE the server accepts traffic (the
# in-process auto-seed in instrumentation.ts covers starts that bypass this
# script; both are idempotent)
if [ "${USER_COUNT:-0}" -lt 4 ]; then
  echo "database unhealthy (users=$USER_COUNT) — restoring seed data ..."
  node scripts/seed/index.js > /tmp/autoseed.log 2>&1
  node scripts/seed/upgrade.js >> /tmp/autoseed.log 2>&1
  node scripts/seed-qafiya-behr.js >> /tmp/autoseed.log 2>&1
  echo "seed restore done (log: /tmp/autoseed.log)"
fi

set -a; . ./.env; set +a
export NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
export APP_ROOT=/home/z/my-project
export AUTO_SEED=1
( cd .next/standalone && nohup node server.js > /tmp/prodserver.log 2>&1 & )
sleep 10

code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ --max-time 15)
echo "server status after restart: $code"
