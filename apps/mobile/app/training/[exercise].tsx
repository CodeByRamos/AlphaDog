import { EXERCISES, feedbackText, feedbackTone, type ExerciseId } from "@alphadog/core";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Screen } from "../../src/components/Screen";
import { saveSession } from "../../src/data/sessions";
import { useDogData } from "../../src/features/dashboard/useDogData";
import { useTrainingSession } from "../../src/features/training/useTrainingSession";
import { useAuth } from "../../src/state/auth";
import { color, duration, radius, space, type } from "../../src/theme";
import { useDetector } from "../../src/vision/useDetector";
import { CameraStage } from "../../src/features/training/CameraStage";

type Phase = "brief" | "live" | "done";

export default function TrainingScreen() {
  const { exercise: exerciseParam } = useLocalSearchParams<{ exercise: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { dog } = useDogData();
  const queryClient = useQueryClient();
  const detector = useDetector();

  const exercise = EXERCISES[exerciseParam as ExerciseId] ?? EXERCISES.sit;
  const [phase, setPhase] = useState<Phase>("brief");
  const training = useTrainingSession(exercise);

  const save = useMutation({
    mutationFn: (completed: boolean) =>
      saveSession(dog!.id, session!.user.id, training.result(training.state.elapsedSeconds), completed),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  function finish(completed: boolean) {
    setPhase("done");
    // Grava mesmo se o tutor sair no meio: sessão parcial vale progresso.
    save.mutate(completed);
  }

  if (!dog) return null;

  if (phase === "brief") {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.briefHead}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            >
              <Ionicons name="close" size={26} color={color.ink300} />
            </Pressable>
          </View>

          <Animated.View entering={FadeInDown.duration(duration.normal)}>
            <Text style={[type.hero, { color: color.bone }]}>{exercise.name}</Text>
            <Text style={[type.body, { color: color.ink400, marginTop: space.sm }]}>
              {exercise.description}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(duration.normal).delay(60)}>
            <Text style={[type.overline, styles.section]}>Como fazer</Text>
            <View style={{ gap: space.md }}>
              {exercise.steps.map((step, i) => (
                <Card key={step.title} style={styles.step}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.subheading, { color: color.bone }]}>{step.title}</Text>
                    <Text style={[type.bodySmall, { color: color.ink400, marginTop: 2 }]}>
                      {step.body}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(duration.normal).delay(120)}>
            <Card style={styles.tip}>
              <Ionicons name="bulb" size={18} color={color.alpha500} />
              <View style={{ flex: 1 }}>
                <Text style={[type.label, { color: color.alpha500 }]}>Erro comum</Text>
                <Text style={[type.bodySmall, { color: color.ink300, marginTop: 2 }]}>
                  {exercise.tip}
                </Text>
              </View>
            </Card>
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Começar treino" onPress={() => setPhase("live")} />
        </View>
      </Screen>
    );
  }

  if (phase === "done") {
    const result = training.result(training.state.elapsedSeconds);
    const rate = Math.round(result.successRate * 100);

    return (
      <Screen style={styles.center}>
        <Animated.View entering={FadeIn.duration(duration.normal)} style={styles.done}>
          <View style={styles.doneIcon}>
            <Ionicons
              name={result.successCount > 0 ? "trophy" : "paw"}
              size={40}
              color={color.alpha500}
            />
          </View>

          <Text style={[type.title, { color: color.bone, textAlign: "center" }]}>
            {result.successCount === 0
              ? "Sessão encerrada"
              : result.successCount >= exercise.reps
                ? "Sessão completa!"
                : "Bom trabalho"}
          </Text>

          <Text style={[type.body, styles.doneSub]}>
            {result.successCount === 0
              ? `Sem acertos desta vez. Normal — ${dog.name} está aprendendo.`
              : `${dog.name} acertou ${result.successCount} de ${result.totalReps}.`}
          </Text>

          <View style={styles.doneStats}>
            <DoneStat value={`${rate}%`} label="acerto" />
            <DoneStat value={`${Math.round(result.durationSeconds / 60)}min`} label="duração" />
            <DoneStat value={String(result.successCount)} label="acertos" />
          </View>

          {save.isError ? (
            <Text style={[type.bodySmall, { color: color.warn500, textAlign: "center" }]}>
              Não conseguimos salvar. Sua conexão pode ter caído.
            </Text>
          ) : null}

          <Button
            label="Voltar ao início"
            onPress={() => router.replace("/(app)/home")}
            loading={save.isPending}
          />
        </Animated.View>
      </Screen>
    );
  }

  // phase === "live"
  return (
    <CameraStage
      exercise={exercise}
      dogName={dog.name}
      detector={detector}
      state={training.state}
      onFrame={training.pushFrame}
      onFinish={finish}
      feedbackText={feedbackText(training.state, dog.name)}
      tone={feedbackTone(training.state.feedback)}
    />
  );
}

function DoneStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.doneStat}>
      <Text style={[type.stat, { color: color.bone, fontSize: 22 }]}>{value}</Text>
      <Text style={[type.caption, { color: color.ink400 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.xl, gap: space.xl, paddingBottom: space["3xl"] },
  briefHead: { flexDirection: "row", justifyContent: "flex-end" },
  section: { color: color.ink400, marginBottom: space.md },
  step: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: color.alpha500,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontFamily: "Sora_800ExtraBold", fontSize: 13, color: color.ink900 },
  tip: { flexDirection: "row", gap: space.md, backgroundColor: "rgba(240,167,60,0.08)", borderColor: color.alpha600 },
  footer: { padding: space.xl, borderTopWidth: 1, borderTopColor: color.ink800 },
  center: { justifyContent: "center", padding: space.xl },
  done: { gap: space.lg, alignItems: "center" },
  doneIcon: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: "rgba(240,167,60,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  doneSub: { color: color.ink400, textAlign: "center" },
  doneStats: { flexDirection: "row", gap: space.xl, marginVertical: space.md },
  doneStat: { alignItems: "center", gap: 2 },
});
