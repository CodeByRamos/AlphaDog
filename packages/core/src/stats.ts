/**
 * Estatísticas de treino.
 *
 * Funções puras sobre o histórico. Vivem no core, e não na camada de dados do
 * app, por dois motivos: são domínio (a regra de "dominado" é decisão de
 * produto, não de banco), e um teste delas não deve precisar carregar o cliente
 * Supabase — que puxa React Native junto e não roda em Node.
 */

import type { ExerciseId } from "./exercise";

/** Uma sessão gravada. Espelha training_sessions, sem o formato do banco. */
export type TrainingRecord = {
  id: string;
  dogId: string;
  exerciseId: ExerciseId;
  successCount: number;
  totalReps: number;
  durationSeconds: number;
  successRate: number;
  completed: boolean;
  startedAt: string;
  endedAt: string | null;
};

export type DogStats = {
  totalSessions: number;
  totalMinutes: number;
  /** 0..1 sobre todas as repetições já tentadas. */
  overallSuccessRate: number;
  /** Dias seguidos com ao menos uma sessão, contando de hoje para trás. */
  streakDays: number;
  masteredExercises: ExerciseId[];
  sessionsThisWeek: number;
  lastSession: TrainingRecord | null;
};

/** Sessões boas necessárias para considerar um exercício dominado. */
export const MASTERY_SESSIONS = 3;

/** Taxa mínima para uma sessão contar como boa. */
export const MASTERY_RATE = 0.8;

/** Dia local, para agrupar. UTC agruparia errado o treino da noite. */
function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function computeStats(sessions: TrainingRecord[]): DogStats {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalMinutes: 0,
      overallSuccessRate: 0,
      streakDays: 0,
      masteredExercises: [],
      sessionsThisWeek: 0,
      lastSession: null,
    };
  }

  const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const totalSuccess = sessions.reduce((sum, s) => sum + s.successCount, 0);
  const totalAttempted = sessions.reduce((sum, s) => sum + s.totalReps, 0);

  const days = new Set(sessions.map((s) => localDay(s.startedAt)));
  let streakDays = 0;
  const cursor = new Date();

  // Ainda não treinou hoje mas treinou ontem: a sequência vale. Zerar às 9h da
  // manhã puniria o tutor por um dia que nem acabou.
  if (!days.has(localDay(cursor.toISOString()))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(localDay(cursor.toISOString()))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const byExercise = new Map<ExerciseId, TrainingRecord[]>();
  for (const s of sessions) {
    const list = byExercise.get(s.exerciseId) ?? [];
    list.push(s);
    byExercise.set(s.exerciseId, list);
  }

  const masteredExercises: ExerciseId[] = [];
  for (const [exercise, list] of byExercise) {
    // Três sessões boas, não uma: uma é sorte, três é aprendizado.
    const good = list.filter((s) => s.successRate >= MASTERY_RATE);
    if (good.length >= MASTERY_SESSIONS) masteredExercises.push(exercise);
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const sessionsThisWeek = sessions.filter(
    (s) => new Date(s.startedAt).getTime() >= weekAgo,
  ).length;

  return {
    totalSessions: sessions.length,
    totalMinutes: Math.round(totalSeconds / 60),
    // Agrega sobre repetições, não média de médias: uma sessão de 10 reps pesa
    // mais que uma de 2.
    overallSuccessRate: totalAttempted > 0 ? totalSuccess / totalAttempted : 0,
    streakDays,
    masteredExercises,
    sessionsThisWeek,
    lastSession: sessions[0] ?? null,
  };
}

/** Sessões por dia nos últimos 7 dias, do mais antigo ao mais novo. */
export function weeklyActivity(sessions: TrainingRecord[]): number[] {
  const counts = new Array<number>(7).fill(0);
  const today = new Date();

  for (const session of sessions) {
    const diff = Math.floor(
      (today.getTime() - new Date(session.startedAt).getTime()) / (24 * 60 * 60 * 1000),
    );
    if (diff >= 0 && diff < 7) {
      const slot = 6 - diff;
      counts[slot] = (counts[slot] ?? 0) + 1;
    }
  }
  return counts;
}

/** Próximo exercício recomendado. */
export function recommendExercise(
  stats: DogStats,
  available: ExerciseId[],
): ExerciseId | null {
  if (available.length === 0) return null;

  // Nunca treinou: começa pelo primeiro, que é o mais fácil.
  if (stats.totalSessions === 0) return available[0] ?? null;

  // Prioriza o que ainda não dominou, na ordem do catálogo (fácil → difícil).
  const pending = available.filter((id) => !stats.masteredExercises.includes(id));
  if (pending.length > 0) return pending[0] ?? null;

  // Dominou tudo: revisa o que ficou mais tempo sem treino.
  return stats.lastSession
    ? (available.find((id) => id !== stats.lastSession?.exerciseId) ?? available[0] ?? null)
    : (available[0] ?? null);
}
