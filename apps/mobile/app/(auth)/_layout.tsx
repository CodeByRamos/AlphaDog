import { Stack } from "expo-router";
import { color } from "../../src/theme";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.ink900 },
        // Sem gesto de voltar no onboarding: deslizar para trás no meio do
        // questionário deixaria o usuário numa tela de login que ele já passou.
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
