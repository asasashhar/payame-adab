// Admin dashboard + user profile screenshots (completes the forced password change first)
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  // login as admin
  await page.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle", timeout: 60000 });
  await page.fill('input[type="email"], input[name="email"]', "mdnematullah1343@gmail.com");
  await page.fill('input[type="password"]', "darulhuda");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  // complete forced password change if shown
  const forceVisible = await page.locator("text=پاس ورڈ تبدیل کریں").first().isVisible().catch(() => false);
  if (forceVisible) {
    const pwFields = page.locator("input[type='password']");
    const n = await pwFields.count();
    // field 0 = current password (darulhuda), fields 1+ = new password
    await pwFields.nth(0).fill("darulhuda");
    for (let i = 1; i < n; i++) await pwFields.nth(i).fill("Padmin#2026");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
    console.log("password change submitted (fields:", n + ")");
  }
  await page.waitForURL("**/admin**", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/render/v2-admin.png", fullPage: true });

  // user profile page (mockup 4: میری پروفائل)
  const me = await page.evaluate(() => fetch("/api/auth/me").then(r => r.json()));
  if (me && me.id) {
    await page.goto(`http://localhost:3000/profile/${me.id}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: "/tmp/render/v2-profile.png", fullPage: true });
  }

  // user dashboard
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/render/v2-dashboard.png", fullPage: true });

  await browser.close();
  console.log("JS errors:", errors.length ? errors.join("\n") : "0");
  console.log("DONE");
})().catch((e) => { console.error(e); process.exit(1); });
