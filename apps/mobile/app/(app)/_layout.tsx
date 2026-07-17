import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { color, font, space } from "../../src/theme";

export default function AppLayout() {
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
