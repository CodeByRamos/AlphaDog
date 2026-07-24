import { isSubscriptionActive, type Subscription } from "@alphadog/core";
import { useQuery } from "@tanstack/react-query";
import { getMySubscription } from "../../data/subscription";
import { useAuth } from "../../state/auth";

export type SubscriptionState = {
  /** Ainda carregando a resposta do banco. */
  loading: boolean;
  /** A assinatura crua, ou null se nunca houve uma. */
  subscription: Subscription | null;
  /** A pergunta que o gate faz: pode usar o app? */
  isActive: boolean;
};

/**
 * Estado de assinatura do usuário logado.
 *
 * `isActive` é calculado aqui, uma vez, com o relógio de agora — as telas não
 * repetem a regra de "ativa". Enquanto carrega, `isActive` é false: o gate
 * segura na tela de carregamento em vez de deixar passar por um instante e
 * depois expulsar, que pisca a UI.
 */
export function useSubscription(): SubscriptionState {
  const { session } = useAuth();

  const query = useQuery({
    queryKey: ["subscription", session?.user.id],
    queryFn: getMySubscription,
    enabled: !!session,
    // Acesso é sensível: revalida ao voltar para o app, caso o pagamento tenha
    // entrado (ou a assinatura expirado) enquanto estava fora.
    staleTime: 15_000,
  });

  const subscription = query.data ?? null;

  return {
    loading: !!session && query.isLoading,
    subscription,
    isActive: isSubscriptionActive(subscription, Date.now()),
  };
}
