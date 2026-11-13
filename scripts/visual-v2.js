// Post-change screenshots: homepage flow + books hero/covers
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "/tmp/render/v2-home.png", fullPage: true });
  await page.screenshot({ path: "/tmp/render/v2-header.png", clip: { x: 0, y: 0, width: 1600, height: 220 } });

  await page.goto("http://localhost:3000/books", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "/tmp/render/v2-books.png", fullPage: true });

  await page.goto("http://localhost:3000/articles", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/render/v2-articles.png", clip: { x: 0, y: 0, width: 1600, height: 620 } });

  await browser.close();
  console.log("JS errors:", errors.length ? errors.join("\n") : "0");
  console.log("DONE");
})().catch((e) => { console.error(e); process.exit(1); });
