import { StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, space } from "../theme";

type Props = {
  children: React.ReactNode;
  /** Aplica o inset de baixo. Desligue quando houver uma barra fixa própria. */
  bottomInset?: boolean;
  style?: ViewStyle;
};

/**
 * Casca de tela.
 *
 * Centraliza o fundo e as áreas seguras. Sem isto, cada tela repetiria o
 * cálculo de inset — e alguma esqueceria, deixando o conteúdo sob o notch.
 */
export function Screen({ children, bottomInset = true, style }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          paddingBottom: bottomInset ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.ink900,
  },
});

export const screenPadding = space.xl;
