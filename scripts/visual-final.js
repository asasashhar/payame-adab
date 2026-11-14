// Final verification: all 4 reference pages + mobile overflow check
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  // desktop
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  const scrollThrough = async () => {
    await page.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y < h; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(700);
  };

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });
  await scrollThrough();
  await page.screenshot({ path: "/tmp/render/final-home.png", fullPage: true });

  await page.goto("http://localhost:3000/books", { waitUntil: "networkidle", timeout: 60000 });
  await scrollThrough();
  await page.screenshot({ path: "/tmp/render/final-books.png", fullPage: true });

  await page.goto("http://localhost:3000/articles", { waitUntil: "networkidle", timeout: 60000 });
  await scrollThrough();
  await page.screenshot({ path: "/tmp/render/final-articles.png", fullPage: true });

  // login as admin → change password → admin dashboard → user dashboard
  await page.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle", timeout: 60000 });
  await page.fill('input[type="email"], input[name="email"]', "mdnematullah1343@gmail.com");
  await page.fill('input[type="password"]', "darulhuda");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  const forceVisible = await page.locator("text=پاس ورڈ تبدیل کریں").first().isVisible().catch(() => false);
  if (forceVisible) {
    const pwFields = page.locator("input[type='password']");
    const n = await pwFields.count();
    await pwFields.nth(0).fill("darulhuda");
    for (let i = 1; i < n; i++) await pwFields.nth(i).fill("Padmin#2026");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
  }
  await page.waitForURL("**/admin**", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/render/final-admin.png", fullPage: true });

  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/render/final-dashboard.png", fullPage: true });

  // mobile
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mob.on("pageerror", (e) => errors.push("mob pageerror: " + String(e)));
  await mob.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });
  await mob.waitForTimeout(1200);
  const overflowHome = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await mob.screenshot({ path: "/tmp/render/final-mob-home.png" });
  await mob.goto("http://localhost:3000/books", { waitUntil: "networkidle", timeout: 60000 });
  const overflowBooks = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await mob.screenshot({ path: "/tmp/render/final-mob-books.png" });

  await browser.close();
  console.log("JS errors:", errors.length ? errors.join("\n") : "0");
  console.log("mobile overflow home:", overflowHome, "px | books:", overflowBooks, "px");
  console.log("DONE");
})().catch((e) => { console.error(e); process.exit(1); });
