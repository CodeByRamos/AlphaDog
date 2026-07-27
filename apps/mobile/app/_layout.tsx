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
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { UpdateBanner } from "../src/features/updates/UpdateBanner";
import { AuthProvider } from "../src/state/auth";
import { color } from "../src/theme";

// Segura o splash até as fontes carregarem. Sem isto o app pisca com a fonte do
// sistema antes de trocar — o "flash of unstyled text" que denuncia app amador.
SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    // Esconde no erro também: app sem fonte bonita é melhor que app travado no
    // splash para sempre.
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Fora dos providers: se a própria inicialização do Supabase ou do
            React Query falhar, ainda existe uma tela para mostrar o erro. */}
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
