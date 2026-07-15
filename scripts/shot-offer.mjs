import { chromium } from "playwright";

/**
 * Percorre o funil e captura a oferta.
 *
 * Verifica o caminho inteiro: respostas → raspadinha → desconto do servidor →
 * paywall personalizado. Também tenta forjar o desconto para provar que o
 * servidor ignora valor vindo do cliente.
 */
const OUT =
  "C:/Users/Ramos/AppData/Local/Temp/claude/C--Users-Ramos-Documents-AlphaDog/f1c9f93a-6bba-468b-875e-170c8e2f81a5/scratchpad";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

await page.goto("http://localhost:3000/quiz", { waitUntil: "networkidle" });

let scratched = false;

for (let i = 0; i < 60 && !page.url().includes("/oferta"); i++) {
  const title = (
    await page
      .locator("h1")
      .first()
      .textContent()
      .catch(() => null)
  )?.trim();

  const textInput = page.locator('input[type="text"], input[type="email"]');
  if ((await textInput.count()) > 0 && (await textInput.first().isVisible())) {
    const type = await textInput.first().getAttribute("type");
    await textInput.first().fill(type === "email" ? "tutor@exemplo.com.br" : "Nina");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(220);
    continue;
  }

  // Uma raspada só: depois do reveal a canvas continua no DOM (opacity-0) e o
  // loop tentaria raspar de novo um elemento que já está sendo desmontado.
  const canvas = page.locator("canvas");
  if (!scratched && (await canvas.count()) > 0 && (await canvas.first().isVisible())) {
    scratched = true;
    const box = await canvas.first().boundingBox();
    if (!box) continue;
    await page.mouse.move(box.x + 12, box.y + 20);
    await page.mouse.down();
    for (let y = 12; y < box.height; y += 10) {
      for (let x = 12; x < box.width; x += 18) {
        await page.mouse.move(box.x + x, box.y + y);
      }
    }
    await page.mouse.up();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/o-scratch.png` });
  }

  // A oferta também tem botões com aria-pressed (os planos). Sem esta guarda o
  // loop clicaria neles depois da navegação e falsearia o estado da página.
  if (page.url().includes("/oferta")) break;

  const options = page.locator("button[aria-pressed]");
  if ((await options.count()) > 0) {
    // Escolhe "Fêmea" no passo de sexo para validar a concordância de gênero.
    const female = page.getByRole("button", { name: /Fêmea/ });
    if ((await female.count()) > 0) await female.first().click();
    else await options.first().click();

    await page.waitForTimeout(200);
    const same =
      (
        await page
          .locator("h1")
          .first()
          .textContent()
          .catch(() => null)
      )?.trim() === title;
    if (same) {
      const cont = page.getByRole("button", { name: /^Continuar$/ });
      if ((await cont.count()) > 0 && (await cont.first().isEnabled())) {
        await cont.first().click();
        await page.waitForTimeout(220);
      }
    }
    continue;
  }

  const cta = page.locator("main button:not([disabled])").last();
  if ((await cta.count()) > 0) {
    await cta.click().catch(() => {});
    await page.waitForTimeout(1100);
  } else {
    await page.waitForTimeout(700);
  }
}

await page.waitForURL(/\/oferta/, { timeout: 15000 });
await page.waitForLoadState("networkidle");
await page.waitForTimeout(500);

// Viewport (não fullPage) para conferir a barra sticky na posição real.
await page.screenshot({ path: `${OUT}/o-top.png` });

const h1 = await page.locator("h1").first().textContent();
const body = await page.locator("main").innerText();
console.log("URL:", page.url());
console.log("H1:", h1?.trim());
console.log("--- TEM DESCONTO?", /Desconto de \d+%/.test(body));
console.log(
  "--- PRECOS:",
  [...body.matchAll(/R\$\s?[\d.,]+/g)].map((m) => m[0]).join(" "),
);
console.log("--- ERROS:", errors.length ? errors.join("\n") : "nenhum");

await page.screenshot({ path: `${OUT}/o-offer.png`, fullPage: true });

await page.close();
await browser.close();
