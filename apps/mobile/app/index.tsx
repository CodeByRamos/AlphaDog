import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Screen } from "../src/components/Screen";
import { listDogs } from "../src/data/dogs";
import { useSubscription } from "../src/features/subscription/useSubscription";
import { SUPABASE_CONFIG_HELP, isSupabaseConfigured } from "../src/lib/supabase";
import { useAuth } from "../src/state/auth";
import { color, space, type } from "../src/theme";

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
    // Só busca cães depois de saber que o acesso está liberado — e nunca sem
    // configuração, senão cada render dispararia uma requisição condenada.
    enabled: isSupabaseConfigured && !!session && isActive,
  });

  // Build sem as chaves do Supabase: nada abaixo daqui funcionaria, e cada tela
  // falharia de um jeito diferente. Dizer o que houve, uma vez, é mais útil que
  // deixar o tutor descobrir por tentativa.
  //
  // Depois dos hooks, não antes: sair mais cedo mudaria a quantidade de hooks
  // entre renders, que é justamente o que quebra a ordem interna do React.
  if (!isSupabaseConfigured) {
    return (
      <Screen style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={44} color={color.alpha500} />
        <Text style={[type.title, styles.title]}>App não configurado</Text>
        <Text style={[type.body, styles.body]}>
          Este build saiu sem as credenciais do servidor. Não é problema do seu
          aparelho nem da sua conta.
        </Text>
        {__DEV__ && <Text style={styles.help}>{SUPABASE_CONFIG_HELP}</Text>}
      </Screen>
    );
  }

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

const styles = StyleSheet.create({
  center: { justifyContent: "center", alignItems: "center", padding: space.xl, gap: space.lg },
  title: { color: color.bone, textAlign: "center" },
  body: { color: color.ink400, textAlign: "center" },
  help: {
    ...type.caption,
    color: color.ink500,
    backgroundColor: color.ink800,
    padding: space.lg,
    borderRadius: 12,
  },
});
