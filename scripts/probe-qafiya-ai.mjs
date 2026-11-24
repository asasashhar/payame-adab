// Browser probe: /qafiya AI Qafiya Finder section — render, search, results, errors
import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:3000";
fs.mkdirSync("/tmp/render", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 300)); });

await page.goto(BASE + "/qafiya", { waitUntil: "networkidle", timeout: 60000 });

const heading = await page.getByText("اے آئی قافیہ فائنڈر").count();
console.log("AI section heading present:", heading > 0);

// search via the AI input directly (uncached word وفا → real AI round-trip)
const input = page.locator('input[aria-label="اے آئی قافیہ تلاش کے لیے لفظ"]');
await input.fill("وفا");
await page.locator('button:has-text("قافیہ دریافت کریں")').click();
// wait for result cards (badge مکمل قافیہ or قریبی قافیہ) up to 60s
try {
  await page.getByText("مکمل قافیہ").first().waitFor({ timeout: 60000 });
  const exact = await page.getByText("مکمل قافیہ").count();
  const approx = await page.getByText("قریبی قافیہ").count();
  const meanings = await page.locator("text=/معنی:/").count();
  const talfuz = await page.locator("text=/talfuz:/").count();
  console.log(`results: exact=${exact} approximate=${approx} meanings=${meanings} talfuz=${talfuz}`);
  await page.screenshot({ path: "/tmp/render/qafiya-ai.png", fullPage: false });
  console.log("screenshot saved");
} catch (e) {
  console.log("NO RESULTS within 60s:", String(e).slice(0, 200));
  await page.screenshot({ path: "/tmp/render/qafiya-ai-fail.png" });
}

console.log("JS errors:", errors.length ? errors.slice(0, 4) : "none");
await browser.close();
