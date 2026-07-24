/**
 * Tipos do banco, espelhando supabase/migrations/0001_mobile_core.sql.
 *
 * Escrito à mão em vez de gerado: o schema é pequeno e estável, e depender do
 * `supabase gen types` exigiria a CLI logada no CI. Se a migration mudar, este
 * arquivo muda junto.
 *
 * O `Relationships: []` não é decoração — o supabase-js exige a chave para
 * casar com o genérico dele. Sem ela, a inferência colapsa para `never` e todo
 * insert vira erro de tipo.
 */

import type {
  AgeGroup,
  Difficulty,
  EnergyLevel,
  ExerciseId,
  ExperienceLevel,
  Gender,
  Goal,
  SubscriptionStatus,
} from "@alphadog/core";

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

export type SubscriptionRow = {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  plan_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  payment_method: string | null;
  gateway_customer_id: string | null;
  gateway_subscription_id: string | null;
  created_at: string;
  updated_at: string;
};

/** O que o banco preenche sozinho — opcional no insert. */
type DogInsert = Omit<DogRow, "id" | "created_at" | "updated_at"> &
  Partial<Pick<DogRow, "id" | "created_at" | "updated_at">>;

type SessionInsert = Omit<SessionRow, "id" | "started_at"> &
  Partial<Pick<SessionRow, "id" | "started_at">>;

export type Database = {
  public: {
    Tables: {
      dogs: {
        Row: DogRow;
        Insert: DogInsert;
        // owner_id fora do Update: mudar o dono de um cão não é operação que o
        // app deva expor, e o RLS negaria de qualquer forma.
        Update: Partial<Omit<DogRow, "id" | "owner_id" | "created_at">>;
        Relationships: [];
      };
      training_sessions: {
        Row: SessionRow;
        Insert: SessionInsert;
        Update: Partial<Omit<SessionRow, "id" | "owner_id" | "dog_id">>;
        Relationships: [];
      };
      // Só leitura pelo app: o webhook (service_role) é quem escreve. Insert e
      // Update ficam como `never` para o tipo refletir o RLS — tentar gravar
      // daqui é erro de compilação, não só de runtime.
      subscriptions: {
        Row: SubscriptionRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      dog_age_group: AgeGroup;
      dog_gender: Gender;
      dog_energy: EnergyLevel;
      dog_experience: ExperienceLevel;
      training_goal: Goal;
      exercise_id: ExerciseId;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};
