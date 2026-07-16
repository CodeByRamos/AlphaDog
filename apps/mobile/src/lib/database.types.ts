/**
 * Tipos do banco, espelhando supabase/migrations/0001_mobile_core.sql.
 *
 * Escrito à mão em vez de gerado: o schema é pequeno e estável, e depender do
 * `supabase gen types` exigiria a CLI logada no CI. Se a migration mudar, este
 * arquivo muda junto — o teste de integração pega a divergência.
 */

import type {
  AgeGroup,
  Difficulty,
  EnergyLevel,
  ExperienceLevel,
  Gender,
  Goal,
} from "@alphadog/core";
import type { ExerciseId } from "@alphadog/core";

export type DogRow = {
  id: string;
  owner_id: string;
  name: string;
  breed_slug: string | null;
  age_group: AgeGroup;
  gender: Gender | null;
  weight_grams: number | null;
  energy_level: EnergyLevel;
  experience_level: ExperienceLevel;
  difficulties: Difficulty[];
  goal: Goal;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionRow = {
  id: string;
  dog_id: string;
  owner_id: string;
  exercise_id: ExerciseId;
  success_count: number;
  total_reps: number;
  duration_seconds: number;
  success_rate: number;
  completed: boolean;
  started_at: string;
  ended_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      dogs: {
        Row: DogRow;
        Insert: Omit<DogRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
        };
        Update: Partial<Omit<DogRow, "id" | "owner_id" | "created_at">>;
      };
      training_sessions: {
        Row: SessionRow;
        Insert: Omit<SessionRow, "id" | "started_at"> & {
          id?: string;
          started_at?: string;
        };
        Update: Partial<Omit<SessionRow, "id" | "owner_id" | "dog_id">>;
      };
    };
  };
};
