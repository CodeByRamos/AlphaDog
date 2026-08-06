import { describe, expect, it } from "vitest";
import {
  EXERCISES,
  MIN_ANALYSIS_CONFIDENCE,
  advance,
  applyAnalysis,
  buildAnalysisPrompt,
  countsAsRep,
  getExerciseGuide,
  inconclusiveResult,
  initialPhotoSession,
  markManualSuccess,
  retryPhoto,
  startAnalyzing,
  summarize,
  type AnalysisResult,
  type ExerciseId,
} from "../src";

/**
 * Estes testes protegem a contagem de repetições.
 *
 * Um erro aqui não dá crash nem tela vermelha: dá sessão que nunca termina, ou
 * acerto contado a mais. O tutor vê um número no histórico e acredita nele —
 * e é justamente por isso que ninguém percebe quando o número está errado.
 */

const sit = EXERCISES.sit;

function result(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    success: true,
    confidence: 0.9,
    feedback: "O quadril está no chão e as patas dianteiras alinhadas.",
    tips: "",
    criteria: [],
    training: "sit",
    ...overrides,
  };
}

describe("countsAsRep", () => {
  it("exige sucesso E confiança acima do limiar", () => {
    expect(countsAsRep(result())).toBe(true);
    expect(countsAsRep(result({ success: false }))).toBe(false);
    expect(countsAsRep(result({ confidence: MIN_ANALYSIS_CONFIDENCE - 0.01 }))).toBe(false);
  });

  it("sucesso incerto NÃO conta", () => {
    // A regra que impede o pior erro do produto: um "Excelente!" quando o cão
    // não executou ensina o tutor a recompensar o comportamento errado.
    expect(countsAsRep(result({ success: true, confidence: 0.3 }))).toBe(false);
  });
});

describe("máquina da sessão por foto", () => {
  it("começa pronta para a primeira repetição", () => {
    const state = initialPhotoSession(sit);
    expect(state.phase).toBe("ready");
    expect(state.currentRep).toBe(1);
    expect(state.totalReps).toBe(sit.reps);
    expect(state.successCount).toBe(0);
  });

  it("conta a repetição quando a análise aprova com confiança", () => {
    let state = initialPhotoSession(sit);
    state = startAnalyzing(state);
    state = applyAnalysis(state, result());

    expect(state.phase).toBe("reviewing");
    expect(state.successCount).toBe(1);
  });

  it("não conta quando a análise reprova", () => {
    let state = initialPhotoSession(sit);
    state = startAnalyzing(state);
    state = applyAnalysis(state, result({ success: false, confidence: 0.95 }));

    expect(state.successCount).toBe(0);
    expect(state.phase).toBe("reviewing");
  });

  it("resultado inconclusivo não conta como acerto nem trava a sessão", () => {
    let state = initialPhotoSession(sit);
    state = startAnalyzing(state);
    state = applyAnalysis(state, inconclusiveResult("sit", "Não deu para avaliar."));

    expect(state.successCount).toBe(0);
    expect(state.phase).toBe("reviewing");
    // O tutor ainda pode seguir — punir por uma limitação nossa seria injusto.
    expect(advance(state).phase).toBe("ready");
  });

  it("avança repetição por repetição e encerra na última", () => {
    let state = initialPhotoSession(sit);

    for (let i = 1; i < sit.reps; i++) {
      state = advance(startAnalyzing(state) && applyAnalysis(startAnalyzing(state), result()));
      expect(state.currentRep).toBe(i + 1);
      expect(state.phase).toBe("ready");
    }

    state = applyAnalysis(startAnalyzing(state), result());
    state = advance(state);
    expect(state.phase).toBe("finished");
  });

  it("repetir a foto NÃO consome a repetição", () => {
    // Foto escura ou cortada é problema de enquadramento, não erro do cão.
    let state = initialPhotoSession(sit);
    state = startAnalyzing(state);
    state = applyAnalysis(state, inconclusiveResult("sit", "Foto escura."));
    state = retryPhoto(state);

    expect(state.phase).toBe("ready");
    expect(state.currentRep).toBe(1);
    expect(state.lastResult).toBeNull();
  });

  it("marcação manual conta o acerto e fica registrada como manual", () => {
    let state = initialPhotoSession(sit);
    state = markManualSuccess(state);

    expect(state.successCount).toBe(1);
    expect(state.manualCount).toBe(1);
    expect(state.lastWasManual).toBe(true);
  });

  it("ignora eventos fora de ordem em vez de corromper o estado", () => {
    // Toque duplo, resposta atrasada de rede, retorno após encerrar: nenhum
    // pode inflar a contagem.
    const ready = initialPhotoSession(sit);
    expect(applyAnalysis(ready, result()).successCount).toBe(0);

    const analyzing = startAnalyzing(ready);
    expect(startAnalyzing(analyzing)).toBe(analyzing);
  });
});

describe("summarize", () => {
  it("mede a taxa sobre as repetições TENTADAS, não sobre o total planejado", () => {
    // Quem encerra no meio com 2 de 2 fez 100%, não 40%.
    let state = initialPhotoSession(sit, 0);
    state = advance(applyAnalysis(startAnalyzing(state), result()));
    state = advance(applyAnalysis(startAnalyzing(state), result()));

    const summary = summarize(state, 60_000);
    expect(summary.successCount).toBe(2);
    expect(summary.successRate).toBe(1);
    expect(summary.durationSeconds).toBe(60);
    expect(summary.exerciseId).toBe("sit");
  });

  it("sessão sem nenhuma tentativa não divide por zero", () => {
    const summary = summarize(initialPhotoSession(sit, 0), 1000);
    expect(summary.successRate).toBe(0);
    expect(Number.isFinite(summary.successRate)).toBe(true);
  });

  it("separa o que a IA confirmou do que o tutor disse ter visto", () => {
    let state = initialPhotoSession(sit, 0);
    state = advance(applyAnalysis(startAnalyzing(state), result()));
    state = advance(markManualSuccess(state));

    const summary = summarize(state, 0);
    expect(summary.successCount).toBe(2);
    expect(summary.manualCount).toBe(1);
  });
});

describe("prompt por exercício", () => {
  const ids = Object.keys(EXERCISES) as ExerciseId[];

  it("todo exercício tem guia com critérios de IA", () => {
    for (const id of ids) {
      const guide = getExerciseGuide(id);
      expect(guide.aiCriteria.length).toBeGreaterThan(0);
      expect(guide.objective.length).toBeGreaterThan(20);
      expect(guide.commonMistakes.length).toBeGreaterThan(0);
      expect(guide.photoInstruction.length).toBeGreaterThan(20);
    }
  });

  it("o prompt de cada exercício carrega os critérios DAQUELE exercício", () => {
    // É isto que impede um prompt genérico: se alguém trocar a montagem por um
    // texto único, este teste quebra.
    for (const id of ids) {
      const prompt = buildAnalysisPrompt(id);
      expect(prompt).toContain(EXERCISES[id].name);
      for (const criterion of getExerciseGuide(id).aiCriteria) {
        expect(prompt).toContain(criterion);
      }
    }
  });

  it("prompts de exercícios diferentes são diferentes", () => {
    const prompts = new Set(ids.map((id) => buildAnalysisPrompt(id)));
    expect(prompts.size).toBe(ids.length);
  });

  it("pré-requisitos apontam para exercícios que existem", () => {
    for (const id of ids) {
      for (const prerequisite of getExerciseGuide(id).prerequisites) {
        expect(EXERCISES[prerequisite]).toBeDefined();
        expect(prerequisite).not.toBe(id);
      }
    }
  });
});
