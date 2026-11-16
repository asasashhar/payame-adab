#!/bin/bash
# Browser audit: per page — overflow, broken imgs, error text, fonts; screenshots desktop+mobile.
BASE=http://localhost:3000
OUT=/tmp/audit
mkdir -p $OUT
: > $OUT/metrics.txt

METRICS='JSON.stringify((()=>{const d=document.documentElement;const imgs=[...document.images];const broken=imgs.filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src.slice(0,110));const t=document.body.innerText;const err=t.includes("Application error")||t.includes("This page could not be found")||t.includes("500");const h1=document.querySelector("h1");return {sw:d.scrollWidth,cw:d.clientWidth,ov:d.scrollWidth>d.clientWidth+2,broken,errText:err,h1:h1?getComputedStyle(h1).fontFamily.slice(0,44):"-",h1s:h1?getComputedStyle(h1).fontSize:"-"};})())'

shot_and_eval () { # $1 url  $2 name  $3 vp-tag
  agent-browser open "$1" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  sleep 0.5
  m=$(agent-browser eval "$METRICS" 2>/dev/null | head -2 | tail -1)
  echo "$2|$3|$m" >> $OUT/metrics.txt
  agent-browser screenshot "$OUT/$2-$3.png" >/dev/null 2>&1
}

PUB=( "/" "/about" "/articles" "/books" "/competitions" "/contact" "/dictionary" "/events" "/feedback" "/forgot-password" "/login" "/magazine" "/newspaper" "/poetry" "/poets" "/qafiya" "/register" "/reset-password" "/search" "/submit" "/taqti" "/verify" )

DYN=( "/poetry/cmwir2pid000aoqx7drp2n183" "/poetry/cmwir2pid000aoqx7drp2n183/print" "/articles/cmwir2pit000soqx7sdmbet1w" "/news/cmwir2pre0003oqxl61s0tip1" "/books/cmwir2pj3000zoqx7nnbv3qfz" "/books/cmwir2pj3000zoqx7nnbv3qfz/read" "/magazine/cmwir2prn0007oqxlljt92y7g" "/newspaper/cmwir2pjb0017oqx7jmweiofu" "/poets/cmwir2pi50002oqx7c93p7fzm" "/profile/cmwir2phz0001oqx7qbn292qc" "/dashboard" )

slugify () { echo "$1" | sed 's|/|=|g; s|^=||' | cut -c1-40; }

agent-browser set viewport 1366 850 >/dev/null
for u in "${PUB[@]}"; do n="pub$(slugify "$u")"; shot_and_eval "$BASE$u" "$n" d; done
for u in "${DYN[@]}"; do n="pub$(slugify "$u")"; shot_and_eval "$BASE$u" "$n" d; done

agent-browser set viewport 390 844 >/dev/null
for u in "${PUB[@]}"; do n="pub$(slugify "$u")"; shot_and_eval "$BASE$u" "$n" m; done
for u in "${DYN[@]}"; do n="pub$(slugify "$u")"; shot_and_eval "$BASE$u" "$n" m; done

echo "PUBLIC DONE: $(wc -l < $OUT/metrics.txt) entries"
