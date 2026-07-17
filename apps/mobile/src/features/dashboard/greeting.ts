import type { DogStats } from "@alphadog/core";

/**
 * A linha de destaque do dashboard.
 *
 * Puro e testável de propósito: é a primeira coisa que o tutor lê ao abrir o
 * app, e a regra de qual mensagem aparece quando é decisão de produto, não de
 * layout.
 *
 * Nenhuma mensagem culpa o tutor. "Você não treinou há 5 dias" faz a pessoa
 * fechar o app; "o Rex está com saudade" faz ela treinar.
 */
export function greeting(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export type Highlight = {
  headline: string;
  sub: string;
  tone: "streak" | "welcome" | "comeback" | "progress";
};

export function dashboardHighlight(stats: DogStats, dogName: string): Highlight {
  if (stats.totalSessions === 0) {
    return {
      headline: `Vamos começar com ${dogName}`,
      sub: "A primeira sessão leva 10 minutos.",
      tone: "welcome",
    };
  }

  // Sequência quebrada. Nada de cobrança: convite.
  if (stats.streakDays === 0) {
    return {
      headline: `${dogName} está com saudade`,
      sub: "Dez minutos hoje já retomam o ritmo.",
      tone: "comeback",
    };
  }

  if (stats.streakDays >= 7) {
    return {
      headline: `${stats.streakDays} dias seguidos`,
      sub: "Constância é o que treina cão. Você está fazendo certo.",
      tone: "streak",
    };
  }

  if (stats.streakDays > 1) {
    return {
      headline: `${stats.streakDays} dias seguidos`,
      sub: "Mais um dia e vira hábito.",
      tone: "streak",
    };
  }

  return {
    headline: "Treino de hoje feito",
    sub: "Volte amanhã para manter a sequência.",
    tone: "progress",
  };
}

/** Rótulo relativo para "última sessão". */
export function relativeDay(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const days = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()) /
      (24 * 60 * 60 * 1000),
  );

  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "há uma semana" : `há ${weeks} semanas`;
  }
  const months = Math.floor(days / 30);
  return months === 1 ? "há um mês" : `há ${months} meses`;
}
