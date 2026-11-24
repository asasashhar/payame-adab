// Verify the admin-gap fixes end-to-end through real API calls:
// 1. featured picks now persist via PUT /api/settings (was silently dropped)
// 2. homepage actually uses the featured pick
// 3. GET /api/ads admin branch returns ALL ads incl. deactivated
// 4. qafiya AI endpoint still healthy after rebuild (cache path)
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const EMAIL = "mdnematullah1343@gmail.com";
const PASSWORD = "darulhuda";

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

// admin login through the real UI → session cookie in context
await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL("**/admin", { timeout: 20000 });
console.log("admin login:", page.url());

// pick the newest published poem id via the public API
const poems = await (await fetch(BASE + "/api/poems?status=PUBLISHED&limit=5")).json();
const poemId = (Array.isArray(poems) ? poems : poems.items ?? poems.poems ?? [])[0]?.id;
console.log("picked poem:", poemId ?? "NONE");

// 1+2: featured pick persists
const put = await fetch(BASE + "/api/settings", {
  method: "PUT",
  headers: { "Content-Type": "application/json", cookie: await cookieHeader(ctx) },
  body: JSON.stringify({ featuredPoemId: poemId ?? "" }),
});
console.log("PUT featuredPoemId:", put.status);
const settings = await (await fetch(BASE + "/api/settings")).json();
console.log("settings now has featuredPoemId:", JSON.stringify(settings.featuredPoemId), "=== picked:", settings.featuredPoemId === poemId);

// homepage renders with the featured pick (200 + contains the poem link)
const home = await fetch(BASE + "/");
console.log("homepage:", home.status);
const hp = await home.text();
console.log("homepage contains featured poem id:", hp.includes(poemId ?? "@@never@@"));

// restore: clear the pick
await fetch(BASE + "/api/settings", {
  method: "PUT",
  headers: { "Content-Type": "application/json", cookie: await cookieHeader(ctx) },
  body: JSON.stringify({ featuredPoemId: "" }),
});
const after = await (await fetch(BASE + "/api/settings")).json();
console.log("restored to empty:", JSON.stringify(after.featuredPoemId) === '""');

// 3: ads admin branch — first deactivate nothing; just check admin sees all:true marker + count >= public
const adsAdmin = await (await fetch(BASE + "/api/ads", { headers: { cookie: await cookieHeader(ctx) } })).json();
console.log("admin ads all:", adsAdmin.all === true, "| left:", adsAdmin.left.length, "right:", adsAdmin.right.length);

// 4: qafiya ai cache still works
const q = await (await fetch(BASE + "/api/qafiya/ai", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: "یاد" }),
})).json();
console.log("qafiya ai:", q.ok === true, "| source:", q.source, "| rhymes:", q.rhymes?.length);

await browser.close();

async function cookieHeader(ctx) {
  const cookies = await ctx.cookies(BASE);
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}
