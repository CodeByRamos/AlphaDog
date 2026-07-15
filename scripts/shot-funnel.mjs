import { chromium } from "playwright";

/** Captura passos-chave do funil para conferência visual. */
const OUT =
  "C:/Users/Ramos/AppData/Local/Temp/claude/C--Users-Ramos-Documents-AlphaDog/f1c9f93a-6bba-468b-875e-170c8e2f81a5/scratchpad";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:3000/quiz", { waitUntil: "networkidle" });

const tiles = [];

async function grab(name) {
  const path = `${OUT}/f-${name}.png`;
  await page.screenshot({ path });
  tiles.push(path);
}

async function pickFirst() {
  await page.locator("button[aria-pressed]").first().click();
  await page.waitForTimeout(240);
}

await grab("01-age"); // lista
await pickFirst(); // idade
await pickFirst(); // sexo

await page.waitForTimeout(200);
await grab("02-breed"); // dropdown com busca
await page.locator("button[aria-pressed]").first().click();
await page.waitForTimeout(300);

await grab("03-static"); // interstício de prova social
await page.locator("main button:not([disabled])").last().click();
await page.waitForTimeout(300);

await pickFirst(); // motivação
await pickFirst(); // objetivo
await page.waitForTimeout(200);
await grab("04-statement"); // escala de concordância

console.log(tiles.join("\n"));
await page.close();
await browser.close();
