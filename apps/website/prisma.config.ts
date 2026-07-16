import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Ancorado neste arquivo, não no cwd: o Turborepo roda da raiz do monorepo, e
// caminho relativo apontaria para o lugar errado — silenciosamente, porque o
// dotenv não reclama de arquivo ausente.
const here = dirname(fileURLToPath(import.meta.url));

// O Next carrega .env.local sozinho; a CLI do Prisma não. Carregamos os dois
// aqui para que exista uma única fonte de variáveis no projeto.
config({ path: resolve(here, ".env.local") });
config({ path: resolve(here, ".env") });

/**
 * Configuração do Prisma 7 — as URLs de conexão saíram do schema.
 *
 * Supabase entrega duas strings e cada uma tem seu lugar:
 * - DIRECT_URL: conexão direta (porta 5432). É a usada AQUI, porque este config
 *   serve a CLI, e migration precisa de DDL — que o pgbouncer em modo
 *   transaction não suporta.
 * - DATABASE_URL: pooler (porta 6543). É a usada em runtime pelo PrismaClient
 *   (ver src/server/db/prisma.ts), porque serverless abre conexão demais para o
 *   Postgres direto aguentar.
 *
 * O fallback existe só para `validate` e `generate`, que não tocam no banco.
 * Qualquer comando que conecte de verdade falha alto com ele — de propósito.
 */
const PLACEHOLDER = "postgresql://sem-credencial@localhost:5432/alphadog";

export default defineConfig({
  schema: resolve(here, "prisma/schema.prisma"),
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? PLACEHOLDER,
  },
});
