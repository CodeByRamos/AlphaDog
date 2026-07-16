import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

/**
 * Captura o site como referência antes de uma refatoração estrutural.
 *
 * Rode antes e depois de mover arquivos, e compare os PNGs. Build verde não
 * prova que o CSS continua aplicado — o Tailwind v4 descobre as fontes pela
 * raiz do Git, então mover a pasta pode apagar os estilos sem erro nenhum.
 *
 *   node scripts/baseline.mjs before
 *   node scripts/baseline.mjs after
 */
const label = process.argv[2] ?? "before";
const OUT = `.baseline/${label}`;
mkdirSync(OUT, { recursive: true });

const ROUTES = ["/", "/metodo", "/avaliacoes", "/materiais", "/termos"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

for (const route of ROUTES) {
  // Timeout generoso: no dev server a primeira visita a cada rota compila, e
  // rota nova pode passar de 90s em máquina com disco lento.
  const res = await page.goto(`http://localhost:3000${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(400);

  const slug = route === "/" ? "home" : route.slice(1).replace(/\//g, "-");
  await page.screenshot({ path: `${OUT}/${slug}.png`, fullPage: true });

  // Um marcador de que o Tailwind realmente compilou: se as classes sumirem, a
  // página ainda renderiza texto e o build passa, mas isto vira "rgba(0,0,0,0)".
  const bodyBg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  const h1 = await page.evaluate(() => {
    const el = document.querySelector("h1");
    return el ? getComputedStyle(el).fontSize : null;
  });

  console.log(`${String(res.status()).padEnd(4)} ${route.padEnd(14)} bg=${bodyBg} h1=${h1}`);
}

await browser.close();
console.log(`\n-> ${OUT}`);
