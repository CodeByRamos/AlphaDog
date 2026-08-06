import {
  MIN_ANALYSIS_CONFIDENCE,
  getExerciseGuide,
  type Exercise,
  type PhotoSessionState,
} from "@alphadog/core";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
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
import { capturePhotoAsBase64 } from "./capture";

/**
 * Tela de treino.
 *
 * A câmera fica aberta durante toda a atividade, como antes — ela é o que faz o
 * treino parecer treino, e não uma lista de tarefas. O que mudou é quem julga:
 * em vez de analisar trinta quadros por segundo, o tutor captura UMA foto no
 * momento em que o cão está executando, e essa foto é avaliada.
 *
 * A troca não é só técnica. Analisar vídeo obrigava o tutor a segurar a posição
 * o tempo suficiente para a detecção estabilizar, com o celular apoiado em
 * algum lugar. Uma foto é tirada no instante certo, com uma mão só, e avaliada
 * por um modelo que entende o exercício inteiro — não apenas a postura.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  exercise: Exercise;
  dogName: string;
  state: PhotoSessionState;
  onCapture: (imageBase64: string) => void;
  onMarkSuccess: () => void;
  onNext: () => void;
  onRetry: () => void;
  onFinish: (completed: boolean) => void;
};

export function CameraStage({
  exercise,
  dogName,
  state,
  onCapture,
  onMarkSuccess,
  onNext,
  onRetry,
  onFinish,
}: Props) {
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("back");
  const camera = useRef<Camera>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const guide = getExerciseGuide(exercise.id);

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  // Conclui sozinho quando todas as repetições saem. onFinish vive num ref e o
  // efeito depende SÓ da fase: o pai recria a função a cada render, e tê-la
  // como dependência cancelaria o timeout antes de ele disparar.
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    if (state.phase === "finished") {
      const timer = setTimeout(() => onFinishRef.current(true), 900);
      return () => clearTimeout(timer);
    }
  }, [state.phase]);

  async function handleCapture() {
    if (capturing || !camera.current) return;
    setCapturing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const photo = await capturePhotoAsBase64(camera.current);
    setCapturing(false);

    if (!photo) {
      setCameraError("Não consegui tirar a foto. Tente de novo.");
      return;
    }

    onCapture(photo);
  }

  // ------------------------------------------------------------------ prévia

  // No navegador não há Vision Camera: o componente é nativo. A sessão roda
  // igual, sem vídeo de fundo — é o modo de prévia para testar o fluxo inteiro
  // sem instalar nada.
  if (Platform.OS === "web") {
    return (
      <View style={[styles.root, styles.webRoot]}>
        <TopBar
          exercise={exercise}
          state={state}
          insets={insets.top}
          onClose={() => onFinish(false)}
        />
        <View style={styles.center}>
          <View style={styles.notice}>
            <Text style={[type.overline, { color: color.alpha500 }]}>Prévia web</Text>
            <Text style={[type.subheading, styles.noticeBody]}>
              A câmera é nativa e não abre no navegador. Instale o aplicativo
              para capturar e avaliar as execuções.
            </Text>
          </View>
        </View>
        <BottomBar insets={insets.bottom}>
          <Button label="Ele acertou" onPress={onMarkSuccess} />
          <Pressable onPress={() => onFinish(false)} style={styles.endBtn} hitSlop={8}>
            <Text style={[type.label, { color: color.ink300 }]}>Encerrar sessão</Text>
          </Pressable>
        </BottomBar>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <Blocked
        icon="camera-outline"
        title="Precisamos da câmera"
        body={`Para você fotografar ${dogName} executando o exercício. A foto é enviada apenas para a avaliação e não fica guardada.`}
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

  if (cameraError) {
    return (
      <Blocked
        icon="alert-circle-outline"
        title="Problema com a câmera"
        body={`${cameraError}\n\nFeche outros aplicativos que usem a câmera e tente novamente.`}
        action={{ label: "Tentar de novo", onPress: () => setCameraError(null) }}
        onClose={() => onFinish(false)}
      />
    );
  }

  const analyzing = state.phase === "analyzing";
  const reviewing = state.phase === "reviewing";

  return (
    <View style={styles.root}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        // A câmera existe para fotografar, não para processar vídeo. Sem
        // frame processor, sem worklet, sem modelo rodando a cada quadro.
        photo
        onError={(e) => setCameraError(e.message)}
      />

      {/* Moldura de enquadramento. Some durante a análise e a revisão para o
          resultado ficar legível. */}
      {!analyzing && !reviewing && <FramingGuide />}

      <TopBar
        exercise={exercise}
        state={state}
        insets={insets.top}
        onClose={() => onFinish(false)}
      />

      {analyzing && <AnalyzingOverlay />}
      {reviewing && (
        <ResultCard state={state} onNext={onNext} onRetry={onRetry} dogName={dogName} />
      )}

      {!analyzing && !reviewing && (
        <>
          <Animated.View
            entering={FadeIn.duration(duration.normal)}
            style={styles.center}
            pointerEvents="none"
          >
            <View style={styles.instruction}>
              <Text style={[type.overline, { color: color.alpha500 }]}>
                Repetição {state.currentRep} de {state.totalReps}
              </Text>
              <Text style={[type.subheading, styles.instructionBody]}>
                Posicione {dogName} conforme as instruções. Quando ele estiver
                executando o comando corretamente, toque em Capturar foto.
              </Text>
              <View style={styles.divider} />
              <Text style={[type.caption, styles.hint]}>
                {guide.photoInstruction}
              </Text>
            </View>
          </Animated.View>

          <BottomBar insets={insets.bottom}>
            <CaptureButton onPress={handleCapture} busy={capturing} />
            <Pressable onPress={onMarkSuccess} style={styles.secondaryBtn} hitSlop={8}>
              <Ionicons name="hand-left-outline" size={16} color={color.bone} />
              <Text style={[type.label, { color: color.bone }]}>
                Marcar acerto sem foto
              </Text>
            </Pressable>
            <Pressable onPress={() => onFinish(false)} style={styles.endBtn} hitSlop={8}>
              <Text style={[type.label, { color: color.ink300 }]}>Encerrar sessão</Text>
            </Pressable>
          </BottomBar>
        </>
      )}
    </View>
  );
}

