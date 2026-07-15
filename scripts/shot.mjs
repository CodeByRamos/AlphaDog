import { chromium } from "playwright";

/**
 * Screenshot de páginas do dev server.
 *
 *   npm run shot                    -> a home, desktop e mobile
 *   npm run shot -- /metodo /termos -> as rotas passadas
 */
const OUT =
  "C:/Users/Ramos/AppData/Local/Temp/claude/C--Users-Ramos-Documents-AlphaDog/f1c9f93a-6bba-468b-875e-170c8e2f81a5/scratchpad";

const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/"];

const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch();

for (const path of paths) {
  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
    });
    await page.goto(`http://localhost:3000${path}`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.waitForTimeout(500);

    const slug = path === "/" ? "home" : path.replace(/\//g, "-").replace(/^-/, "");
    const file = `${OUT}/${slug}-${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
    await page.close();
  }
}

await browser.close();
