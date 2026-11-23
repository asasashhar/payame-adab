// Visual check — Payam-e-Adab redesign vs reference mockups
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  // ---------- public site ----------
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/render/home-top.png" });
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/tmp/render/home-mid.png" });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/tmp/render/home-bottom.png" });

  await page.goto("http://localhost:3000/books", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/render/books.png" });

  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/render/login.png" });

  // ---------- user dashboard (logged-in) ----------
  const userLogin = await page.request.post("http://localhost:3000/api/auth/login", {
    data: { email: "shayar@demo.pk", password: "demo@1234" },
  });
  console.log("user login:", userLogin.status());
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "/tmp/render/dashboard-user.png" });

  // ---------- admin panel ----------
  const adminLogin = await page.request.post("http://localhost:3000/api/auth/admin-login", {
    data: { email: "mdnematullah1343@gmail.com", password: "darulhuda" },
  });
  console.log("admin login:", adminLogin.status());
  await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/render/admin-home.png" });

  await page.goto("http://localhost:3000/admin/appearance", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/render/admin-appearance.png" });

  await page.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/render/admin-login.png" });

  console.log("JS errors:", errors.length);
  errors.slice(0, 8).forEach((e) => console.log("  -", e.slice(0, 160)));
  await browser.close();
})();
