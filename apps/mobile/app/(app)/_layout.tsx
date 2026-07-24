import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useSubscription } from "../../src/features/subscription/useSubscription";
import { useAuth } from "../../src/state/auth";
import { color, font, space } from "../../src/theme";

export default function AppLayout() {
  const { session, ready } = useAuth();
  const { loading, isActive } = useSubscription();

  // Defesa em profundidade: o Gate já manda para /subscribe, mas um deep link
  // pode cair direto aqui. Só redireciona quando temos certeza (resolvido e sem
  // acesso) — enquanto carrega, deixa montar para não piscar a UI.
  if (ready && session && !loading && !isActive) {
    return <Redirect href="/subscribe" />;
  }
  if (ready && !session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.alpha500,
        tabBarInactiveTintColor: color.ink500,
        tabBarStyle: {
          backgroundColor: color.ink950,
          borderTopColor: color.ink800,
          borderTopWidth: 1,
          height: 62 + space.lg,
          paddingTop: space.sm,
          paddingBottom: space.lg,
        },
        tabBarLabelStyle: { fontFamily: font.bodySemi, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Treinar",
          tabBarIcon: ({ color: c, size }) => <Ionicons name="home" size={size} color={c} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Progresso",
          tabBarIcon: ({ color: c, size }) => (
            <Ionicons name="stats-chart" size={size} color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color: c, size }) => <Ionicons name="paw" size={size} color={c} />,
        }}
      />
    </Tabs>
  );
}
