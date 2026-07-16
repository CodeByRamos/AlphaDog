/**
 * Domínio do cão.
 *
 * Os literais são os mesmos strings gravados no banco. Trocar um valor aqui
 * quebra dados existentes — mudança de rótulo é na camada de UI, não aqui.
 */

export const AGE_GROUPS = ["puppy", "adolescent", "adult", "senior"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export const ENERGY_LEVELS = ["calm", "moderate", "high", "very_high"] as const;
export type EnergyLevel = (typeof ENERGY_LEVELS)[number];

export const EXPERIENCE_LEVELS = ["none", "basic", "intermediate"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const DIFFICULTIES = [
  "pulling",
  "barking",
  "jumping",
  "chewing",
  "separation",
  "recall",
  "aggression",
  "potty",
  "none",
] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const GOALS = ["obedience", "fix_behavior", "socialize", "tricks", "bond"] as const;
export type Goal = (typeof GOALS)[number];

export type DogProfile = {
  id: string;
  ownerId: string;
  name: string;
  breedSlug: string | null;
  ageGroup: AgeGroup;
  gender: Gender | null;
  /** Gramas. Inteiro, não float — evita 4.199999 kg no banco. */
  weightGrams: number | null;
  energyLevel: EnergyLevel;
  experienceLevel: ExperienceLevel;
  difficulties: Difficulty[];
  goal: Goal;
  photoUrl: string | null;
  createdAt: string;
};

/** Entrada do onboarding, antes de existir id. */
export type DogDraft = Omit<DogProfile, "id" | "ownerId" | "createdAt">;

export function formatWeight(grams: number | null): string {
  if (grams === null) return "—";
  const kg = grams / 1000;
  // Cão de 3,5kg precisa da casa decimal; de 32kg, não.
  return kg < 10 ? `${kg.toFixed(1).replace(".", ",")} kg` : `${Math.round(kg)} kg`;
}

/**
 * Concordância de gênero para a copy em pt-BR.
 *
 * Sem nome, o fallback é "seu cão" — masculino. Por isso o padrão é "o".
 */
export function article(dog: Pick<DogProfile, "gender">): "o" | "a" {
  return dog.gender === "female" ? "a" : "o";
}

export function possessive(dog: Pick<DogProfile, "gender">): "do" | "da" {
  return dog.gender === "female" ? "da" : "do";
}
