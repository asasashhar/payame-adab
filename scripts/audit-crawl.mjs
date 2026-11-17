// Site-wide audit crawler: HTTP status per page, internal links, image assets, missing alt.
// GET-only — safe against rate limits. Results: audit/crawl.json + readable summary.
import fs from "fs";

const BASE = "http://localhost:3000";
const ids = {
  poem: "cmwjzw8rt000argyhp4jq83fz",
  article: "cmwjzw8td000srgyhwv7b9thh",
  news: "cmwjzwek60003rgzgyb0xv7dy",
  book: "cmwjzw8tr000zrgyhmeilvpis",
  poet: "cmwjzw8ri0002rgyh99pwgkk6",
  paper: "cmwjzw8u50017rgyhfs2bmxu8",
  mag: "cmwjzwekd0007rgzgl57wczpp",
  user: "cmwjzfnyi0002rgw6l1xw5iua",
};

const PAGES = [
  "/", "/about", "/articles", `/articles/${ids.article}`, `/articles/${ids.article}/print`,
  "/books", `/books/${ids.book}`, `/books/${ids.book}/read`,
  "/competitions", "/contact", "/dashboard", "/dictionary", "/events", "/feedback",
  "/forgot-password", "/login", "/magazine", `/magazine/${ids.mag}`, `/magazine/${ids.mag}/read`,
  "/news", `/news/${ids.news}`, "/newspaper", `/newspaper/${ids.paper}`, "/poetry", `/poetry/${ids.poem}`,
  `/poetry/${ids.poem}/print`, `/poets/${ids.poet}`, "/poetry/poets", "/poets", "/qafiya", "/register",
  "/reset-password", "/search", "/submit", "/taqti", `/profile/${ids.user}`, `/profile/${ids.poet}`,
  "/verify",
  // admin
  "/admin/login",
  "/admin", "/admin/analytics", "/admin/submissions", "/admin/scheduled", "/admin/admins", "/admin/ads",
  "/admin/appearance", "/admin/articles", "/admin/banners", "/admin/behrs", "/admin/books",
  "/admin/comments", "/admin/competitions", "/admin/deleted", "/admin/events", "/admin/feedback",
  "/admin/homepage", "/admin/likes", "/admin/logs", "/admin/magazines", "/admin/mail", "/admin/news",
  "/admin/newspaper", "/admin/poems", "/admin/poets", "/admin/qafiya", "/admin/settings", "/admin/shers",
  "/admin/users", "/admin/words",
];

const cache = new Map();
async function status(url, method = "GET") {
  const key = method + url;
  if (cache.has(key)) return cache.get(key);
  let out = { code: 0, ok: false, type: "" };
  try {
    const res = await fetch(url, { method, redirect: "manual" });
    out = { code: res.status, ok: res.status < 400, type: res.headers.get("content-type") ?? "" };
    if (res.status >= 300 && res.status < 400) {
      out.location = res.headers.get("location") ?? "";
    }
    // drain body to free sockets
    await res.arrayBuffer().catch(() => {});
  } catch (e) {
    out.error = String(e).slice(0, 120);
  }
  cache.set(key, out);
  return out;
}

function abs(u) {
  try { return new URL(u, BASE).toString(); } catch { return null; }
}

const linkGraph = {};
const imgIssues = [];
const linkIssues = [];
const allImgs = new Map();

async function crawlPage(path) {
  const url = BASE + path;
  const st = await status(url);
  const row = { path, status: st.code, links: 0, imgs: 0 };
  if (!st.ok || !(st.type ?? "").includes("html")) {
    row.note = st.location ? `redirect→${st.location}` : st.error ?? st.type;
    return row;
  }
  const res = await fetch(url);
  const html = await res.text();
  // internal links
  const hrefs = [...html.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1].split("?")[0]);
  const uniq = [...new Set(hrefs)].filter((h) => !h.startsWith("//"));
  row.links = uniq.length;
  linkGraph[path] = uniq;
  // images
  const imgs = [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
  row.imgs = imgs.length;
  for (const tag of imgs) {
    const srcM = tag.match(/src="([^"]+)"/);
    const src = srcM ? srcM[1] : "(no src)";
    const altM = tag.match(/alt="([^"]*)"/);
    const hasAlt = /\balt=/.test(tag);
    const absSrc = src.startsWith("http") ? src : src.startsWith("/") ? BASE + src : null;
    const entry = { src, on: path, hasAlt, altText: altM ? altM[1] : "" };
    if (!allImgs.has(absSrc ?? src)) allImgs.set(absSrc ?? src, []);
    allImgs.get(absSrc ?? src).push(entry);
    if (src === "(no src)") imgIssues.push({ ...entry, issue: "img with no src" });
    else if (!hasAlt) imgIssues.push({ ...entry, issue: "missing alt attribute" });
  }
  return row;
}

const pageRows = [];
for (const p of PAGES) pageRows.push(await crawlPage(p));

// status-check every discovered internal link target
const discovered = new Set();
for (const [from, links] of Object.entries(linkGraph)) {
  for (const l of links) {
    const absL = abs(l);
    if (!absL || !absL.startsWith(BASE)) continue;
    discovered.add(l);
    const st = await status(absL);
    if (!st.ok) linkIssues.push({ from, href: l, status: st.code, redirect: st.location ?? "" });
  }
}

// status-check every unique image source
const brokenImgs = [];
for (const [src, entries] of allImgs.entries()) {
  if (!src.startsWith(BASE) && !src.startsWith("http")) continue;
  const st = await status(src);
  if (!st.ok) brokenImgs.push({ src, status: st.code, seenOn: entries.slice(0, 3).map((e) => e.on) });
}

// non-page API GET probes that the UI relies on
const apiProbes = ["/api/settings", "/api/auth/me", "/api/magazines", "/api/poems"];
const apiRows = [];
for (const a of apiProbes) {
  const st = await status(BASE + a);
  apiRows.push({ path: a, status: st.code, type: st.type.slice(0, 40) });
}

fs.mkdirSync("audit", { recursive: true });
fs.writeFileSync("audit/crawl.json", JSON.stringify({ pageRows, linkIssues, imgIssues, brokenImgs, apiRows, linkGraph }, null, 2));

// readable summary
console.log("=== PAGE STATUS ===");
for (const r of pageRows) console.log(`${r.status} ${String(r.path).padEnd(34)} links:${String(r.links).padEnd(3)} imgs:${r.imgs} ${r.note ?? ""}`);
console.log(`\n=== BROKEN LINKS (${linkIssues.length}) ===`);
for (const l of linkIssues.slice(0, 40)) console.log(`${l.status} ${l.href}  (from ${l.from}) ${l.redirect}`);
console.log(`\n=== BROKEN/FAILED IMAGES (${brokenImgs.length}) ===`);
for (const b of brokenImgs.slice(0, 30)) console.log(`${b.status} ${b.src.slice(0, 90)} on ${b.seenOn.join(", ")}`);
console.log(`\n=== MISSING ALT (${imgIssues.filter((i) => i.issue === "missing alt attribute").length}) ===`);
for (const i of imgIssues.filter((i) => i.issue === "missing alt attribute").slice(0, 20)) console.log(`${i.src.slice(0, 80)} on ${i.on}`);
console.log("\n=== API PROBES ===");
for (const a of apiRows) console.log(`${a.status} ${a.path} ${a.type}`);
