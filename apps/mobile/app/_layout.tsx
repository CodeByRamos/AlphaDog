import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { UpdateBanner } from "../src/features/updates/UpdateBanner";
import { AuthProvider } from "../src/state/auth";
import { color } from "../src/theme";

// Segura o splash até as fontes carregarem — sem isto o app pisca com a fonte
// do sistema antes de trocar. O `.catch` importa: se a chamada falhar e a
// promessa ficar sem tratamento, alguns aparelhos derrubam o processo no boot.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Teto de espera pelas fontes.
 *
 * Existe porque a tela de abertura ficou congelada em produção: `useFonts` não
 * resolvia, o componente devolvia null indefinidamente, e como NADA era
 * renderizado o ErrorBoundary nem chegava a montar para mostrar o problema. O
 * usuário via o logo parado, sem mensagem, para sempre.
 *
 * Passado este tempo o app abre de qualquer jeito. Fonte do sistema é um
 * detalhe estético; app que não abre é o produto inteiro.
 */
const FONT_TIMEOUT_MS = 4000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // O tutor abre o app entre uma repetição e outra: refetch a cada foco
      // gastaria dados sem trazer novidade.
      staleTime: 30_000,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Sora_700Bold,
    Sora_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // Três caminhos para abrir, e nenhum deles pode faltar: fontes prontas, erro
  // ao carregá-las, ou tempo esgotado.
  const ready = loaded || !!error || timedOut;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Fora dos providers: se a inicialização do Supabase ou do React Query
            falhar, ainda existe uma tela para mostrar o erro. */}
        <ErrorBoundary label="root">
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <StatusBar style="light" />
              {/* Fora do Stack: sem loja para avisar de versão nova, esta faixa
                  precisa aparecer em qualquer tela, não só na inicial. */}
              <UpdateBanner />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: color.ink900 },
                  animation: "slide_from_right",
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="subscribe" />
                <Stack.Screen name="(app)" />
                <Stack.Screen
                  name="training/[exercise]"
                  options={{
                    // Treino é imersivo: entra de baixo, como um modal, e sai do
                    // fluxo de navegação normal.
                    presentation: "fullScreenModal",
                    animation: "slide_from_bottom",
                    gestureEnabled: false,
                  }}
                />
              </Stack>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
