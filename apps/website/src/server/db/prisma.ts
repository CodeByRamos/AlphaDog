import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

/** Só usamos o banco quando há credencial de verdade configurada. */
export const hasDatabase = Boolean(process.env.DATABASE_URL);

/**
 * Client do Prisma, criado sob demanda.
 *
 * Preguiçoso de propósito: sem DATABASE_URL o projeto roda com os stores em
 * memória, e construir o adapter no import derrubaria a aplicação inteira só
 * por importar o módulo.
 *
 * O global existe porque o dev server recria módulos a cada edição — sem ele,
 * cada reload abriria um pool novo e as conexões do Supabase esgotariam em
 * minutos.
 *
 * O Prisma 7 conecta por driver adapter; `datasourceUrl` não existe mais. Em
 * runtime apontamos para o pooler (DATABASE_URL); migrations vão diretas ao
 * Postgres via DIRECT_URL, configurado em prisma.config.ts.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Cache do módulo: em produção é isto que evita um client por invocação. */
let client: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  const cached = globalForPrisma.prisma ?? client;
  if (cached) return cached;

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL não configurada — o acesso ao banco não deveria ter sido chamado.",
    );
  }

  client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  // O global só serve ao HMR: sem ele, cada edição vazaria um pool novo.
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;

  return client;
}
