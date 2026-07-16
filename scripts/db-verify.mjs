/**
 * Confere que o banco está como o schema promete.
 *
 * Migration "ok" só diz que o SQL rodou. Este script diz que as tabelas existem,
 * que o RLS está LIGADO e que há política — uma tabela com RLS ligado e zero
 * políticas nega tudo em silêncio, e uma sem RLS entrega tudo.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, "apps/website/.env.local") });

const client = new pg.Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

const { rows: tables } = await client.query(`
  select c.relname as table, c.relrowsecurity as rls,
         (select count(*) from pg_policies p
          where p.schemaname = 'public' and p.tablename = c.relname) as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relname in ('dogs', 'training_sessions')
  order by c.relname
`);

console.log("tabela             RLS    políticas");
let failed = false;
for (const t of tables) {
  const ok = t.rls && Number(t.policies) > 0;
  if (!ok) failed = true;
  console.log(
    `${t.table.padEnd(19)}${(t.rls ? "on" : "OFF").padEnd(7)}${t.policies}${ok ? "" : "   <-- FALHA"}`,
  );
}

if (tables.length !== 2) {
  console.error(`\nesperadas 2 tabelas, achadas ${tables.length}`);
  failed = true;
}

const { rows: buckets } = await client.query(
  `select id, public from storage.buckets where id = 'dog-photos'`,
);
if (!buckets.length) {
  console.error("bucket dog-photos ausente");
  failed = true;
} else {
  console.log(`\nbucket dog-photos: ${buckets[0].public ? "PÚBLICO <-- FALHA" : "privado"}`);
  if (buckets[0].public) failed = true;
}

const { rows: enums } = await client.query(`
  select t.typname from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typtype = 'e'
  order by t.typname
`);
console.log(`enums: ${enums.map((e) => e.typname).join(", ")}`);

await client.end();
console.log(failed ? "\nFALHOU" : "\nOK");
process.exit(failed ? 1 : 0);
