import type { PlanId, Subscription } from "@alphadog/core";
import { supabase } from "../lib/supabase";
import type { SubscriptionRow } from "../lib/database.types";

/**
 * Acesso à assinatura do usuário.
 *
 * O RLS garante que a única linha visível é a do próprio usuário, então não há
 * filtro por user_id aqui — filtrar no cliente daria a falsa impressão de que é
 * o app quem protege. O app só lê: quem escreve é o webhook do gateway.
 */

function toDomain(row: SubscriptionRow): Subscription {
  return {
    status: row.status,
    planId: (row.plan_id as PlanId | null) ?? null,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
  };
}

/** A assinatura do usuário, ou null se ele nunca teve uma. */
export async function getMySubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .maybeSingle();

  // maybeSingle devolve null sem erro quando não há linha — o caso do usuário
  // recém-cadastrado que ainda não assinou.
  if (error) throw error;
  return data ? toDomain(data) : null;
}
