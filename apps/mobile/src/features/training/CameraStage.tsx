import type { Detection, Exercise, SessionState } from "@alphadog/core";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import { Button } from "../../components/Button";
import { color, duration, easing, radius, space, type } from "../../theme";
import type { DetectorStatus } from "../../vision/detector";

type Tone = "neutral" | "progress" | "success" | "warn";

const TONE_COLOR: Record<Tone, string> = {
  neutral: color.ink300,
  progress: color.alpha500,
  success: color.sage400,
  warn: color.warn500,
};

type Props = {
  exercise: Exercise;
  dogName: string;
  detector: DetectorStatus;
  state: SessionState;
  onFrame: (detection: Detection | null, timestamp: number) => SessionState;
  onFinish: (completed: boolean) => void;
  feedbackText: string;
  tone: Tone;
};

export function CameraStage({
  exercise,
  dogName,
  detector,
  state,
  onFrame,
  onFinish,
  feedbackText,
  tone,
}: Props) {
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("back");

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  // Conclui sozinho quando todas as repetições saem.
  useEffect(() => {
    if (state.phase === "finished") {
      const t = setTimeout(() => onFinish(true), 900);
      return () => clearTimeout(t);
    }
  }, [state.phase, onFinish]);

  if (!hasPermission) {
    return (
      <Blocked
        icon="camera-outline"
        title="Precisamos da câmera"
        body={`Para acompanhar ${dogName} durante o treino. O vídeo é processado no seu aparelho e nunca sai dele.`}
        action={{ label: "Permitir câmera", onPress: () => void requestPermission() }}
        onClose={() => onFinish(false)}
      />
    );
  }

  if (!device) {
    return (
      <Blocked
        icon="videocam-off-outline"
        title="Câmera indisponível"
        body="Não encontramos a câmera traseira deste aparelho."
        onClose={() => onFinish(false)}
      />
    );
  }

  return (
    <View style={styles.root}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        // O frame processor entra aqui quando o detector existir. Sem modelo,
        // ligar o processor só gastaria bateria copiando frames para lugar
        // nenhum.
      />

      {/* Escurece o topo e a base para o texto ter contraste sobre qualquer cena. */}
      <View style={[styles.scrim, styles.scrimTop, { paddingTop: insets.top + space.md }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onFinish(false);
            }}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel="Encerrar treino"
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={22} color={color.white} />
          </Pressable>

          <View style={styles.repPill}>
            <Text style={styles.repText}>
              {state.currentRep} / {state.totalReps}
            </Text>
          </View>

          <View style={styles.successPill}>
            <Ionicons name="checkmark-circle" size={14} color={color.sage400} />
            <Text style={styles.successText}>{state.successCount}</Text>
          </View>
        </View>
      </View>

      {detector.kind === "unavailable" ? (
        <ModelUnavailable reason={detector.reason} exercise={exercise} />
      ) : (
        <FeedbackBanner text={feedbackText} tone={tone} state={state} />
      )}

      <View style={[styles.scrim, styles.scrimBottom, { paddingBottom: insets.bottom + space.lg }]}>
        <Button
          label="Encerrar sessão"
          variant="ghost"
          onPress={() => onFinish(false)}
        />
      </View>
    </View>
  );
}

/**
 * Estado sem modelo.
 *
 * Deliberadamente NÃO simula detecção. Seria fácil sortear posturas e a demo
 * pareceria pronta — e um "Excelente!" sem o cão ter sentado ensina o tutor a
 * recompensar o comportamento errado. O app passaria a piorar o treino.
 *
 * Em vez disso a câmera roda (o tutor se filma treinando, o que já ajuda) e os
 * passos ficam à mão. O que não fingimos é enxergar.
 */
