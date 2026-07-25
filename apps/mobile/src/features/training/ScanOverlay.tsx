import type { Detection } from "@alphadog/core";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { color, easing, radius, space, type } from "../../theme";

/**
 * HUD de identificação do cão, antes do treino começar.
 *
 * Existe por dois motivos, um de produto e um de honestidade. O de produto: a
 * primeira coisa que o tutor vê ao abrir a câmera precisa comunicar que há uma
 * IA olhando — é o diferencial do AlphaDog e o momento em que ele decide se
 * confia no app. O de honestidade: enquanto o modelo procura, dizer "procurando"
 * é a verdade; fingir que já achou seria a mesma mentira do "Excelente!" sem o
 * cão ter sentado.
 *
 * Tudo anima em transform e opacity, na UI thread do Reanimated: não passa pela
 * ponte JS e sustenta 60fps mesmo com o frame processor rodando o YOLO na
 * thread da câmera.
 */

type Props = {
  /** Detecção mais recente do modelo, ou null enquanto não há cão no quadro. */
  detection: Detection | null;
  /** Já travou o alvo e o treino vai começar. */
  locked: boolean;
  /** Mostra a leitura de confiança — só em desenvolvimento. */
  debug?: boolean;
};

/** Cantos em L da mira. Desenhados em volta da área de interesse. */
function Bracket({
  corner,
  progress,
}: {
  corner: "tl" | "tr" | "bl" | "br";
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.45, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.94, 1]) }],
  }));

  const horizontal = corner === "tl" || corner === "bl" ? { left: 0 } : { right: 0 };
  const vertical = corner === "tl" || corner === "tr" ? { top: 0 } : { bottom: 0 };
  const borders = {
    borderTopWidth: corner === "tl" || corner === "tr" ? 3 : 0,
    borderBottomWidth: corner === "bl" || corner === "br" ? 3 : 0,
    borderLeftWidth: corner === "tl" || corner === "bl" ? 3 : 0,
    borderRightWidth: corner === "tr" || corner === "br" ? 3 : 0,
  };

  return (
    <Animated.View
      style={[styles.bracket, horizontal, vertical, borders, style]}
      pointerEvents="none"
    />
  );
}

/**
 * Partículas discretas subindo dentro da mira.
 *
 * Discretas de propósito: o objetivo é dar vida ao quadro sem competir com o
 * cão, que é o que o tutor precisa enxergar. Cada uma tem fase própria para o
 * conjunto não pulsar em bloco.
 */
function Particle({ index, height }: { index: number; height: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      index * 420,
      withRepeat(
        withTiming(1, { duration: 3600 + index * 260, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(t);
  }, [index, t]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.15, 0.8, 1], [0, 0.7, 0.5, 0]),
    transform: [
      { translateY: interpolate(t.value, [0, 1], [height, -20]) },
      { scale: interpolate(t.value, [0, 0.5, 1], [0.6, 1, 0.6]) },
    ],
  }));

  const left: `${number}%` = `${8 + ((index * 13) % 84)}%`;
  return <Animated.View style={[styles.particle, { left }, style]} pointerEvents="none" />;
}

