import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * Ícone e splash do app.
 *
 * Mesmo path da marca do site — um escudo que lê como cabeça de cão, com o
 * chevron ascendente vazado. Gerado, não desenhado à mão: se a marca mudar, é
 * rodar de novo.
 *
 *   node scripts/export-app-assets.mjs
 */
const MOBILE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(MOBILE_ROOT, "assets");
mkdirSync(OUT, { recursive: true });

const INK = "#0B0E14";
const ALPHA = "#F0A73C";

const MARK = `M8 14 L10.5 3 L20.5 14 L27.5 14 L37.5 3 L40 14
  C40 30 33 38.5 24 43 C15 38.5 8 30 8 14 Z
  M24 16 L34 27 L28.2 32.4 L24 27.4 L19.8 32.4 L14 27 Z`;

/** Ícone: marca centralizada sobre ink, sem borda arredondada — o SO recorta. */
function iconSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
    <rect width="48" height="48" fill="${INK}"/>
    <g transform="translate(24 24) scale(0.62) translate(-24 -23)">
      <path fill="${ALPHA}" fill-rule="evenodd" d="${MARK}"/>
    </g>
  </svg>`;
}

/**
 * Ícone adaptativo do Android: o sistema corta um círculo do centro, então a
 * marca precisa caber numa área bem menor que a arte inteira.
 */
function adaptiveSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
    <g transform="translate(24 24) scale(0.42) translate(-24 -23)">
      <path fill="${ALPHA}" fill-rule="evenodd" d="${MARK}"/>
    </g>
  </svg>`;
}

/** Splash: só a marca. O fundo vem do app.json e evita piscar. */
function splashSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
    <g transform="translate(24 24) scale(0.9) translate(-24 -23)">
      <path fill="${ALPHA}" fill-rule="evenodd" d="${MARK}"/>
    </g>
  </svg>`;
}

const files = [
  ["icon.png", iconSvg(1024)],
  ["adaptive-icon.png", adaptiveSvg(1024)],
  // Transparente de propósito: o fundo vem do app.json, e assim o splash não
  // pisca um retângulo de cor diferente antes do app montar.
  ["splash-icon.png", splashSvg(512)],
  ["favicon.png", iconSvg(48)],
];

for (const [name, svg] of files) {
  await sharp(Buffer.from(svg)).png().toFile(resolve(OUT, name));
  console.log("  " + name);
}

console.log(`\nassets em ${OUT}`);
