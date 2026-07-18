// https://docs.expo.dev/guides/using-eslint/
//
// ESLint 9 exige flat config (eslint.config.js). Sem este arquivo o script
// `eslint .` falha com "couldn't find an eslint.config file" — o mobile ficava
// sem lint. eslint-config-expo/flat traz as regras de React Native/Expo.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "expo-env.d.ts"],
  },
  {
    // scripts/*.mjs são ferramentas Node (geração de assets), não código do app.
    // Sem os globals do Node o lint aponta 'Buffer'/'process' como indefinidos.
    files: ["scripts/**/*.{js,mjs}"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        __dirname: "readonly",
      },
    },
  },
]);
