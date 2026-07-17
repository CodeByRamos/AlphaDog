/**
 * Contrato das estatísticas.
 *
 * Sequência e "dominado" são o que o tutor vê primeiro no dashboard. Errar aqui
 * é mentir sobre o progresso do cão dele.
 */

import { describe, expect, it } from "vitest";
import type { TrainingRecord } from "../src/stats";
import { computeStats, recommendExercise, weeklyActivity } from "../src/stats";

const DAY = 24 * 60 * 60 * 1000;

function record(opts: Partial<TrainingRecord> & { daysAgo?: number } = {}): TrainingRecord {
  const { daysAgo = 0, ...rest } = opts;
  const started = new Date(Date.now() - daysAgo * DAY);
  return {
    id: Math.random().toString(36).slice(2),
    dogId: "dog-1",
    exerciseId: "sit",
    successCount: 4,
    totalReps: 5,
    durationSeconds: 120,
    successRate: 0.8,
    completed: true,
    startedAt: started.toISOString(),
    endedAt: started.toISOString(),
    ...rest,
  };
}

describe("histórico vazio", () => {
  it("não divide por zero", () => {
    const stats = computeStats([]);
    expect(stats.totalSessions).toBe(0);
    expect(stats.overallSuccessRate).toBe(0);
    expect(stats.streakDays).toBe(0);
    expect(stats.lastSession).toBeNull();
  });
});

describe("sequência de dias", () => {
  it("conta dias seguidos a partir de hoje", () => {
    const stats = computeStats([
      record({ daysAgo: 0 }),
      record({ daysAgo: 1 }),
      record({ daysAgo: 2 }),
    ]);
    expect(stats.streakDays).toBe(3);
  });

  it("várias sessões no mesmo dia contam como um", () => {
    const stats = computeStats([
      record({ daysAgo: 0 }),
      record({ daysAgo: 0 }),
      record({ daysAgo: 0 }),
    ]);
    expect(stats.streakDays).toBe(1);
  });

  it("não pune quem ainda não treinou hoje", () => {
    // Treinou ontem e anteontem. Às 9h da manhã, zerar seria injusto.
    const stats = computeStats([record({ daysAgo: 1 }), record({ daysAgo: 2 })]);
    expect(stats.streakDays).toBe(2);
  });

  it("quebra no dia sem treino", () => {
    const stats = computeStats([
      record({ daysAgo: 0 }),
      record({ daysAgo: 1 }),
      // buraco no dia 2
      record({ daysAgo: 3 }),
    ]);
    expect(stats.streakDays).toBe(2);
  });

  it("sequência antiga não conta", () => {
    const stats = computeStats([
      record({ daysAgo: 14 }),
      record({ daysAgo: 15 }),
      record({ daysAgo: 16 }),
    ]);
    expect(stats.streakDays).toBe(0);
  });
});

describe("exercícios dominados", () => {
  it("três sessões boas contam", () => {
    const stats = computeStats([
      record({ exerciseId: "sit", successRate: 0.9 }),
      record({ exerciseId: "sit", successRate: 0.85 }),
      record({ exerciseId: "sit", successRate: 1 }),
    ]);
    expect(stats.masteredExercises).toContain("sit");
  });

  it("uma sessão boa não basta", () => {
    const stats = computeStats([record({ exerciseId: "sit", successRate: 1 })]);
    expect(stats.masteredExercises).not.toContain("sit");
  });

  it("sessões ruins não contam nem em quantidade", () => {
    const stats = computeStats([
      record({ exerciseId: "down", successRate: 0.4 }),
      record({ exerciseId: "down", successRate: 0.5 }),
      record({ exerciseId: "down", successRate: 0.6 }),
      record({ exerciseId: "down", successRate: 0.7 }),
    ]);
    expect(stats.masteredExercises).not.toContain("down");
  });

  it("separa por exercício", () => {
    const stats = computeStats([
      record({ exerciseId: "sit", successRate: 1 }),
      record({ exerciseId: "sit", successRate: 1 }),
      record({ exerciseId: "sit", successRate: 1 }),
      record({ exerciseId: "paw", successRate: 0.2 }),
    ]);
    expect(stats.masteredExercises).toEqual(["sit"]);
  });
});

describe("taxa de sucesso", () => {
  it("agrega sobre repetições, não média de médias", () => {
    // Uma sessão de 10 reps pesa mais que uma de 2.
    const stats = computeStats([
      record({ successCount: 10, totalReps: 10 }),
      record({ successCount: 0, totalReps: 2 }),
    ]);
    expect(stats.overallSuccessRate).toBeCloseTo(10 / 12);
  });
});

describe("minutos e semana", () => {
  it("soma a duração em minutos", () => {
    const stats = computeStats([
      record({ durationSeconds: 120 }),
      record({ durationSeconds: 180 }),
    ]);
    expect(stats.totalMinutes).toBe(5);
  });

  it("conta só os últimos sete dias", () => {
    const stats = computeStats([
      record({ daysAgo: 1 }),
      record({ daysAgo: 3 }),
      record({ daysAgo: 20 }),
    ]);
    expect(stats.sessionsThisWeek).toBe(2);
  });

  it("a última sessão é a primeira da lista", () => {
    const recent = record({ daysAgo: 0, exerciseId: "paw" });
    const stats = computeStats([recent, record({ daysAgo: 5 })]);
    expect(stats.lastSession?.exerciseId).toBe("paw");
  });
});

describe("atividade da semana", () => {
  it("devolve sete dias", () => {
    const activity = weeklyActivity([]);
    expect(activity).toHaveLength(7);
    expect(activity.every((n) => n === 0)).toBe(true);
  });

  it("hoje é a última posição", () => {
    const activity = weeklyActivity([record({ daysAgo: 0 })]);
    expect(activity[6]).toBe(1);
  });

  it("ignora o que passou de sete dias", () => {
    const activity = weeklyActivity([record({ daysAgo: 30 })]);
    expect(activity.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("soma várias no mesmo dia", () => {
    const activity = weeklyActivity([record({ daysAgo: 2 }), record({ daysAgo: 2 })]);
    expect(activity[4]).toBe(2);
  });
});

describe("recomendação", () => {
  const all = ["sit", "paw", "down"] as const;

  it("cão novo começa pelo mais fácil", () => {
    expect(recommendExercise(computeStats([]), [...all])).toBe("sit");
  });

  it("sugere o que ainda não dominou", () => {
    const stats = computeStats([
      record({ exerciseId: "sit", successRate: 1 }),
      record({ exerciseId: "sit", successRate: 1 }),
      record({ exerciseId: "sit", successRate: 1 }),
    ]);
    expect(recommendExercise(stats, [...all])).toBe("paw");
  });

  it("dominou tudo: sugere revisão diferente da última", () => {
    const stats = computeStats([
      ...all.flatMap((id) => [
        record({ exerciseId: id, successRate: 1, daysAgo: 1 }),
        record({ exerciseId: id, successRate: 1, daysAgo: 2 }),
        record({ exerciseId: id, successRate: 1, daysAgo: 3 }),
      ]),
    ]);
    const next = recommendExercise(stats, [...all]);
    expect(next).not.toBe(stats.lastSession?.exerciseId);
  });

  it("sem exercício disponível devolve null", () => {
    expect(recommendExercise(computeStats([]), [])).toBeNull();
  });
});
