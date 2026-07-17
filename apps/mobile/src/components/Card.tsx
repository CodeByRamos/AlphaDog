import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "../theme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Superfície elevada, para o card principal da tela. */
  raised?: boolean;
};

export function Card({ children, style, raised }: Props) {
  return <View style={[styles.card, raised && styles.raised, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.ink800,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.ink700,
  },
  // Num tema escuro, sombra quase não aparece. Elevação se faz com borda mais
  // clara e fundo um degrau acima — é assim que o olho lê profundidade aqui.
  raised: {
    backgroundColor: color.ink700,
    borderColor: color.ink600,
  },
});
