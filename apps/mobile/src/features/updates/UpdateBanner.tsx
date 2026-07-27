import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, space, type } from "../../theme";
import { useAppUpdate } from "./useAppUpdate";

/**
 * Aviso de versão nova.
 *
 * Aparece só quando já existe atualização BAIXADA — nada de "verificando" ou
 * "há uma versão disponível, aguarde". O tutor abre o app para treinar o cão,
 * não para administrar software: quando ele toca, a troca é instantânea.
 *
 * Some sozinho se ignorado? Não: a faixa fica, discreta, até ser usada. Sem
 * loja para insistir, esta é a única chance de o usuário sair de uma versão com
 * bug.
 */
export function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const { ready, apply } = useAppUpdate();

  if (!ready) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(280)}
      exiting={FadeOutUp.duration(160)}
      style={[styles.root, { paddingTop: insets.top + space.sm }]}
    >
      <View style={styles.row}>
        <Ionicons name="sparkles" size={16} color={color.ink900} />
        <Text style={styles.text}>Nova versão pronta</Text>
        <Pressable
          onPress={apply}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Atualizar o aplicativo agora"
          style={styles.button}
        >
          <Text style={styles.buttonText}>Atualizar</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: color.alpha500,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  text: { ...type.label, color: color.ink900, flex: 1 },
  button: {
    backgroundColor: color.ink900,
    paddingHorizontal: space.lg,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  buttonText: { ...type.label, color: color.alpha400 },
});