/**
 * Moldura animada de enquadramento.
 *
 * Puramente visual, e assumidamente. Ela não detecta nada — orienta o tutor a
 * deixar o cão inteiro no quadro, que é o erro de foto que mais derruba a
 * avaliação. Fingir que a moldura "procura" o cão seria simular análise, que é
 * exatamente o que este produto não faz.
 */
function FramingGuide() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.4 }));

  return (
    <View style={styles.framing} pointerEvents="none">
      <Animated.View style={[styles.frame, animated]}>
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </Animated.View>
    </View>
  );
}

function AnalyzingOverlay() {
  return (
    <Animated.View
      entering={FadeIn.duration(duration.fast)}
      style={styles.analyzing}
      pointerEvents="none"
    >
      <ActivityIndicator size="large" color={color.alpha500} />
      <Text style={[type.subheading, styles.analyzingText]}>
        Analisando execução…
      </Text>
      <Text style={[type.caption, { color: color.ink400, textAlign: "center" }]}>
        Comparando a foto com os critérios deste exercício
      </Text>
    </Animated.View>
  );
}

/**
 * Resultado da análise.
 *
 * Mostra os critérios um a um, com o que o modelo observou em cada. É o que
 * transforma "não passou" em algo acionável: o tutor vê exatamente qual ponto
 * faltou, e não uma nota sem explicação.
 */
