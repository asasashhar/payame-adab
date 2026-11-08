// Visual check — mockup redesign verification
const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  fs.mkdirSync("/tmp/render", { recursive: true });
  const browser = await chromium.launch();
  const errors = [];

  // ---------- desktop ----------
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });
  await page.screenshot({ path: "/tmp/render/home-top.png" });
  await page.evaluate(() => window.scrollTo(0, 1600));
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/tmp/render/home-mid.png" });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/tmp/render/home-bottom.png" });

  await page.goto("http://localhost:3000/books", { waitUntil: "networkidle", timeout: 60000 });
  await page.screenshot({ path: "/tmp/render/books.png" });

  await page.goto("http://localhost:3000/articles", { waitUntil: "networkidle", timeout: 60000 });
  await page.screenshot({ path: "/tmp/render/articles.png" });

  // ---------- admin dashboard with login ----------
  await page.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle", timeout: 60000 });
  await page.fill('input[type="email"], input[name="email"]', "mdnematullah1343@gmail.com");
  await page.fill('input[type="password"]', "darulhuda");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/render/admin.png" });

  // ---------- mobile ----------
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mob.on("pageerror", (e) => errors.push("mob pageerror: " + String(e)));
  await mob.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });
  await mob.screenshot({ path: "/tmp/render/mob-home.png" });
  await mob.goto("http://localhost:3000/books", { waitUntil: "networkidle", timeout: 60000 });
  await mob.screenshot({ path: "/tmp/render/mob-books.png" });

  await browser.close();
  console.log("JS errors:", errors.length ? errors.join("\n") : "0");
  console.log("DONE");
})().catch((e) => { console.error(e); process.exit(1); });
