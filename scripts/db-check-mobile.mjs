/**
 * O banco tem o que o aplicativo precisa?
 *
 * Existe porque uma falha aqui não aparece em typecheck, lint nem build: o APK
 * instala normalmente e só quebra quando o tutor termina o onboarding e tenta
 * salvar o cão. Melhor descobrir antes de gerar o binário.
 *
 *   node scripts/db-check-mobile.mjs
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: "apps/website/.env.local" });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL ausente em apps/website/.env.local");
  process.exit(1);
}

/** O que o app usa em runtime. Faltando qualquer um, alguma tela quebra. */
const TABLES = ["dogs", "training_sessions", "subscriptions"];
const ENUMS = [
  "dog_age_group",
  "dog_gender",
  "dog_energy",
  "dog_experience",
  "training_goal",
  "exercise_id",
  "subscription_status",
];
const EXERCISES = [
  "sit",
  "paw",
  "down",
  "touch",
  "stay",
  "come",
  "heel",
  "watch",
  "leave_it",
  "wait_food",
  "find_it",
];

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

let problemas = 0;
const falta = (msg) => {
  console.log(`  FALTA  ${msg}`);
  problemas++;
};
const ok = (msg) => console.log(`  ok     ${msg}`);

try {
  await client.connect();

  console.log("\n=== TABELAS ===");
  const { rows: tabelas } = await client.query(
    `select table_name from information_schema.tables where table_schema = 'public'`,
  );
  const nomes = new Set(tabelas.map((r) => r.table_name));
  for (const t of TABLES) (nomes.has(t) ? ok : falta)(`tabela ${t}`);

  console.log("\n=== TIPOS ===");
  const { rows: tipos } = await client.query(`select typname from pg_type`);
  const tiposSet = new Set(tipos.map((r) => r.typname));
  for (const e of ENUMS) (tiposSet.has(e) ? ok : falta)(`enum ${e}`);

  console.log("\n=== EXERCÍCIOS NO ENUM ===");
  if (tiposSet.has("exercise_id")) {
    const { rows: vals } = await client.query(
      `select e.enumlabel from pg_enum e
       join pg_type t on t.oid = e.enumtypid where t.typname = 'exercise_id'`,
    );
    const set = new Set(vals.map((r) => r.enumlabel));
    const ausentes = EXERCISES.filter((x) => !set.has(x));
    if (ausentes.length === 0) ok(`todos os ${EXERCISES.length} exercícios`);
    else falta(`exercícios no enum: ${ausentes.join(", ")}`);
  } else {
    falta("enum exercise_id não existe — a migration base nunca rodou");
  }

  console.log("\n=== RLS ===");
  const { rows: rls } = await client.query(
    `select relname, relrowsecurity from pg_class
     where relname = any($1) and relkind = 'r'`,
    [TABLES],
  );
  for (const r of rls) {
    (r.relrowsecurity ? ok : falta)(`RLS ligado em ${r.relname}`);
  }

  console.log("\n=== STORAGE (fotos do cão) ===");
  const { rows: buckets } = await client.query(
    `select id from storage.buckets where id = 'dog-photos'`,
  );
  (buckets.length ? ok : falta)("bucket dog-photos");

  console.log("\n" + "=".repeat(50));
  if (problemas === 0) {
    console.log("BANCO PRONTO — o app tem tudo que precisa.");
  } else {
    console.log(`${problemas} PROBLEMA(S). Rode supabase/SETUP.sql no SQL Editor.`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error("\nerro ao conectar:", error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
