// Full-page diagnostic screenshots of key pages
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  const shots = [["/", "full-home"], ["/books", "full-books"]];
  for (const [path, name] of shots) {
    await page.goto("http://localhost:3000" + path, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `/tmp/render/${name}.png`, fullPage: true });
    console.log(name, "done");
  }

  console.log("JS errors:", errors.length);
  errors.slice(0, 10).forEach((e) => console.log("  -", e.slice(0, 200)));
  await browser.close();
})();
