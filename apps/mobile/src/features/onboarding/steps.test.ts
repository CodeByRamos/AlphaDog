import { describe, expect, it } from "vitest";
import { STEPS, emptyDraft, isStepAnswered, parseWeightKg } from "./steps";

describe("peso", () => {
  it("converte kg para gramas", () => {
    expect(parseWeightKg("12")).toBe(12000);
  });

  it("aceita vírgula decimal", () => {
    // Teclado brasileiro produz vírgula. Rejeitar seria um bug garantido.
    expect(parseWeightKg("3,5")).toBe(3500);
  });

  it("aceita ponto decimal", () => {
    expect(parseWeightKg("3.5")).toBe(3500);
  });

  it("ignora espaço", () => {
    expect(parseWeightKg(" 8 ")).toBe(8000);
  });

  it("vazio devolve null", () => {
    // Peso é opcional: exigir travaria quem não sabe.
    expect(parseWeightKg("")).toBeNull();
  });

  it("recusa texto", () => {
    expect(parseWeightKg("mais ou menos")).toBeNull();
  });

  it("recusa zero e negativo", () => {
    expect(parseWeightKg("0")).toBeNull();
    expect(parseWeightKg("-5")).toBeNull();
  });

  it("recusa fora do limite do banco", () => {
    // O CHECK é 500g..120kg. Barrar aqui dá mensagem útil; deixar passar daria
    // erro de constraint que não diz nada ao tutor.
    expect(parseWeightKg("0.2")).toBeNull();
    expect(parseWeightKg("200")).toBeNull();
  });

  it("aceita as bordas", () => {
    expect(parseWeightKg("0,5")).toBe(500);
    expect(parseWeightKg("120")).toBe(120000);
  });
});

describe("passo respondido", () => {
  it("nome vazio não passa", () => {
    const step = STEPS.find((s) => s.kind === "text")!;
    expect(isStepAnswered(step, emptyDraft())).toBe(false);
  });

  it("nome só com espaço não passa", () => {
    const step = STEPS.find((s) => s.kind === "text")!;
    expect(isStepAnswered(step, { ...emptyDraft(), name: "   " })).toBe(false);
  });

  it("nome preenchido passa", () => {
    const step = STEPS.find((s) => s.kind === "text")!;
    expect(isStepAnswered(step, { ...emptyDraft(), name: "Nina" })).toBe(true);
  });

  it("peso sempre passa, porque é opcional", () => {
    const step = STEPS.find((s) => s.kind === "weight")!;
    expect(isStepAnswered(step, emptyDraft())).toBe(true);
  });

  it("múltipla escolha exige ao menos um", () => {
    const step = STEPS.find((s) => s.kind === "multi")!;
    expect(isStepAnswered(step, emptyDraft())).toBe(false);
    expect(isStepAnswered(step, { ...emptyDraft(), difficulties: ["pulling"] })).toBe(true);
  });

  it("escolha sem valor não passa", () => {
    const gender = STEPS.find((s) => s.kind === "choice" && s.key === "gender")!;
    expect(isStepAnswered(gender, emptyDraft())).toBe(false);
    expect(isStepAnswered(gender, { ...emptyDraft(), gender: "female" })).toBe(true);
  });

  it("escolha com default já vem respondida", () => {
    // ageGroup nasce 'adult'. Não faz sentido bloquear.
    const age = STEPS.find((s) => s.kind === "choice" && s.key === "ageGroup")!;
    expect(isStepAnswered(age, emptyDraft())).toBe(true);
  });
});

describe("catálogo de passos", () => {
  it("cobre os nove campos pedidos", () => {
    const keys = STEPS.map((s) => s.key);
    for (const k of [
      "name",
      "ageGroup",
      "breedSlug",
      "gender",
      "weightGrams",
      "energyLevel",
      "experienceLevel",
      "difficulties",
      "goal",
    ]) {
      expect(keys).toContain(k);
    }
  });

  it("não repete chave", () => {
    const keys = STEPS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("toda escolha tem opção", () => {
    for (const step of STEPS) {
      if (step.kind === "choice" || step.kind === "multi") {
        expect(step.options.length).toBeGreaterThan(0);
      }
    }
  });

  it("SRD é a primeira raça", () => {
    // Metade dos cães brasileiros. Enterrar no fim da lista seria ignorar o
    // mercado.
    const breed = STEPS.find((s) => s.kind === "choice" && s.key === "breedSlug")!;
    expect(breed.kind === "choice" && breed.options[0]?.value).toBe("srd");
  });
});
