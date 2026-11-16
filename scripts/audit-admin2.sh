#!/bin/bash
# Admin audit v2: real login via semantic locators, verify /admin reached, then audit all panel pages.
BASE=http://localhost:3000
OUT=/tmp/audit
: > $OUT/metrics-admin.txt

METRICS='JSON.stringify((()=>{const d=document.documentElement;const imgs=[...document.images];const broken=imgs.filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src.slice(0,110));const t=document.body.innerText;const err=t.includes("Application error")||t.includes("This page could not be found")||t.includes("Sign in to Admin Panel");const h1=document.querySelector("h1");return {sw:d.scrollWidth,cw:d.clientWidth,ov:d.scrollWidth>d.clientWidth+2,broken,errText:err,h1:h1?getComputedStyle(h1).fontFamily.slice(0,40):"-",h1s:h1?getComputedStyle(h1).fontSize:"-",btns:document.querySelectorAll("button").length,rows:document.querySelectorAll("table tbody tr, [class*=card]").length};})())'

shot_and_eval () { # $1 url  $2 name  $3 vp-tag
  agent-browser set viewport 1366 850 >/dev/null 2>&1
  [ "$3" = "m" ] && agent-browser set viewport 390 844 >/dev/null 2>&1
  agent-browser open "$1" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  sleep 0.6
  m=$(agent-browser eval "$METRICS" 2>/dev/null | head -2 | tail -1)
  echo "$2|$3|$m" >> $OUT/metrics-admin.txt
  agent-browser screenshot "$OUT/$2-$3.png" >/dev/null 2>&1
}

slugify () { echo "$1" | sed 's|/|=|g; s|^=||' | cut -c1-40; }

# 1) login
agent-browser set viewport 1366 850 >/dev/null
agent-browser open "$BASE/admin/login" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
agent-browser find label "Admin ID (Gmail)" fill "@admin" >/dev/null 2>&1 || agent-browser eval "document.querySelectorAll('input')[0].value='@admin'" >/dev/null 2>&1
agent-browser find label "Password" fill "darulhuda" >/dev/null 2>&1 || agent-browser eval "document.querySelectorAll('input')[1].value='darulhuda'" >/dev/null 2>&1
agent-browser find role button click --name "Sign in to Admin Panel" >/dev/null 2>&1
sleep 4
URL=$(agent-browser get url 2>/dev/null)
echo "LOGIN RESULT URL: $URL" >> $OUT/metrics-admin.txt
if [[ "$URL" != *"localhost:3000/admin"* ]]; then
  echo "LOGIN FAILED — aborting admin loop"; cat $OUT/metrics-admin.txt; exit 1
fi

ADMIN=( "/admin" "/admin/analytics" "/admin/submissions" "/admin/scheduled" "/admin/admins" "/admin/ads" "/admin/appearance" "/admin/articles" "/admin/banners" "/admin/behrs" "/admin/books" "/admin/comments" "/admin/competitions" "/admin/deleted" "/admin/events" "/admin/feedback" "/admin/homepage" "/admin/likes" "/admin/logs" "/admin/magazines" "/admin/mail" "/admin/news" "/admin/newspaper" "/admin/poems" "/admin/poets" "/admin/qafiya" "/admin/settings" "/admin/shers" "/admin/users" "/admin/words" )

for u in "${ADMIN[@]}"; do n="adm2$(slugify "$u")"; shot_and_eval "$BASE$u" "$n" d; done
for u in "${ADMIN[@]}"; do n="adm2$(slugify "$u")"; shot_and_eval "$BASE$u" "$n" m; done

echo "ADMIN V2 DONE: $(wc -l < $OUT/metrics-admin.txt) entries"
