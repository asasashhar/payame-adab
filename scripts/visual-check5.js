// Visual check v5: mockup restyle — home hero, books, admin dashboard, rotation live test
const { chromium } = require("playwright");
const fs = require("fs");
fs.mkdirSync("/tmp/render", { recursive: true });

const BASE = "http://localhost:3000";

(async () => {
  // admin session (for settings PUT + /admin pages)
  const loginRes = await fetch(`${BASE}/api/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "mdnematullah1343@gmail.com", password: "darulhuda" }),
  });
  const cookie = (loginRes.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  console.log("admin login:", loginRes.status);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  // 1) homepage (Design A — emerald default)
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/render/home-a.png", fullPage: false });
  await page.screenshot({ path: "/tmp/render/home-a-full.png", fullPage: true });

  // 2) books library
  await page.goto(`${BASE}/books`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/render/books.png", fullPage: false });

  // 3) admin dashboard (browser login)
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"], input[name="email"]', "mdnematullah1343@gmail.com");
  await page.fill('input[type="password"]', "darulhuda");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15000 }).catch(() => {});
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/render/admin-dash.png", fullPage: true });

  // 4) appearance page — rotation card
  await page.goto(`${BASE}/admin/appearance`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/render/admin-appearance.png", fullPage: false });

  // 5) live rotation test: override Design D (dark midnight) → homepage must go dark
  const put = await fetch(`${BASE}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ designOverride: "D" }),
  });
  console.log("override D status:", put.status);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const designAttr = await page.evaluate(() => document.body.getAttribute("data-design"));
  console.log("Design D body bg:", bg, "| data-design:", designAttr);
  await page.screenshot({ path: "/tmp/render/home-d.png", fullPage: false });

  // restore automatic rotation
  const restore = await fetch(`${BASE}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ designOverride: "" }),
  });
  console.log("restore status:", restore.status);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  console.log("restored data-design:", await page.evaluate(() => document.body.getAttribute("data-design")));

  console.log("JS errors:", errors.length === 0 ? "none" : errors);
  await browser.close();
})();