export function ScanOverlay({ detection, locked, debug }: Props) {
  const { height } = useWindowDimensions();

  const sweep = useSharedValue(0);
  const bracket = useSharedValue(0);
  const reticle = useSharedValue(0);
  const lockPulse = useSharedValue(0);

  const found = detection !== null;

  // Varredura contínua enquanto procura; para ao travar o alvo, porque aí a
  // busca acabou e a animação passaria a mentir sobre o estado.
  useEffect(() => {
    if (locked) {
      cancelAnimation(sweep);
      sweep.value = withTiming(0, { duration: 240 });
      return;
    }
    sweep.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(sweep);
  }, [locked, sweep]);

  // Retícula girando devagar: sinal de "processando" que não pisca nem distrai.
  useEffect(() => {
    reticle.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(reticle);
  }, [reticle]);

  // Cantos apertam quando o cão entra no quadro — a mira "prende".
  useEffect(() => {
    bracket.value = withSpring(found ? 1 : 0, easing.spring);
  }, [found, bracket]);

  // Confirmação do alvo: um pulso único e háptico. Não repete, porque acontecer
  // uma vez é o que o torna significativo.
  useEffect(() => {
    if (!locked) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    lockPulse.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 520 }),
    );
  }, [locked, lockPulse]);

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sweep.value, [0, 0.08, 0.92, 1], [0, 0.9, 0.9, 0]),
    transform: [{ translateY: interpolate(sweep.value, [0, 1], [0, height * 0.52]) }],
  }));

  const reticleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(reticle.value, [0, 1], [0, 360])}deg` }],
  }));

  const lockStyle = useAnimatedStyle(() => ({
    opacity: lockPulse.value,
    transform: [{ scale: interpolate(lockPulse.value, [0, 1], [1.25, 1]) }],
  }));

  const accent = found ? color.sage400 : color.alpha500;

  return (
    <View style={styles.root} pointerEvents="none">
      {/* Área de mira, centralizada. */}
      <View style={styles.frame}>
        <Bracket corner="tl" progress={bracket} />
        <Bracket corner="tr" progress={bracket} />
        <Bracket corner="bl" progress={bracket} />
        <Bracket corner="br" progress={bracket} />

        {/* Retícula girando ao centro, só enquanto procura. */}
        {!found && (
          <Animated.View style={[styles.reticle, reticleStyle]} exiting={FadeOut}>
            <View style={[styles.reticleRing, { borderColor: color.alpha500 }]} />
            <View style={[styles.reticleTick, styles.tickTop]} />
            <View style={[styles.reticleTick, styles.tickBottom]} />
            <View style={[styles.reticleTick, styles.tickLeft]} />
            <View style={[styles.reticleTick, styles.tickRight]} />
          </Animated.View>
        )}

        {/* Linha de varredura. */}
        {!locked && (
          <Animated.View style={[styles.sweep, sweepStyle]}>
            <View style={[styles.sweepGlow, { backgroundColor: accent }]} />
            <View style={[styles.sweepLine, { backgroundColor: accent }]} />
          </Animated.View>
        )}

        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Particle key={i} index={i} height={height * 0.5} />
        ))}

        {/* Pulso de confirmação do alvo. */}
        <Animated.View
          style={[styles.lockRing, { borderColor: color.sage400 }, lockStyle]}
        />
      </View>

      {/* Estado, em linguagem de gente. */}
      <Animated.View
        entering={FadeIn.duration(220)}
        style={[styles.status, { borderColor: `${accent}66` }]}
      >
        <View style={[styles.statusDot, { backgroundColor: accent }]} />
        <Text style={[type.label, { color: color.white }]}>
          {locked ? "Cão identificado" : found ? "Analisando postura" : "Procurando seu cão"}
        </Text>
        {found && (
          <Ionicons name="checkmark-circle" size={16} color={color.sage400} />
        )}
      </Animated.View>

      {!found && (
        <Animated.Text entering={FadeIn.delay(400)} style={styles.hint}>
          Aponte a câmera para o seu cão, de corpo inteiro
        </Animated.Text>
      )}

      {/* Leitura técnica. Só em desenvolvimento: em produção seria ruído para o
          tutor, que precisa olhar o cão e não um número. */}
      {debug && detection && (
        <View style={styles.debug}>
          <Text style={styles.debugText}>
            conf {(detection.box.confidence * 100).toFixed(0)}% · caixa{" "}
            {detection.box.width.toFixed(0)}x{detection.box.height.toFixed(0)} · pts{" "}
            {detection.keypoints.filter((k) => k.confidence >= 0.5).length}/24
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  frame: {
    width: "78%",
    height: "52%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  bracket: {
    position: "absolute",
    width: 42,
    height: 42,
    borderColor: color.alpha500,
    borderRadius: 4,
  },
  reticle: { position: "absolute", width: 120, height: 120, alignItems: "center", justifyContent: "center" },
  reticleRing: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    borderWidth: 1,
    opacity: 0.5,
  },
  reticleTick: { position: "absolute", backgroundColor: color.alpha500, opacity: 0.8 },
  tickTop: { top: 0, width: 1.5, height: 14 },
  tickBottom: { bottom: 0, width: 1.5, height: 14 },
  tickLeft: { left: 0, height: 1.5, width: 14 },
  tickRight: { right: 0, height: 1.5, width: 14 },
  sweep: { position: "absolute", top: 0, left: 0, right: 0 },
  sweepGlow: { height: 44, opacity: 0.16 },
  sweepLine: { height: 1.5, opacity: 0.9 },
  particle: { position: "absolute", width: 3, height: 3, borderRadius: 2, backgroundColor: color.alpha300 },
  lockRing: { position: "absolute", width: 200, height: 200, borderRadius: radius.pill, borderWidth: 2 },
  status: {
    position: "absolute",
    bottom: "18%",
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: "rgba(11,14,20,0.72)",
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  hint: {
    position: "absolute",
    bottom: "12%",
    color: color.ink300,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: space.xl,
  },
  debug: {
    position: "absolute",
    top: "8%",
    paddingHorizontal: space.md,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: "rgba(11,14,20,0.8)",
  },
  debugText: { color: color.ink300, fontFamily: "Inter_400Regular", fontSize: 11 },
});
