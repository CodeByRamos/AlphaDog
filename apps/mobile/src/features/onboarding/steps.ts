import type { DogDraft } from "@alphadog/core";

/**
 * Passos do onboarding, como dados.
 *
 * Mesma decisão do funil do site: o passo é configuração, não componente.
 * Adicionar uma pergunta é adicionar uma entrada aqui — não uma tela nova.
 */

export type ChoiceOption = {
  value: string;
  label: string;
  hint?: string;
  emoji?: string;
};

export type Step =
  | { kind: "text"; key: "name"; title: string; subtitle?: string; placeholder: string }
  | { kind: "choice"; key: ChoiceKey; title: string; subtitle?: string; options: ChoiceOption[] }
  | { kind: "multi"; key: "difficulties"; title: string; subtitle?: string; options: ChoiceOption[] }
  | { kind: "weight"; key: "weightGrams"; title: string; subtitle?: string };

type ChoiceKey = "ageGroup" | "gender" | "energyLevel" | "experienceLevel" | "goal" | "breedSlug";

/** Raças mais comuns no Brasil. SRD primeiro: é metade dos cães do país. */
export const BREEDS: ChoiceOption[] = [
  { value: "srd", label: "SRD (vira-lata)", emoji: "🐕" },
  { value: "shih-tzu", label: "Shih Tzu" },
  { value: "poodle", label: "Poodle" },
  { value: "yorkshire", label: "Yorkshire" },
  { value: "maltes", label: "Maltês" },
  { value: "lhasa-apso", label: "Lhasa Apso" },
  { value: "pinscher", label: "Pinscher" },
  { value: "spitz-alemao", label: "Spitz Alemão" },
  { value: "bulldog-frances", label: "Bulldog Francês" },
  { value: "pug", label: "Pug" },
  { value: "beagle", label: "Beagle" },
  { value: "border-collie", label: "Border Collie" },
  { value: "golden-retriever", label: "Golden Retriever" },
  { value: "labrador", label: "Labrador" },
  { value: "pastor-alemao", label: "Pastor Alemão" },
  { value: "rottweiler", label: "Rottweiler" },
  { value: "pitbull", label: "Pit Bull" },
  { value: "husky", label: "Husky Siberiano" },
  { value: "dachshund", label: "Dachshund" },
  { value: "chihuahua", label: "Chihuahua" },
  { value: "outra", label: "Outra raça" },
];

