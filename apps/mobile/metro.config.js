// Metro num monorepo pnpm.
//
// Sem isto o `expo start` sobe, mas o bundle quebra ao resolver
// `@alphadog/core`: o pacote vive fora de apps/mobile e é servido como
// TypeScript direto (main: ./src/index.ts). O Metro precisa (1) vigiar a raiz do
// repo para enxergar o pacote e (2) procurar node_modules tanto do app quanto da
// raiz, porque o pnpm não iça as dependências.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
