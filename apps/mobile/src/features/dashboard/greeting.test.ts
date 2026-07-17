import type { DogStats } from "@alphadog/core";
import { describe, expect, it } from "vitest";
import { dashboardHighlight, greeting, relativeDay } from "./greeting";

function stats(patch: Partial<DogStats> = {}): DogStats {
  return {
    totalSessions: 10,
    totalMinutes: 100,
    overallSuccessRate: 0.8,
    streakDays: 1,
    masteredExercises: [],
    sessionsThisWeek: 3,
    lastSession: null,
    ...patch,
  };
}

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

describe("saudação", () => {
  it("cobre o dia inteiro", () => {
    expect(greeting(6)).toBe("Bom dia");
    expect(greeting(11)).toBe("Bom dia");
    expect(greeting(12)).toBe("Boa tarde");
    expect(greeting(17)).toBe("Boa tarde");
    expect(greeting(18)).toBe("Boa noite");
    expect(greeting(23)).toBe("Boa noite");
  });
});

describe("destaque do dashboard", () => {
  it("cão novo é convidado a começar", () => {
    const h = dashboardHighlight(stats({ totalSessions: 0 }), "Nina");
    expect(h.tone).toBe("welcome");
    expect(h.headline).toContain("Nina");
  });

  it("sequência quebrada convida, não cobra", () => {
    // "Você não treinou há 5 dias" faz fechar o app.
    const h = dashboardHighlight(stats({ streakDays: 0 }), "Rex");
    expect(h.tone).toBe("comeback");
    expect(h.headline).toContain("Rex");
    expect(h.headline).not.toMatch(/não treinou|perdeu|falhou/i);
  });

  it("celebra a sequência longa", () => {
    const h = dashboardHighlight(stats({ streakDays: 12 }), "Nina");
    expect(h.tone).toBe("streak");
    expect(h.headline).toContain("12");
  });

  it("sequência curta empurra para o próximo dia", () => {
    const h = dashboardHighlight(stats({ streakDays: 3 }), "Nina");
    expect(h.tone).toBe("streak");
  });

  it("nenhuma mensagem culpa o tutor", () => {
    for (const streak of [0, 1, 3, 30]) {
      for (const total of [0, 5]) {
        const h = dashboardHighlight(stats({ streakDays: streak, totalSessions: total }), "Nina");
        expect(h.headline + h.sub).not.toMatch(/deveria|preguiç|desistiu|falhou/i);
      }
    }
  });
});

describe("dia relativo", () => {
  it("hoje", () => {
    expect(relativeDay(new Date().toISOString())).toBe("hoje");
  });

  it("ontem", () => {
    expect(relativeDay(daysAgo(1))).toBe("ontem");
  });

  it("dias", () => {
    expect(relativeDay(daysAgo(3))).toBe("há 3 dias");
  });

  it("semanas", () => {
    expect(relativeDay(daysAgo(8))).toBe("há uma semana");
    expect(relativeDay(daysAgo(15))).toBe("há 2 semanas");
  });

  it("meses", () => {
    expect(relativeDay(daysAgo(31))).toBe("há um mês");
    expect(relativeDay(daysAgo(70))).toBe("há 2 meses");
  });

  it("usa dia de calendário, não 24h", () => {
    // Treino às 23h de ontem, agora são 8h. São 9 horas, mas é "ontem" —
    // dizer "hoje" confundiria.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 0, 0, 0);
    expect(relativeDay(yesterday.toISOString())).toBe("ontem");
  });
});
