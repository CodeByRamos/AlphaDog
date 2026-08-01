import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { color, radius, space } from "../../theme";
import type { DetectorStatus } from "../../vision/detector";

/**
 * Selo permanente de estado da IA, no topo da tela de treino.
 *
 * Existe porque foi relatado que "a IA não parece estar integrada" — com o
 * modelo carregando corretamente no aparelho. E o relato era justo: em produção
 * a leitura de confiança e os keypoints ficam atrás de `__DEV__`, então o único
 * sinal visível de que o modelo trabalha era a caixa aparecer em volta do cão.
 * Se o cão está fora do quadro, ou a luz está ruim, não aparece caixa — e não
 * existe nada na tela que distinga "a IA está olhando e não achou" de "não tem
 * IA nenhuma aqui".
 *
 * Este selo elimina a ambiguidade: diz se o modelo carregou, qual acelerador
 * aceitou ele, e quantos frames por segundo estão sendo analisados AGORA.
 * Número que sobe é prova; texto de marketing não é.
 */

type Props = {
  detector: DetectorStatus;
  /** Frames analisados por segundo, medido na própria tela. */
  fps: number;
  /** Confiança da última detecção, ou null quando não há cão no quadro. */
  confidence: number | null;
  /** A trava de segurança desligou a análise neste aparelho. */
  blocked: boolean;
};

export function VisionStatusPill({ detector, fps, confidence, blocked }: Props) {
  const { icon, tint, label } = describe(detector, fps, confidence, blocked);

  return (
    <View style={[styles.pill, { borderColor: tint }]}>
      <Ionicons name={icon} size={13} color={tint} />
      <Text style={[styles.text, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function describe(
  detector: DetectorStatus,
  fps: number,
  confidence: number | null,
  blocked: boolean,
): { icon: keyof typeof Ionicons.glyphMap; tint: string; label: string } {
  if (blocked) {
    return {
      icon: "shield-outline",
      tint: color.warn500,
      label: "IA desligada neste aparelho",
    };
  }

  if (detector.kind === "loading") {
    return { icon: "sync-outline", tint: color.ink300, label: "Carregando IA…" };
  }

  if (detector.kind === "unavailable") {
    return { icon: "alert-circle-outline", tint: color.warn500, label: "IA indisponível" };
  }

  // Pronta, mas ainda sem frame processado: a câmera acabou de abrir.
  if (fps <= 0) {
    return {
      icon: "eye-outline",
      tint: color.ink300,
      label: `IA pronta · ${detector.accelerator}`,
    };
  }

  // Analisando. Sem cão no quadro o FPS continua contando — é o que prova que a
  // ausência de caixa é resultado da análise, e não falta de análise.
  return {
    icon: "eye",
    tint: confidence == null ? color.alpha500 : color.sage400,
    label:
      confidence == null
        ? `IA analisando · ${fps} fps · procurando`
        : `IA analisando · ${fps} fps · cão ${Math.round(confidence * 100)}%`,
  };
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  text: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.2,
    fontVariant: ["tabular-nums"],
  },
});
