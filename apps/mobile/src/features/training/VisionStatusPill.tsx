import { MIN_DETECTION_CONFIDENCE } from "@alphadog/core";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { color, radius, space } from "../../theme";
import type { DetectorStatus } from "../../vision/detector";
import type { VisionTelemetry } from "./useVisionRate";

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
  /**
   * Telemetria da última janela de um segundo.
   *
   * A confiança bruta é o número mais importante durante o diagnóstico: perto
   * de zero significa que o modelo não reconhece o que recebe; perto do limiar
   * significa que está quase, e o problema é calibragem.
   */
  telemetry: VisionTelemetry;
  /** A trava de segurança desligou a análise neste aparelho. */
  blocked: boolean;
  /** O tutor escolheu marcar os acertos por conta própria. */
  manual: boolean;
};

export function VisionStatusPill({ detector, telemetry, blocked, manual }: Props) {
  const { icon, tint, label } = describe(detector, telemetry, blocked, manual);

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
  telemetry: VisionTelemetry,
  blocked: boolean,
  manual: boolean,
): { icon: keyof typeof Ionicons.glyphMap; tint: string; label: string } {
  // Escolha do tutor vem antes de qualquer estado técnico: quem desligou a IA
  // de propósito não precisa ler sobre acelerador nem sobre trava de segurança.
  if (manual) {
    return { icon: "hand-left-outline", tint: color.ink300, label: "Modo manual" };
  }

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

  // Falha em todo frame é o cenário que antes ficava invisível: scanner
  // girando, nada detectado, nada no log. Vem antes de qualquer outra coisa.
  if (telemetry.failed > 0 && telemetry.analyzed === 0) {
    return {
      icon: "bug-outline",
      tint: color.warn500,
      label: `IA falhando · ${telemetry.failed} frames · toque`,
    };
  }

  // Pronta, mas ainda sem frame processado: a câmera acabou de abrir.
  if (telemetry.fps <= 0) {
    return {
      icon: "eye-outline",
      tint: color.ink300,
      label: `IA pronta · ${detector.accelerator}`,
    };
  }

  // Analisando. O FPS continua contando mesmo sem cão no quadro — é o que prova
  // que a ausência de caixa é RESULTADO da análise, e não falta de análise.
  //
  // A confiança aparece sempre, inclusive abaixo do limiar. Ela é a diferença
  // entre "o modelo olhou e não achou" e "o modelo recebeu lixo": um número que
  // reage ao que está na frente da câmera não pode ser interface simulada.
  const confidence = telemetry.bestConfidence;
  const pct = confidence == null ? 0 : Math.round(confidence * 100);
  const detected = confidence != null && confidence >= MIN_DETECTION_CONFIDENCE;

  return {
    icon: "eye",
    tint: detected ? color.sage400 : color.alpha500,
    label:
      `IA ${telemetry.fps} fps · ${telemetry.inferMs}ms · ` +
      `${detected ? "cão" : "melhor"} ${pct}%`,
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
