/**
 * Contrato da sessão de treino.
 *
 * Os testes centrais impedem um "Excelente!" indevido: é o único feedback que
 * autoriza o tutor a recompensar. Recompensar errado ensina o cão errado.
 */

import { describe, expect, it } from "vitest";
import { EXERCISES } from "../src/exercise";
import type { Posture, PostureReading } from "../src/posture";
import { TrainingSession, feedbackText } from "../src/session";

const FPS = 30;

function reading(posture: Posture): PostureReading {
  return { posture, confidence: 0.9, reason: "teste" };
}

/** Alimenta N frames a partir de `start`, devolve o último estado. */
function feed(session: TrainingSession, posture: Posture, frames: number, start = 0) {
  let state = session.update(reading(posture), start);
  for (let i = 1; i < frames; i++) {
    state = session.update(reading(posture), start + i / FPS);
  }
  return state;
}

function sitSession() {
  return new TrainingSession(EXERCISES.sit);
}

describe("sucesso exige permanência", () => {
  it("um frame sentado não é sucesso", () => {
    const session = sitSession();
    const state = session.update(reading("sitting"), 0);
    expect(state.feedback).not.toBe("success");
  });

  it("sentar rápido demais não conta", () => {
    // 1s, mas o exercício pede 2s.
    const state = feed(sitSession(), "sitting", 30);
    expect(state.feedback).toBe("hold");
    expect(state.remainingSeconds).toBeGreaterThan(0);
  });

  it("manter o tempo todo conta", () => {
    const state = feed(sitSession(), "sitting", 70);
    expect(state.feedback).toBe("success");
    expect(state.successCount).toBe(1);
  });

  it("o contador regressivo é verdade", () => {
    const session = sitSession();
    const first = feed(session, "sitting", 6);
    const later = feed(session, "sitting", 20, 1.0);
    expect(later.remainingSeconds).toBeLessThan(first.remainingSeconds);
  });
});

describe("tolera ruído", () => {
  it("um frame ruim não quebra a permanência", () => {
    // ~38% dos frames são difíceis segundo a literatura: frame ruim é rotina.
    const session = sitSession();
    feed(session, "sitting", 20);
    session.update(reading("unknown"), 20 / FPS);
    const state = feed(session, "sitting", 50, 21 / FPS);
    expect(state.feedback).toBe("success");
  });

  it("perder a visão não zera o progresso", () => {
    // Tutor passa na frente da câmera: o cão continua sentado.
    const session = sitSession();
    feed(session, "sitting", 30);
    const blocked = feed(session, "unknown", 5, 1.0);
    expect(blocked.feedback).toBe("unclear_view");

    const state = feed(session, "sitting", 40, 1.5);
    expect(state.feedback).toBe("success");
  });
});

describe("rejeita falso positivo", () => {
  it("em pé nunca completa um senta", () => {
    const state = feed(sitSession(), "standing", 120);
    expect(state.feedback).toBe("not_yet");
    expect(state.successCount).toBe(0);
  });

  it("desconhecido nunca vira sucesso", () => {
    const state = feed(sitSession(), "unknown", 120);
    expect(state.feedback).not.toBe("success");
    expect(state.successCount).toBe(0);
  });

  it("alternância nunca vira sucesso por acidente", () => {
    // Cão agitado alternando entre sentar e levantar.
    const session = sitSession();
    let state = session.update(reading("sitting"), 0);
    for (let i = 1; i < 120; i++) {
      state = session.update(reading(i % 2 === 0 ? "sitting" : "standing"), i / FPS);
    }
    expect(state.successCount).toBe(0);
  });
});

describe("múltiplas repetições", () => {
  it("acertar entra em recompensa antes da próxima", () => {
    const session = sitSession();
    const state = feed(session, "sitting", 70);
    expect(state.phase).toBe("rewarding");
    expect(state.currentRep).toBe(1);
  });

  it("a janela de recompensa não julga postura", () => {
    // O tutor está entregando o petisco; o cão vai se mexer.
    const session = sitSession();
    feed(session, "sitting", 70);
    const state = feed(session, "standing", 10, 2.5);
    expect(state.successCount).toBe(1);
    expect(state.phase).toBe("rewarding");
  });

  it("avança para a próxima repetição após a recompensa", () => {
    const session = sitSession();
    feed(session, "sitting", 70);
    const state = feed(session, "standing", 5, 6.0);
    expect(state.currentRep).toBe(2);
  });

  it("conclui após todas as repetições", () => {
    // Alimenta 30fps contínuo, como a câmera faz. Pular o tempo em blocos
    // deixaria a janela de recompensa sem os frames que a fecham.
    const session = sitSession();
    let frames = 0;
    while (!session.finished && frames < 60 * FPS) {
      session.update(reading("sitting"), frames / FPS);
      frames++;
    }
    expect(session.finished).toBe(true);
    const result = session.result(frames / FPS);
    expect(result.successCount).toBe(EXERCISES.sit.reps);
    expect(result.successRate).toBe(1);
  });

  it("um cão perfeito conclui em tempo razoável", () => {
    // 5 repetições de 2s + 3s de recompensa cada. Passar muito disso indica
    // que a máquina de estado empacou em algum lugar.
    const session = sitSession();
    let frames = 0;
    while (!session.finished && frames < 120 * FPS) {
      session.update(reading("sitting"), frames / FPS);
      frames++;
    }
    expect(frames / FPS).toBeLessThan(40);
  });
});

describe("resultado", () => {
  it("sessão parcial usa o que foi tentado como denominador", () => {
    // Sair na repetição 2 com 1 acerto é 100% do tentado, não 20% do plano.
    const session = sitSession();
    feed(session, "sitting", 70);
    feed(session, "standing", 5, 6.0);
    const result = session.result(7);
    expect(result.successCount).toBe(1);
    expect(result.successRate).toBe(1);
    expect(result.totalReps).toBe(5);
  });

  it("sessão sem acerto não divide por zero", () => {
    const session = sitSession();
    feed(session, "standing", 30);
    expect(session.result(1).successRate).toBe(0);
  });

  it("duração é inteira em segundos", () => {
    const session = sitSession();
    feed(session, "sitting", 70);
    expect(Number.isInteger(session.result(12.7).durationSeconds)).toBe(true);
  });
});

describe("copy do feedback", () => {
  it("usa o nome do cão", () => {
    const session = sitSession();
    const state = session.update(reading("unknown"), 0);
    expect(feedbackText(state, "Nina")).toContain("Nina");
  });

  it("só manda recompensar no sucesso", () => {
    const session = sitSession();
    const state = feed(session, "sitting", 70);
    expect(feedbackText(state, "Nina")).toContain("Recompense");
  });

  it("nunca manda recompensar quando não sabe", () => {
    const session = sitSession();
    const state = feed(session, "unknown", 10);
    expect(feedbackText(state, "Nina")).not.toContain("Recompense");
  });
});
