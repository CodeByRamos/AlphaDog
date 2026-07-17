import type { SessionResult, TrainingRecord } from "@alphadog/core";
import { supabase } from "../lib/supabase";
import type { SessionRow } from "../lib/database.types";

/**
 * Acesso às sessões de treino.
 *
 * Só I/O. As estatísticas (computeStats, weeklyActivity, recommendExercise)
 * vivem em @alphadog/core: são domínio, e um teste delas não deve precisar
 * carregar o cliente Supabase — que puxa React Native e não roda em Node.
 */

function toDomain(row: SessionRow): TrainingRecord {
  return {
    id: row.id,
    dogId: row.dog_id,
    exerciseId: row.exercise_id,
    successCount: row.success_count,
    totalReps: row.total_reps,
    durationSeconds: row.duration_seconds,
    successRate: row.success_rate,
    completed: row.completed,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export async function listSessions(dogId: string, limit = 50): Promise<TrainingRecord[]> {
  const { data, error } = await supabase
    .from("training_sessions")
    .select("*")
    .eq("dog_id", dogId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(toDomain);
}

export async function saveSession(
  dogId: string,
  ownerId: string,
  result: SessionResult,
  completed: boolean,
): Promise<TrainingRecord> {
  const { data, error } = await supabase
    .from("training_sessions")
    .insert({
      dog_id: dogId,
      owner_id: ownerId,
      exercise_id: result.exerciseId,
      success_count: result.successCount,
      total_reps: result.totalReps,
      duration_seconds: result.durationSeconds,
      success_rate: result.successRate,
      completed,
      ended_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return toDomain(data);
}
