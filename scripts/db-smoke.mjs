/**
 * Prova, contra o banco real, que o RLS faz o que promete.
 *
 * Usa a anon key — a mesma que vai no bundle do app. Se um anônimo conseguir
 * ler `dogs`, qualquer pessoa com o APK lê os dados de todos os usuários.
 *
 * Vale mais que o db-verify: aquele confere que a política existe, este confere
 * que ela funciona.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, "apps/mobile/.env"), "utf8");
const pick = (k) => env.match(new RegExp(`${k}="([^"]+)"`))?.[1];

const url = pick("EXPO_PUBLIC_SUPABASE_URL");
const anon = pick("EXPO_PUBLIC_SUPABASE_ANON_KEY");
const supabase = createClient(url, anon);

let failed = false;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FALHA"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed = true;
};

// 1. Anônimo não pode ler cães de ninguém.
const { data: dogs, error: dogErr } = await supabase.from("dogs").select("*").limit(1);
check(
  "anônimo não lê dogs",
  (dogs ?? []).length === 0,
  dogErr ? dogErr.code : `${(dogs ?? []).length} linha(s)`,
);

// 2. Nem sessões.
const { data: sessions } = await supabase.from("training_sessions").select("*").limit(1);
check("anônimo não lê training_sessions", (sessions ?? []).length === 0);

// 3. Nem inserir.
const { error: insErr } = await supabase.from("dogs").insert({
  owner_id: "00000000-0000-0000-0000-000000000000",
  name: "Invasor",
  age_group: "adult",
});
check("anônimo não insere dog", !!insErr, insErr?.code);

// 4. O ciclo real: cadastrar, criar cão, ler de volta.
// Domínio real: o Supabase valida o TLD e rejeita `.test`.
const email = `smoke.${Date.now()}@gmail.com`;
const { data: signUp, error: signErr } = await supabase.auth.signUp({
  email,
  password: "SenhaDeTeste!2026",
});

if (signErr) {
  check("cadastro funciona", false, signErr.message);
} else {
  const uid = signUp.user?.id;
  check("cadastro funciona", !!uid);
  check("sessão criada no cadastro", !!signUp.session, signUp.session ? "" : "confirm email ligado?");

  if (signUp.session) {
    const { data: dog, error: createErr } = await supabase
      .from("dogs")
      .insert({
        owner_id: uid,
        name: "Nina",
        age_group: "adult",
        gender: "female",
        weight_grams: 12000,
        energy_level: "high",
        experience_level: "none",
        difficulties: ["pulling", "barking"],
        goal: "obedience",
      })
      .select()
      .single();

    check("usuário cria o próprio cão", !!dog && !createErr, createErr?.message);

    if (dog) {
      const { data: mine } = await supabase.from("dogs").select("*");
      check("usuário lê o próprio cão", mine?.length === 1);

      const { data: sess, error: sessErr } = await supabase
        .from("training_sessions")
        .insert({
          dog_id: dog.id,
          owner_id: uid,
          exercise_id: "sit",
          success_count: 4,
          total_reps: 5,
          duration_seconds: 122,
          success_rate: 0.8,
          completed: true,
          ended_at: new Date().toISOString(),
        })
        .select()
        .single();

      check("usuário grava sessão", !!sess && !sessErr, sessErr?.message);

      // 5. O ataque que a política de insert previne: gravar sessão no cão de
      // outra pessoa passando um dog_id que não é meu.
      const { error: stealErr } = await supabase.from("training_sessions").insert({
        dog_id: "00000000-0000-0000-0000-000000000000",
        owner_id: uid,
        exercise_id: "sit",
        total_reps: 5,
      });
      check("não grava sessão em cão alheio", !!stealErr, stealErr?.code);

      // 6. Nem forjar owner_id.
      const { error: forgeErr } = await supabase.from("dogs").insert({
        owner_id: "00000000-0000-0000-0000-000000000000",
        name: "Forjado",
        age_group: "adult",
      });
      check("não cria cão para outro dono", !!forgeErr, forgeErr?.code);

      await supabase.from("dogs").delete().eq("id", dog.id);
    }
  }
}

console.log(failed ? "\nFALHOU" : "\nRLS OK");
process.exit(failed ? 1 : 0);
