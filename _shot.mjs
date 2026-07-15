import { chromium } from "playwright";

const OUT =
  "C:/Users/Ramos/AppData/Local/Temp/claude/C--Users-Ramos-Documents-AlphaDog/f1c9f93a-6bba-468b-875e-170c8e2f81a5/scratchpad";

const targets = [
  { name: "desktop", width: 1280, height: 900, url: "http://localhost:3000" },
  { name: "mobile", width: 390, height: 844, url: "http://localhost:3000" },
];

const browser = await chromium.launch();
for (const t of targets) {
  const page = await browser.newPage({
    viewport: { width: t.width, height: t.height },
    deviceScaleFactor: 1,
  });
  await page.goto(t.url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/landing-${t.name}.png`, fullPage: true });
  console.log("shot", t.name);
  await page.close();
}
await browser.close();
