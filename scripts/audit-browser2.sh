#!/bin/bash
# Round 2: re-run mobile metrics for public pages (server had crashed), then admin audit.
BASE=http://localhost:3000
OUT=/tmp/audit
: > $OUT/metrics2.txt

METRICS='JSON.stringify((()=>{const d=document.documentElement;const imgs=[...document.images];const broken=imgs.filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src.slice(0,110));const t=document.body.innerText;const err=t.includes("Application error")||t.includes("This page could not be found");const h1=document.querySelector("h1");return {sw:d.scrollWidth,cw:d.clientWidth,ov:d.scrollWidth>d.clientWidth+2,broken,errText:err,h1:h1?getComputedStyle(h1).fontFamily.slice(0,44):"-",h1s:h1?getComputedStyle(h1).fontSize:"-",fNast:document.fonts.check("16px \"Noto Nastaliq Urdu\""),fJameel:document.fonts.check("16px \"PFA-jameel-noori-nastaleeq\"")};})())'

shot_and_eval () { # $1 url  $2 name  $3 vp-tag
  local tries=0
  agent-browser open "$1" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  sleep 0.5
  m=$(agent-browser eval "$METRICS" 2>/dev/null | head -2 | tail -1)
  echo "$2|$3|$m" >> $OUT/metrics2.txt
  agent-browser screenshot "$OUT/$2-$3.png" >/dev/null 2>&1
}

slugify () { echo "$1" | sed 's|/|=|g; s|^=||' | cut -c1-40; }

PUB=( "/" "/about" "/articles" "/books" "/competitions" "/contact" "/dictionary" "/events" "/feedback" "/forgot-password" "/login" "/magazine" "/newspaper" "/poetry" "/poets" "/qafiya" "/register" "/reset-password" "/search" "/submit" "/taqti" "/verify" )
DYN=( "/poetry/cmwir2pid000aoqx7drp2n183" "/poetry/cmwir2pid000aoqx7drp2n183/print" "/articles/cmwir2pit000soqx7sdmbet1w" "/news/cmwir2pre0003oqxl61s0tip1" "/books/cmwir2pj3000zoqx7nnbv3qfz" "/books/cmwir2pj3000zoqx7nnbv3qfz/read" "/magazine/cmwir2prn0007oqxlljt92y7g" "/newspaper/cmwir2pjb0017oqx7jmweiofu" "/poets/cmwir2pi50002oqx7c93p7fzm" "/profile/cmwir2phz0001oqx7qbn292qc" "/dashboard" )

# 1) mobile metrics for all public pages (desktop shots already valid from round 1)
agent-browser set viewport 390 844 >/dev/null
for u in "${PUB[@]}" "${DYN[@]}"; do n="pub$(slugify "$u")"; shot_and_eval "$BASE$u" "$n" m; done

# 2) admin: login through the real UI, then audit all panel pages
agent-browser set viewport 1366 850 >/dev/null
agent-browser open "$BASE/admin/login" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
IN=$(agent-browser snapshot -i -c 2>/dev/null)
EF=$(echo "$IN" | grep -oE '@e[0-9]+' | sed -n 1p)   # first textbox = Admin ID
EP=$(echo "$IN" | grep -oE '@e[0-9]+' | sed -n 2p)   # password
EB=$(echo "$IN" | grep -oE '@e[0-9]+' | sed -n 4p)   # sign-in button
agent-browser fill $EF "@admin" >/dev/null
agent-browser fill $EP "darulhuda" >/dev/null
agent-browser click $EB >/dev/null
sleep 3
agent-browser get url >> $OUT/metrics2.txt
ADMIN=( "/admin" "/admin/analytics" "/admin/submissions" "/admin/scheduled" "/admin/admins" "/admin/ads" "/admin/appearance" "/admin/articles" "/admin/banners" "/admin/behrs" "/admin/books" "/admin/comments" "/admin/competitions" "/admin/deleted" "/admin/events" "/admin/feedback" "/admin/homepage" "/admin/likes" "/admin/logs" "/admin/magazines" "/admin/mail" "/admin/news" "/admin/newspaper" "/admin/poems" "/admin/poets" "/admin/qafiya" "/admin/settings" "/admin/shers" "/admin/users" "/admin/words" )
for u in "${ADMIN[@]}"; do n="adm$(slugify "$u")"; shot_and_eval "$BASE$u" "$n" d; done

agent-browser set viewport 390 844 >/dev/null
for u in "${ADMIN[@]}"; do n="adm$(slugify "$u")"; shot_and_eval "$BASE$u" "$n" m; done

echo "ROUND2 DONE: $(wc -l < $OUT/metrics2.txt) entries"