function ResultCard({
  state,
  onNext,
  onRetry,
  dogName,
}: {
  state: PhotoSessionState;
  onNext: () => void;
  onRetry: () => void;
  dogName: string;
}) {
  const result = state.lastResult;
  const manual = state.lastWasManual;

  const approved = manual || (result?.success === true && result.confidence >= MIN_ANALYSIS_CONFIDENCE);
  const inconclusive = !manual && result != null && result.confidence < MIN_ANALYSIS_CONFIDENCE;

  return (
    <Animated.View entering={FadeInDown.duration(duration.normal)} style={styles.resultWrap}>
      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <View
            style={[
              styles.resultBadge,
              {
                backgroundColor: approved
                  ? "rgba(122,168,116,0.18)"
                  : inconclusive
                    ? "rgba(148,163,184,0.18)"
                    : "rgba(217,119,66,0.18)",
              },
            ]}
          >
            <Ionicons
              name={
                approved
                  ? "checkmark-circle"
                  : inconclusive
                    ? "help-circle-outline"
                    : "refresh-circle-outline"
              }
              size={26}
              color={approved ? color.sage400 : inconclusive ? color.ink300 : color.warn500}
            />
          </View>
          <Text style={[type.heading, styles.resultTitle]}>
            {manual
              ? "Acerto marcado"
              : approved
                ? "Muito bem!"
                : inconclusive
                  ? "Não deu para avaliar"
                  : "Quase lá"}
          </Text>
        </View>

        <Text style={[type.body, styles.resultFeedback]}>
          {manual
            ? `Você confirmou o acerto de ${dogName}. Recompense agora.`
            : (result?.feedback ?? "")}
        </Text>

        {result?.tips ? (
          <View style={styles.tipBox}>
            <Ionicons name="bulb-outline" size={16} color={color.alpha500} />
            <Text style={[type.caption, styles.tipText]}>{result.tips}</Text>
          </View>
        ) : null}

        {result && result.criteria.length > 0 ? (
          <ScrollView style={styles.criteriaList} contentContainerStyle={{ gap: 8 }}>
            {result.criteria.map((item) => (
              <View key={item.criterion} style={styles.criterionRow}>
                <Ionicons
                  name={item.met ? "checkmark-circle" : "close-circle-outline"}
                  size={16}
                  color={item.met ? color.sage400 : color.ink500}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[type.caption, { color: color.bone }]}>
                    {item.criterion}
                  </Text>
                  {!item.met && item.observation ? (
                    <Text style={[type.caption, { color: color.ink400 }]}>
                      {item.observation}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.resultActions}>
          {/* Repetir a foto NÃO consome a repetição: foto ruim é problema de
              enquadramento, não erro do cão. */}
          {!manual && (
            <Pressable onPress={onRetry} style={styles.retryBtn} hitSlop={8}>
              <Ionicons name="camera-reverse-outline" size={18} color={color.bone} />
              <Text style={[type.label, { color: color.bone }]}>Nova foto</Text>
            </Pressable>
          )}
          <Button
            label={state.currentRep >= state.totalReps ? "Concluir" : "Próxima"}
            onPress={onNext}
          />
        </View>
      </View>
    </Animated.View>
  );
}

function CaptureButton({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.95, easing.spring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, easing.springBouncy);
      }}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Capturar foto"
      style={[styles.captureBtn, animated]}
    >
      {busy ? (
        <ActivityIndicator color={color.ink900} />
      ) : (
        <>
          <Ionicons name="camera" size={22} color={color.ink900} />
          <Text style={[type.subheading, { color: color.ink900 }]}>Capturar foto</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

function TopBar({
  exercise,
  state,
  insets,
  onClose,
}: {
  exercise: Exercise;
  state: PhotoSessionState;
  insets: number;
  onClose: () => void;
}) {
  return (
    <View style={[styles.scrim, styles.scrimTop, { paddingTop: insets + space.md }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onClose();
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
      <Text style={[type.caption, styles.exerciseName]}>{exercise.name}</Text>
    </View>
  );
}

function BottomBar({
  insets,
  children,
}: {
  insets: number;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.scrim, styles.scrimBottom, { paddingBottom: insets + space.lg }]}>
      {children}
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
  webRoot: { justifyContent: "space-between" },
  scrim: { position: "absolute", left: 0, right: 0, paddingHorizontal: space.lg },
  scrimTop: { top: 0, paddingBottom: space.md, backgroundColor: "rgba(5,7,11,0.55)" },
  scrimBottom: {
    bottom: 0,
    paddingTop: space.lg,
    backgroundColor: "rgba(5,7,11,0.55)",
    gap: space.sm,
  },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  exerciseName: { color: color.ink300, textAlign: "center", marginTop: 6 },
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
  repText: {
    fontFamily: "Sora_800ExtraBold",
    fontSize: 15,
    color: color.white,
    fontVariant: ["tabular-nums"],
  },
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

  framing: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  frame: { width: "78%", aspectRatio: 1 },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: color.alpha500,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },

  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-end",
    padding: space.xl,
    paddingBottom: 200,
  },
  instruction: {
    backgroundColor: "rgba(5,7,11,0.88)",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.ink700,
    padding: space.lg,
    gap: space.sm,
    alignItems: "center",
    maxWidth: 360,
  },
  instructionBody: { color: color.bone, textAlign: "center" },
  hint: { color: color.ink400, textAlign: "center" },
  divider: { height: 1, alignSelf: "stretch", backgroundColor: color.ink700 },

  analyzing: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,7,11,0.82)",
    gap: space.md,
    padding: space.xl,
  },
  analyzingText: { color: color.bone, textAlign: "center" },

  resultWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: space.lg,
    backgroundColor: "rgba(5,7,11,0.7)",
  },
  resultCard: {
    backgroundColor: "rgba(5,7,11,0.97)",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.ink700,
    padding: space.lg,
    gap: space.md,
    maxHeight: "82%",
  },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: space.md },
  resultBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitle: { color: color.bone, flex: 1 },
  resultFeedback: { color: color.ink300 },
  tipBox: {
    flexDirection: "row",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: "rgba(217,119,66,0.10)",
    borderWidth: 1,
    borderColor: "rgba(217,119,66,0.28)",
  },
  tipText: { color: color.bone, flex: 1, lineHeight: 18 },
  criteriaList: { maxHeight: 180 },
  criterionRow: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  resultActions: { gap: space.sm },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.ink700,
  },

  captureBtn: {
    height: 62,
    borderRadius: radius.lg,
    backgroundColor: color.alpha500,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    height: 46,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.ink700,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  endBtn: { alignItems: "center", paddingVertical: space.sm },

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

  blocked: { flex: 1, backgroundColor: color.ink900 },
  blockedClose: { padding: space.lg, alignSelf: "flex-start" },
  blockedBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: space.xl,
    gap: space.lg,
  },
});
