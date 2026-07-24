import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { listDogs } from "../src/data/dogs";
import { useSubscription } from "../src/features/subscription/useSubscription";
import { useAuth } from "../src/state/auth";
import { color } from "../src/theme";

/**
 * Porta de entrada: decide para onde o app abre.
 *
 * Quatro estados, nesta ordem:
 *   sem sessão              -> login
 *   sem assinatura ativa    -> tela de assinatura (o app é 100% pago)
 *   com acesso, sem cão     -> onboarding
 *   com acesso e cão        -> dashboard
 *
 * A decisão vive aqui, e não espalhada em cada tela, para não haver duas telas
 * discordando sobre quem redireciona quem — que é como se cria um loop de
 * navegação. A assinatura vem antes do onboarding: criar o cão já é usar o app,
 * e usar o app exige pagar.
 */
export default function Gate() {
  const { session, ready } = useAuth();
  const { loading: subLoading, isActive } = useSubscription();

  const dogs = useQuery({
    queryKey: ["dogs"],
    queryFn: listDogs,
    // Só busca cães depois de saber que o acesso está liberado. Sem assinatura,
    // a tela nem chega no dashboard, então a query seria desperdício.
    enabled: !!session && isActive,
  });

  const deciding =
    !ready ||
    (!!session && subLoading) ||
    (!!session && isActive && dogs.isLoading);

  if (deciding) {
    return (
      <View style={{ flex: 1, backgroundColor: color.ink900, justifyContent: "center" }}>
        <ActivityIndicator color={color.alpha500} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!isActive) return <Redirect href="/subscribe" />;
  if ((dogs.data ?? []).length === 0) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(app)/home" />;
}
