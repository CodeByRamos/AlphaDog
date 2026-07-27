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

// Acrescenta a raiz do monorepo em vez de substituir: o Expo já popula
// watchFolders com o que precisa (assets, .expo), e sobrescrever aquela lista
// derruba silenciosamente coisas que só falham em runtime.
config.watchFolders = [...new Set([...(config.watchFolders ?? []), monorepoRoot])];

config.resolver.nodeModulesPaths = [
  ...new Set([
    ...(config.resolver.nodeModulesPaths ?? []),
    path.resolve(projectRoot, "node_modules"),
    path.resolve(monorepoRoot, "node_modules"),
  ]),
];

// O modelo de visão é um arquivo .tflite, extensão que o Metro não reconhece
// como asset por padrão. Sem esta linha o require() em useDetector.ts não
// encontra nada, o modelo fica de fora do binário e a IA nunca carrega — no
// aplicativo isso apareceria só como "este build não inclui o motor de visão",
// sem nenhum erro de compilação para denunciar a causa.
config.resolver.assetExts = [
  ...new Set([...(config.resolver.assetExts ?? []), "tflite", "bin"]),
];

module.exports = config;
