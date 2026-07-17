import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { listDogs } from "../src/data/dogs";
import { useAuth } from "../src/state/auth";
import { color } from "../src/theme";

/**
 * Porta de entrada: decide para onde o app abre.
 *
 * Três estados, nesta ordem:
 *   sem sessão            -> login
 *   com sessão, sem cão   -> onboarding
 *   com sessão e cão      -> dashboard
 *
 * A decisão vive aqui, e não espalhada em cada tela, para não haver duas telas
 * discordando sobre quem redireciona quem — que é como se cria um loop de
 * navegação.
 */
export default function Gate() {
  const { session, ready } = useAuth();

  const dogs = useQuery({
    queryKey: ["dogs"],
    queryFn: listDogs,
    // Sem sessão o RLS devolveria vazio de qualquer jeito; não gasta a query.
    enabled: !!session,
  });

  const deciding = !ready || (!!session && dogs.isLoading);

  if (deciding) {
    return (
      <View style={{ flex: 1, backgroundColor: color.ink900, justifyContent: "center" }}>
        <ActivityIndicator color={color.alpha500} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if ((dogs.data ?? []).length === 0) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(app)/home" />;
}
