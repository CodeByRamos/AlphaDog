import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import sharp from "sharp";

/**
 * Exporta os PNGs da marca para public/brand.
 *
 * A marca isolada sai via sharp (geometria pura, sem texto). O lockup sai via
 * Playwright, porque precisa da Sora de verdade — rasterizar texto no sharp
 * dependeria da fonte estar instalada no sistema, e cairia num fallback
 * silencioso que ninguém nota até o arquivo chegar no cliente.
 */

const OUT = "public/brand";
mkdirSync(OUT, { recursive: true });

const INK = "#0B0E14";
const ALPHA = "#F0A73C";
const BONE = "#F7F5F1";

const MARK = `M8 14 L10.5 3 L20.5 14 L27.5 14 L37.5 3 L40 14
  C40 30 33 38.5 24 43 C15 38.5 8 30 8 14 Z
  M24 16 L34 27 L28.2 32.4 L24 27.4 L19.8 32.4 L14 27 Z`;

/** Marca solta, fundo transparente. */
function markSvg(color, size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
    <g transform="translate(24 24) scale(0.92) translate(-24 -23)">
      <path fill="${color}" fill-rule="evenodd" d="${MARK}"/>
    </g>
  </svg>`;
}

/** Ícone em tile arredondado — favicon, PWA, app icon. */
function tileSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
    <rect width="48" height="48" rx="11" fill="${INK}"/>
    <g transform="translate(24 24) scale(0.8) translate(-24 -23)">
      <path fill="${ALPHA}" fill-rule="evenodd" d="${MARK}"/>
    </g>
  </svg>`;
}

const files = [];

async function png(svg, name) {
  const path = `${OUT}/${name}`;
  await sharp(Buffer.from(svg)).png().toFile(path);
  files.push(name);
}

// Marca isolada
await png(markSvg(INK, 1024), "marca-ink-1024.png");
await png(markSvg(ALPHA, 1024), "marca-ambar-1024.png");
await png(markSvg(BONE, 1024), "marca-bone-1024.png");
await png(markSvg(INK, 256), "marca-ink-256.png");
await png(markSvg(ALPHA, 256), "marca-ambar-256.png");

// Tiles / ícones
for (const size of [512, 192, 180, 48, 32, 16]) {
  await png(tileSvg(size), `icone-${size}.png`);
}

// ---- Lockups com a Sora real, via navegador ----

const browser = await chromium.launch();

async function shotHtml({ name, width, height, background, color, accent, scale = 3 }) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: scale,
  });

  await page.setContent(`<!doctype html>
    <html><head>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@800&display=swap" rel="stylesheet">
      <style>
        html,body { margin:0; height:100%; }
        body {
          background: ${background};
          display:flex; align-items:center; justify-content:center;
          font-family:'Sora',sans-serif;
        }
        .lockup { display:flex; align-items:center; gap:${Math.round(height * 0.16)}px; }
        svg { height:${Math.round(height * 0.56)}px; width:auto; }
        .word {
          font-weight:800;
          font-size:${Math.round(height * 0.42)}px;
          letter-spacing:-0.03em;
          color:${color};
          line-height:1;
        }
        .word b { color:${accent}; font-weight:800; }
      </style>
    </head><body>
      <div class="lockup">
        <svg viewBox="0 0 48 48">
          <g transform="translate(24 24) scale(0.92) translate(-24 -23)">
            <path fill="${accent}" fill-rule="evenodd" d="${MARK}"/>
          </g>
        </svg>
        <span class="word">Alpha<b>Dog</b></span>
      </div>
    </body></html>`);

  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  // Confirma que a Sora carregou — sem isto o fallback passaria despercebido.
  const loaded = await page.evaluate(() => document.fonts.check("800 42px Sora"));
  if (!loaded) throw new Error(`Sora não carregou para ${name}`);

  await page.screenshot({
    path: `${OUT}/${name}`,
    omitBackground: background === "transparent",
  });
  files.push(name);
  await page.close();
}

await shotHtml({
  name: "lockup-claro.png",
  width: 900,
  height: 220,
  background: "transparent",
  color: INK,
  accent: ALPHA,
});

await shotHtml({
  name: "lockup-escuro.png",
  width: 900,
  height: 220,
  background: "transparent",
  color: BONE,
  accent: ALPHA,
});

await shotHtml({
  name: "lockup-sobre-ink.png",
  width: 900,
  height: 300,
  background: INK,
  color: BONE,
  accent: ALPHA,
});

/**
 * Cartão social 1200x630.
 *
 * Template próprio: as proporções do lockup são relativas à altura e, numa tela
 * 630px de alto, estourariam a largura — o texto sairia cortado. Um card também
 * pede tagline, não só a marca ampliada.
 */
async function shotOgImage() {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });

  await page.setContent(`<!doctype html>
    <html><head>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@800&family=Inter:wght@400&display=swap" rel="stylesheet">
      <style>
        html,body { margin:0; height:100%; }
        body {
          background:${INK}; color:${BONE};
          font-family:'Inter',sans-serif;
          display:flex; flex-direction:column; justify-content:center;
          padding:0 84px; position:relative; overflow:hidden;
        }
        .halo {
          position:absolute; width:760px; height:760px; border-radius:50%;
          background:${ALPHA}; opacity:.14; filter:blur(90px);
          top:-320px; right:-220px;
        }
        .lockup { display:flex; align-items:center; gap:20px; margin-bottom:38px; }
        .lockup svg { height:64px; }
        .lockup span { font-family:'Sora'; font-weight:800; font-size:48px; letter-spacing:-.03em; }
        .lockup b { color:${ALPHA}; }
        h1 {
          font-family:'Sora'; font-weight:800; font-size:50px; line-height:1.14;
          letter-spacing:-.03em; margin:0; max-width:1000px; position:relative;
          white-space:nowrap;
        }
        p { font-size:26px; color:#9AA1B4; margin:24px 0 0; position:relative; }
      </style>
    </head><body>
      <div class="halo"></div>
      <div class="lockup">
        <svg viewBox="0 0 48 48">
          <g transform="translate(24 24) scale(0.92) translate(-24 -23)">
            <path fill="${ALPHA}" fill-rule="evenodd" d="${MARK}"/>
          </g>
        </svg>
        <span>Alpha<b>Dog</b></span>
      </div>
      <h1>Seu cão não precisa de mais gritos.<br/>Precisa de um plano.</h1>
      <p>Adestramento personalizado · 10 minutos por dia · método positivo</p>
    </body></html>`);

  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  if (!(await page.evaluate(() => document.fonts.check("800 48px Sora")))) {
    throw new Error("Sora não carregou para og-image");
  }

  // Nada de conteúdo pode transbordar: um card cortado é pior que card nenhum.
  // Medimos os elementos de conteúdo, não o body — o halo estoura a borda de
  // propósito e é recortado por overflow:hidden.
  const overflowing = await page.evaluate(() =>
    [".lockup", "h1", "p"].filter((sel) => {
      const el = document.querySelector(sel);
      if (!el) return true;
      const r = el.getBoundingClientRect();
      return r.right > window.innerWidth || r.bottom > window.innerHeight || r.left < 0;
    }),
  );
  if (overflowing.length) {
    throw new Error(`og-image: conteúdo transbordou em ${overflowing.join(", ")}`);
  }

  await page.screenshot({ path: `${OUT}/og-image.png` });
  files.push("og-image.png");
  await page.close();
}

await shotOgImage();

await browser.close();

console.log("Exportado para public/brand:");
console.log(files.map((f) => "  " + f).join("\n"));
