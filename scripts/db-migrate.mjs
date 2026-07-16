/**
 * Aplica as migrations SQL do Supabase, em ordem.
 *
 * Usa DIRECT_URL (porta 5432): o pooler em modo transaction não aceita DDL.
 *
 * Cada migration roda numa transação e é registrada em _migrations. Rodar duas
 * vezes é seguro — o que já passou é pulado.
 *
 *   node scripts/db-migrate.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, "apps/website/.env.local") });

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("erro: DIRECT_URL ausente em apps/website/.env.local");
  process.exit(1);
}

const dir = join(root, "supabase/migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({ connectionString: url });
await client.connect();

await client.query(`
  create table if not exists public._migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )
`);

const { rows } = await client.query("select name from public._migrations");
const applied = new Set(rows.map((r) => r.name));

let ran = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`  pulado  ${file}`);
    continue;
  }

  const sql = readFileSync(join(dir, file), "utf8");
  try {
    // Transação: migration pela metade é pior que migration não aplicada.
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into public._migrations (name) values ($1)", [file]);
    await client.query("commit");
    console.log(`  ok      ${file}`);
    ran++;
  } catch (err) {
    await client.query("rollback");
    console.error(`\nfalhou: ${file}\n${err.message}`);
    await client.end();
    process.exit(1);
  }
}

console.log(ran ? `\n${ran} migration(s) aplicada(s).` : "\nNada a aplicar.");
await client.end();
