import { chromium } from "playwright";

/**
 * Varre o site e falha se algum link interno apontar para 404.
 *
 * Link quebrado no header ou no rodapé é o tipo de coisa que passa em build,
 * passa em lint e só aparece pro usuário.
 */
const BASE = "http://localhost:3000";
const START = [
  "/",
  "/metodo",
  "/avaliacoes",
  "/contato",
  "/termos",
  "/privacidade",
  "/politica-de-assinatura",
  "/garantia",
  "/marca",
];

const browser = await chromium.launch();
const page = await browser.newPage();

const internal = new Set(START);

// Coleta todo href interno das páginas conhecidas.
for (const path of START) {
  const res = await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  if (res.status() !== 200) {
    console.log(`PAGINA QUEBRADA ${path} -> ${res.status()}`);
    continue;
  }
  const hrefs = await page.$$eval("a[href^='/']", (as) =>
    as.map((a) => a.getAttribute("href")),
  );
  hrefs.forEach((h) => internal.add(h.split("#")[0].split("?")[0]));
}

const results = [];
for (const path of [...internal].sort()) {
  if (!path) continue;
  // Timeout generoso: no dev server a primeira visita a cada rota compila.
  const res = await page.request.get(BASE + path, {
    maxRedirects: 0,
    timeout: 120000,
  });
  results.push({ path, status: res.status() });
}

const broken = results.filter((r) => r.status >= 400);

console.log("--- ROTAS ---");
results.forEach((r) => console.log(`${String(r.status).padEnd(4)} ${r.path}`));
console.log(
  broken.length ? `\nQUEBRADAS: ${broken.length}` : "\nNenhum link quebrado.",
);

await browser.close();
process.exit(broken.length ? 1 : 0);