function ModelUnavailable({ reason, exercise }: { reason: string; exercise: Exercise }) {
  return (
    <Animated.View entering={FadeIn.duration(duration.normal)} style={styles.center}>
      <View style={styles.notice}>
        <Ionicons name="eye-off-outline" size={22} color={color.alpha500} />
        <Text style={[type.subheading, { color: color.white, textAlign: "center" }]}>
          Feedback automático em breve
        </Text>
        <Text style={[type.bodySmall, styles.noticeBody]}>
          {reason} Enquanto isso, siga os passos e treine normalmente — a câmera
          está gravando para você se ver.
        </Text>
        <View style={styles.divider} />
        <Text style={[type.label, { color: color.alpha500 }]}>
          {exercise.steps[1]?.title ?? exercise.steps[0]?.title}
        </Text>
        <Text style={[type.bodySmall, styles.noticeBody]}>
          {exercise.steps[1]?.body ?? exercise.steps[0]?.body}
        </Text>
      </View>
    </Animated.View>
  );
}

function FeedbackBanner({
  text,
  tone,
  state,
}: {
  text: string;
  tone: Tone;
  state: SessionState;
}) {
  const pulse = useSharedValue(1);
  const lastTone = useRef(tone);

  useEffect(() => {
    if (tone === "success" && lastTone.current !== "success") {
      pulse.value = withSequence(
        withSpring(1.12, easing.springBouncy),
        withSpring(1, easing.spring),
      );
    }
    lastTone.current = tone;
  }, [tone, pulse]);

  // Pulsa devagar durante a permanência: dá ao tutor um metrônomo visual sem
  // exigir que ele leia o número.
  useEffect(() => {
    if (state.feedback === "hold") {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
        true,
      );
    }
  }, [state.feedback, pulse]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={styles.center} pointerEvents="none">
      <Animated.View
        style={[styles.banner, { borderColor: TONE_COLOR[tone] }, animated]}
        accessibilityLiveRegion="polite"
        accessible
        accessibilityLabel={text}
      >
        <Text style={[type.heading, { color: TONE_COLOR[tone], textAlign: "center" }]}>
          {text}
        </Text>
        {state.feedback === "hold" && state.remainingSeconds > 0 ? (
          <Text style={styles.countdown}>{Math.ceil(state.remainingSeconds)}</Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

function Blocked({
  icon,
  title,
  body,
  action,
  onClose,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.blocked, { paddingTop: insets.top }]}>
      <Pressable onPress={onClose} hitSlop={16} style={styles.blockedClose}>
        <Ionicons name="close" size={26} color={color.ink300} />
      </Pressable>
      <View style={styles.blockedBody}>
        <Ionicons name={icon} size={44} color={color.alpha500} />
        <Text style={[type.title, { color: color.bone, textAlign: "center" }]}>{title}</Text>
        <Text style={[type.body, { color: color.ink400, textAlign: "center" }]}>{body}</Text>
        {action ? <Button label={action.label} onPress={action.onPress} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink950 },
  scrim: { position: "absolute", left: 0, right: 0, paddingHorizontal: space.lg },
  scrimTop: { top: 0, paddingBottom: space.lg, backgroundColor: "rgba(5,7,11,0.55)" },
  scrimBottom: { bottom: 0, paddingTop: space.lg, backgroundColor: "rgba(5,7,11,0.55)" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  repPill: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  repText: { fontFamily: "Sora_800ExtraBold", fontSize: 15, color: color.white, fontVariant: ["tabular-nums"] },
  successPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  successText: { fontFamily: "Sora_800ExtraBold", fontSize: 14, color: color.white },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", padding: space.xl },
  banner: {
    backgroundColor: "rgba(5,7,11,0.82)",
    borderWidth: 2,
    borderRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    alignItems: "center",
    gap: space.sm,
    minWidth: 220,
  },
  countdown: {
    fontFamily: "Sora_800ExtraBold",
    fontSize: 44,
    color: color.white,
    fontVariant: ["tabular-nums"],
  },
  notice: {
    backgroundColor: "rgba(5,7,11,0.88)",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.ink700,
    padding: space.xl,
    gap: space.sm,
    alignItems: "center",
    maxWidth: 340,
  },
  noticeBody: { color: color.ink300, textAlign: "center" },
  divider: { height: 1, alignSelf: "stretch", backgroundColor: color.ink700, marginVertical: space.sm },
  blocked: { flex: 1, backgroundColor: color.ink900 },
  blockedClose: { padding: space.lg, alignSelf: "flex-start" },
  blockedBody: { flex: 1, justifyContent: "center", alignItems: "center", padding: space.xl, gap: space.lg },
});
