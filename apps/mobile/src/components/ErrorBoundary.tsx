import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { Screen, screenPadding } from "./Screen";
import { color, radius, space, type } from "../theme";

/**
 * Última linha de defesa contra tela branca.
 *
 * Sem isto, uma exceção em qualquer render derruba a árvore inteira e o tutor vê
 * um retângulo branco sem explicação nem saída — o pior desfecho possível, e o
 * que mais destrói confiança numa demonstração.
 *
 * Precisa ser classe: `componentDidCatch` não tem equivalente em hook.
 *
 * Não engole o erro em silêncio. Em desenvolvimento mostra a mensagem e a pilha,
 * porque esconder detalhe de quem está consertando só atrasa; em produção mostra
 * texto humano e um caminho de volta.
 */

type Props = {
  children: React.ReactNode;
  /** Nome do trecho protegido, para a mensagem e o log. */
  label?: string;
};

type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Vai para o console do Metro em dev e para o logcat/Console em produção.
    // Quando houver Sentry ou equivalente, é aqui que ele entra.
    console.error(
      `[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`,
      error,
      info.componentStack,
    );
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.icon}>
            <Ionicons name="alert-circle" size={38} color={color.alpha500} />
          </View>

          <Text style={[type.title, styles.title]}>Algo deu errado aqui</Text>
          <Text style={[type.body, styles.body]}>
            Esta tela travou, mas o resto do app continua funcionando. Seus
            treinos e o progresso do seu cão estão salvos.
          </Text>

          {__DEV__ && (
            <View style={styles.debug}>
              <Text style={styles.debugTitle}>{error.name}</Text>
              <Text style={styles.debugText}>{error.message}</Text>
              {error.stack ? (
                <Text style={styles.debugStack} numberOfLines={12}>
                  {error.stack}
                </Text>
              ) : null}
            </View>
          )}

          <Button
            label="Tentar de novo"
            onPress={() => this.setState({ error: null })}
          />
        </ScrollView>
      </Screen>
    );
  }
}
const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: screenPadding,
    gap: space.lg,
  },
  icon: {
    alignSelf: "center",
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: "rgba(240,167,60,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: color.bone, textAlign: "center" },
  body: { color: color.ink400, textAlign: "center" },
  debug: {
    backgroundColor: color.ink800,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.xs,
  },
  debugTitle: { ...type.label, color: color.warn500 },
  debugText: { ...type.bodySmall, color: color.ink200 },
  debugStack: { ...type.caption, color: color.ink400, marginTop: space.sm },
});
