#!/bin/bash
# Re-shoot mobile screenshots with per-page viewport set + width verification.
BASE=http://localhost:3000
OUT=/tmp/audit
PAGES=( "/poets" "/qafiya" "/register" "/reset-password" "/search" "/submit" "/taqti" "/verify" "/profile/cmwir2phz0001oqx7qbn292qc" "/dashboard" "/poetry/cmwir2pid000aoqx7drp2n183" "/poetry/cmwir2pid000aoqx7drp2n183/print" "/articles/cmwir2pit000soqx7sdmbet1w" "/news/cmwir2pre0003oqxl61s0tip1" "/books/cmwir2pj3000zoqx7nnbv3qfz" "/books/cmwir2pj3000zoqx7nnbv3qfz/read" "/magazine/cmwir2prn0007oqxlljt92y7g" "/newspaper/cmwir2pjb0017oqx7jmweiofu" "/poets/cmwir2pi50002oqx7c93p7fzm" )
slugify () { echo "$1" | sed 's|/|=|g; s|^=||' | cut -c1-40; }
for u in "${PAGES[@]}"; do
  n="pub$(slugify "$u")"
  agent-browser set viewport 390 844 >/dev/null 2>&1
  agent-browser open "$BASE$u" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  sleep 0.6
  agent-browser screenshot "$OUT/$n-m.png" >/dev/null 2>&1
  w=$(python3 -c "from PIL import Image; print(Image.open('$OUT/$n-m.png').size[0])")
  if [ "$w" != "390" ]; then
    agent-browser set viewport 390 844 >/dev/null 2>&1
    sleep 1
    agent-browser reload >/dev/null 2>&1
    sleep 1
    agent-browser screenshot "$OUT/$n-m.png" >/dev/null 2>&1
    w=$(python3 -c "from PIL import Image; print(Image.open('$OUT/$n-m.png').size[0])")
  fi
  echo "$n: width=$w"
done
echo RESHOOT-DONE