export const STEPS: Step[] = [
  {
    kind: "text",
    key: "name",
    title: "Qual o nome do seu cão?",
    subtitle: "Vamos usar em todo o app.",
    placeholder: "Nina",
  },
  {
    kind: "choice",
    key: "ageGroup",
    title: "Que idade ele tem?",
    subtitle: "O plano muda conforme a fase de vida.",
    options: [
      { value: "puppy", label: "Filhote", hint: "Menos de 6 meses", emoji: "🍼" },
      { value: "adolescent", label: "Adolescente", hint: "6 a 18 meses", emoji: "🎾" },
      { value: "adult", label: "Adulto", hint: "1,5 a 7 anos", emoji: "🦴" },
      { value: "senior", label: "Idoso", hint: "Mais de 7 anos", emoji: "💤" },
    ],
  },
  {
    kind: "choice",
    key: "breedSlug",
    title: "Qual a raça?",
    subtitle: "Se não souber ao certo, escolha SRD.",
    options: BREEDS,
  },
  {
    kind: "choice",
    key: "gender",
    title: "Macho ou fêmea?",
    options: [
      { value: "male", label: "Macho", emoji: "♂️" },
      { value: "female", label: "Fêmea", emoji: "♀️" },
    ],
  },
  {
    kind: "weight",
    key: "weightGrams",
    title: "Quanto ele pesa?",
    subtitle: "Aproximado já ajuda. Usamos para dosar a intensidade.",
  },
  {
    kind: "choice",
    key: "energyLevel",
    title: "Como é a energia dele?",
    subtitle: "Isso define o tamanho das sessões.",
    options: [
      { value: "calm", label: "Calmo", hint: "Dorme a maior parte do dia", emoji: "😌" },
      { value: "moderate", label: "Moderado", hint: "Brinca e descansa", emoji: "🙂" },
      { value: "high", label: "Agitado", hint: "Sempre pronto para ação", emoji: "⚡" },
      { value: "very_high", label: "Elétrico", hint: "Não para nunca", emoji: "🔥" },
    ],
  },
  {
    kind: "choice",
    key: "experienceLevel",
    title: "Ele já treinou antes?",
    options: [
      { value: "none", label: "Nunca treinou", hint: "Começando do zero", emoji: "🐣" },
      { value: "basic", label: "Sabe o básico", hint: "Senta, vem aqui", emoji: "📗" },
      { value: "intermediate", label: "Já sabe bastante", hint: "Vários comandos", emoji: "🎓" },
    ],
  },
  {
    kind: "multi",
    key: "difficulties",
    title: "O que mais te incomoda?",
    subtitle: "Pode marcar quantos quiser.",
    options: [
      { value: "pulling", label: "Puxa a guia", emoji: "🦮" },
      { value: "barking", label: "Late demais", emoji: "📢" },
      { value: "jumping", label: "Pula nas pessoas", emoji: "🙋" },
      { value: "chewing", label: "Destrói objetos", emoji: "🪑" },
      { value: "separation", label: "Sofre sozinho", emoji: "😢" },
      { value: "recall", label: "Não volta quando chamo", emoji: "🏃" },
      { value: "potty", label: "Faz no lugar errado", emoji: "😬" },
      { value: "aggression", label: "Rosna ou avança", emoji: "⚠️" },
      { value: "none", label: "Nenhum desses", emoji: "😇" },
    ],
  },
  {
    kind: "choice",
    key: "goal",
    title: "Qual seu objetivo?",
    subtitle: "Dá para mudar depois.",
    options: [
      { value: "obedience", label: "Um cão obediente", hint: "No dia a dia", emoji: "✅" },
      { value: "fix_behavior", label: "Resolver um problema", hint: "Algo específico", emoji: "🔧" },
      { value: "socialize", label: "Socializar", hint: "Com gente e outros cães", emoji: "🐕" },
      { value: "tricks", label: "Ensinar truques", emoji: "🎯" },
      { value: "bond", label: "Nos conectar melhor", emoji: "❤️" },
    ],
  },
];

/** Rascunho inicial. Os defaults batem com os do banco. */
export function emptyDraft(): DogDraft {
  return {
    name: "",
    breedSlug: null,
    ageGroup: "adult",
    gender: null,
    weightGrams: null,
    energyLevel: "moderate",
    experienceLevel: "none",
    difficulties: [],
    goal: "obedience",
    photoUrl: null,
  };
}

/**
 * O passo tem resposta suficiente para avançar?
 *
 * Peso é opcional de propósito: exigir número exato trava quem não sabe, e o
 * plano funciona sem ele.
 */
export function isStepAnswered(step: Step, draft: DogDraft): boolean {
  switch (step.kind) {
    case "text":
      return draft.name.trim().length > 0;
    case "weight":
      return true;
    case "multi":
      return draft.difficulties.length > 0;
    case "choice": {
      const value = draft[step.key];
      return value !== null && value !== undefined && value !== "";
    }
  }
}

/** Converte o que o tutor digitou em kg para gramas. */
export function parseWeightKg(input: string): number | null {
  const normalized = input.replace(",", ".").trim();
  if (!normalized) return null;

  const kg = Number(normalized);
  if (!Number.isFinite(kg) || kg <= 0) return null;

  // Bate com o CHECK do banco (500g a 120kg). Sem isto o insert falharia com
  // erro de constraint, que não diz nada ao tutor.
  const grams = Math.round(kg * 1000);
  if (grams < 500 || grams > 120000) return null;
  return grams;
}
