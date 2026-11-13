// Full-page screenshots of the 4 reference pages + logo detail crops
const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  fs.mkdirSync("/tmp/render", { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  const shots = [
    ["http://localhost:3000/", "full-home"],
    ["http://localhost:3000/books", "full-books"],
  ];
  for (const [url, name] of shots) {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1200);
    // force lazy images by scrolling through
    await page.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y < h; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `/tmp/render/${name}.png`, fullPage: true });
  }

  // admin dashboard (login first)
  await page.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle", timeout: 60000 });
  await page.fill('input[type="email"], input[name="email"]', "mdnematullah1343@gmail.com");
  await page.fill('input[type="password"]', "darulhuda");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin**", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/tmp/render/full-admin.png", fullPage: true });

  // user profile
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/render/full-dashboard.png", fullPage: true });

  // header close-up (logo zone)
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/render/header-detail.png", clip: { x: 0, y: 0, width: 1600, height: 260 } });

  await browser.close();
  console.log("JS errors:", errors.length ? errors.join("\n") : "0");
  console.log("DONE");
})().catch((e) => { console.error(e); process.exit(1); });
