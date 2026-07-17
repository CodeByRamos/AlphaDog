import type { DogDraft, DogProfile } from "@alphadog/core";
import { supabase } from "../lib/supabase";
import type { DogRow } from "../lib/database.types";

/**
 * Acesso aos cães.
 *
 * A fronteira entre o formato do banco (snake_case, nullable) e o do domínio
 * (camelCase, tipado). Sem esta camada, a UI conheceria nomes de coluna — e
 * renomear uma coluna viraria um mutirão de find-and-replace nas telas.
 */

function toDomain(row: DogRow): DogProfile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    breedSlug: row.breed_slug,
    ageGroup: row.age_group,
    gender: row.gender,
    weightGrams: row.weight_grams,
    energyLevel: row.energy_level,
    experienceLevel: row.experience_level,
    difficulties: row.difficulties,
    goal: row.goal,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
  };
}

export async function listDogs(): Promise<DogProfile[]> {
  // Sem filtro por owner_id: o RLS já faz isso no banco. Filtrar aqui daria a
  // falsa impressão de que é o cliente quem protege.
  const { data, error } = await supabase
    .from("dogs")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toDomain);
}

export async function createDog(draft: DogDraft, ownerId: string): Promise<DogProfile> {
  const { data, error } = await supabase
    .from("dogs")
    .insert({
      owner_id: ownerId,
      name: draft.name.trim(),
      breed_slug: draft.breedSlug,
      age_group: draft.ageGroup,
      gender: draft.gender,
      weight_grams: draft.weightGrams,
      energy_level: draft.energyLevel,
      experience_level: draft.experienceLevel,
      difficulties: draft.difficulties,
      goal: draft.goal,
      photo_url: draft.photoUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return toDomain(data);
}

export async function updateDog(
  id: string,
  patch: Partial<DogDraft>,
): Promise<DogProfile> {
  const { data, error } = await supabase
    .from("dogs")
    .update({
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.breedSlug !== undefined && { breed_slug: patch.breedSlug }),
      ...(patch.ageGroup !== undefined && { age_group: patch.ageGroup }),
      ...(patch.gender !== undefined && { gender: patch.gender }),
      ...(patch.weightGrams !== undefined && { weight_grams: patch.weightGrams }),
      ...(patch.energyLevel !== undefined && { energy_level: patch.energyLevel }),
      ...(patch.experienceLevel !== undefined && {
        experience_level: patch.experienceLevel,
      }),
      ...(patch.difficulties !== undefined && { difficulties: patch.difficulties }),
      ...(patch.goal !== undefined && { goal: patch.goal }),
      ...(patch.photoUrl !== undefined && { photo_url: patch.photoUrl }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toDomain(data);
}

/**
 * Envia a foto e devolve a URL.
 *
 * O caminho começa com o uid porque a política do bucket compara o primeiro
 * segmento com auth.uid() — é isso que impede alguém de ler a pasta de outro.
 */
export async function uploadDogPhoto(
  ownerId: string,
  dogId: string,
  uri: string,
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.arrayBuffer();

  // Timestamp no nome: o Supabase Storage cacheia por URL, e sobrescrever com o
  // mesmo nome deixaria a foto antiga aparecendo.
  const path = `${ownerId}/${dogId}-${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from("dog-photos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) throw error;

  // Bucket privado: URL assinada, não pública. Um ano — a foto é do próprio
  // dono e o app renova a cada leitura.
  const { data, error: signErr } = await supabase.storage
    .from("dog-photos")
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signErr) throw signErr;
  return data.signedUrl;
}
