#!/usr/bin/env bash
# Payam-e-Adab — (re)start the production server on port 3000.
# Safe to run repeatedly: skips the start when the app already answers 200.
# Usage: bash /home/z/my-project/scripts/start-server.sh
set -u
cd /home/z/my-project

if code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ --max-time 5) && [ "$code" = "200" ]; then
  echo "server already up (200)"
  exit 0
fi

# kill anything stale on :3000
PID=$(ss -tlnp 2>/dev/null | grep :3000 | grep -oE 'pid=[0-9]+' | head -1)
[ -n "$PID" ] && kill -9 "${PID#pid=}" 2>/dev/null && sleep 2

# standalone build missing → build it once
if [ ! -f .next/standalone/server.js ]; then
  echo "standalone build missing — running npm run build ..."
  npm run build > /tmp/build.log 2>&1 || { echo "BUILD FAILED — see /tmp/build.log"; exit 1; }
fi

set -a; . ./.env; set +a
export NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
( cd .next/standalone && nohup node server.js > /tmp/prodserver.log 2>&1 & )
sleep 10

code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ --max-time 15)
echo "server status after restart: $code"
