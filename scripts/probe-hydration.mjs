// Probe: load the homepage N times, capture hydration/page errors with full text
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const RUNS = Number(process.argv[2] || 6);
const browser = await chromium.launch();
let hits = 0;

for (let i = 0; i < RUNS; i++) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 1200)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text().slice(0, 1200));
  });
  try {
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(800);
  } catch (e) {
    errors.push("nav: " + String(e).slice(0, 300));
  }
  if (errors.length) {
    hits++;
    console.log(`--- run ${i + 1}: ${errors.length} error(s)`);
    errors.forEach((e) => console.log(e + "\n"));
  } else {
    console.log(`--- run ${i + 1}: clean`);
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${hits}/${RUNS} runs with errors`);
