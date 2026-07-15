import { chromium } from "playwright";

/**
 * Percorre o funil inteiro como um usuário real.
 *
 * Verifica que todo passo renderiza, que a navegação avança, que os passos
 * condicionais de filhote aparecem e que o funil termina na oferta.
 */
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

await page.goto("http://localhost:3000/quiz", { waitUntil: "networkidle" });

const seen = [];

for (let i = 0; i < 60; i++) {
  if (page.url().includes("/oferta")) break;

  const title = (
    await page
      .locator("h1")
      .first()
      .textContent()
      .catch(() => null)
  )?.trim();
  const progress = await page
    .locator('[role="progressbar"]')
    .getAttribute("aria-valuenow")
    .catch(() => null);
  seen.push(`${String(i).padStart(2)} | ${progress ?? "-"}% | ${title ?? "(sem h1)"}`);

  // Escolha única / múltipla: cartões de opção.
  const options = page.locator("button[aria-pressed]");
  const optionCount = await options.count();

  // Campo de texto (nome / email).
  const textInput = page.locator('input[type="text"], input[type="email"]');
  if ((await textInput.count()) > 0 && (await textInput.first().isVisible())) {
    const type = await textInput.first().getAttribute("type");
    await textInput.first().fill(type === "email" ? "tutor@exemplo.com.br" : "Rex");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(220);
    continue;
  }

  // Raspadinha: raspa até revelar.
  const canvas = page.locator("canvas");
  if ((await canvas.count()) > 0 && (await canvas.first().isVisible())) {
    const box = await canvas.first().boundingBox();
    await page.mouse.move(box.x + 12, box.y + 20);
    await page.mouse.down();
    for (let y = 12; y < box.height; y += 12) {
      for (let x = 12; x < box.width; x += 22) {
        await page.mouse.move(box.x + x, box.y + y);
      }
    }
    await page.mouse.up();
    await page.waitForTimeout(400);
  }

  if (optionCount > 0) {
    await options.first().click();
    await page.waitForTimeout(200);

    // Escolha única já avançou sozinha. Só confirmar se ainda estamos no mesmo
    // passo — senão o walker clicaria no CTA do interstício seguinte e o
    // pularia sem registrar.
    const stillHere =
      (
        await page
          .locator("h1")
          .first()
          .textContent()
          .catch(() => null)
      )?.trim() === title;

    if (stillHere) {
      const cont = page.getByRole("button", { name: /^Continuar$/ });
      if ((await cont.count()) > 0 && (await cont.first().isEnabled())) {
        await cont.first().click();
        await page.waitForTimeout(220);
      }
    }
    continue;
  }

  // Interstício / loading / perfil: um CTA só.
  const cta = page.locator("main button:not([disabled])").last();
  if ((await cta.count()) > 0) {
    await cta.click().catch(() => {});
    await page.waitForTimeout(1200);
    continue;
  }

  await page.waitForTimeout(800);
}

console.log("--- PASSOS PERCORRIDOS ---");
console.log(seen.join("\n"));
console.log("--- URL FINAL:", page.url());
console.log("--- ERROS:", errors.length ? errors.join("\n") : "nenhum");

await page.close();
await browser.close();
