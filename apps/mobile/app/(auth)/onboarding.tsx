import type { DogDraft } from "@alphadog/core";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Button } from "../../src/components/Button";
import { Field } from "../../src/components/Field";
import { OptionCard } from "../../src/components/OptionCard";
import { Screen } from "../../src/components/Screen";
import { createDog } from "../../src/data/dogs";
import {
  STEPS,
  emptyDraft,
  isStepAnswered,
  parseWeightKg,
  type Step,
} from "../../src/features/onboarding/steps";
import { useAuth } from "../../src/state/auth";
import { color, duration, radius, space, type } from "../../src/theme";

export default function OnboardingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<DogDraft>(emptyDraft);
  const [weightText, setWeightText] = useState("");
  const [weightError, setWeightError] = useState<string | null>(null);

  const step = STEPS[index]!;
  const isLast = index === STEPS.length - 1;
  const canAdvance = isStepAnswered(step, draft);

  const progress = useSharedValue(0);
  progress.value = withTiming((index + 1) / STEPS.length, { duration: duration.normal });
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const save = useMutation({
    mutationFn: () => createDog(draft, session!.user.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dogs"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(app)/home");
    },
  });

  function patch(next: Partial<DogDraft>) {
    setDraft((d) => ({ ...d, ...next }));
  }

  function advance() {
    if (isLast) {
      save.mutate();
      return;
    }
    setIndex((i) => i + 1);
  }

  function back() {
    if (index === 0) return;
    setIndex((i) => i - 1);
  }

  /** Escolha única avança sozinha: um toque a menos por passo. */
  function choose(key: string, value: string) {
    patch({ [key]: value } as Partial<DogDraft>);
    if (!isLast) setTimeout(() => setIndex((i) => i + 1), 180);
  }

  function toggleDifficulty(value: string) {
    setDraft((d) => {
      // "Nenhum desses" é exclusivo nos dois sentidos.
      if (value === "none") return { ...d, difficulties: ["none"] };
      const without = d.difficulties.filter((x) => x !== "none");
      const next = without.includes(value as never)
        ? without.filter((x) => x !== value)
        : [...without, value as never];
      return { ...d, difficulties: next };
    });
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={back}
          disabled={index === 0}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={[styles.backBtn, index === 0 && styles.hidden]}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={22} color={color.ink300} />
        </Pressable>

        <View style={styles.track}>
          <Animated.View style={[styles.fill, barStyle]} />
        </View>

        <Text style={[type.caption, styles.counter]}>
          {index + 1}/{STEPS.length}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            key={step.key}
            entering={SlideInRight.duration(duration.fast)}
            exiting={FadeOut.duration(duration.instant)}
          >
            <Text style={[type.title, styles.title]}>{step.title}</Text>
            {step.subtitle ? (
              <Text style={[type.body, styles.subtitle]}>{step.subtitle}</Text>
            ) : null}

            <View style={styles.body}>
              <StepBody
                step={step}
                draft={draft}
                weightText={weightText}
                weightError={weightError}
                onName={(name) => patch({ name })}
                onWeight={(text) => {
                  setWeightText(text);
                  const grams = parseWeightKg(text);
                  // Campo vazio é válido (peso é opcional); texto inválido não.
                  setWeightError(
                    text.trim() && grams === null ? "Peso entre 0,5 e 120 kg" : null,
                  );
                  patch({ weightGrams: grams });
                }}
                onChoose={choose}
                onToggle={toggleDifficulty}
              />
            </View>
          </Animated.View>
        </ScrollView>

        {/* Escolha única avança sozinha, então o botão só aparece onde faz falta. */}
        {step.kind !== "choice" ? (
          <Animated.View entering={FadeIn} style={styles.footer}>
            {save.isError ? (
              <Text style={[type.bodySmall, styles.error]} accessibilityRole="alert">
                Não foi possível salvar. Tente de novo.
              </Text>
            ) : null}
            <Button
              label={isLast ? "Criar perfil" : "Continuar"}
              onPress={advance}
              disabled={!canAdvance || !!weightError}
              loading={save.isPending}
            />
          </Animated.View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function StepBody({
  step,
  draft,
  weightText,
  weightError,
  onName,
  onWeight,
  onChoose,
  onToggle,
}: {
  step: Step;
  draft: DogDraft;
  weightText: string;
  weightError: string | null;
  onName: (v: string) => void;
  onWeight: (v: string) => void;
  onChoose: (key: string, value: string) => void;
  onToggle: (value: string) => void;
}) {
  // A lista de raças é longa: rolar 21 itens de 64px cansa. Sem busca aqui
  // porque teclado + lista em passo de onboarding briga por espaço; a ordem já
  // põe as comuns em cima.
  const options = useMemo(
    () => (step.kind === "choice" || step.kind === "multi" ? step.options : []),
    [step],
  );

  switch (step.kind) {
    case "text":
      return (
        <Field
          label="Nome"
          value={draft.name}
          onChangeText={onName}
          placeholder={step.placeholder}
          autoFocus
          autoCapitalize="words"
          maxLength={40}
        />
      );

    case "weight":
      return (
        <Field
          label="Peso"
          value={weightText}
          onChangeText={onWeight}
          error={weightError}
          placeholder="12"
          suffix="kg"
          keyboardType="decimal-pad"
          autoFocus
        />
      );

    case "multi":
      return (
        <View style={styles.options}>
          {options.map((o) => (
            <OptionCard
              key={o.value}
              label={o.label}
              hint={o.hint}
              emoji={o.emoji}
              multi
              selected={draft.difficulties.includes(o.value as never)}
              onPress={() => onToggle(o.value)}
            />
          ))}
        </View>
      );

    case "choice":
      return (
        <View style={styles.options}>
          {options.map((o) => (
            <OptionCard
              key={o.value}
              label={o.label}
              hint={o.hint}
              emoji={o.emoji}
              selected={draft[step.key] === o.value}
              onPress={() => onChoose(step.key, o.value)}
            />
          ))}
        </View>
      );
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  backBtn: { width: 28 },
  hidden: { opacity: 0 },
  track: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.ink700,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: color.alpha500, borderRadius: radius.pill },
  counter: { color: color.ink400, width: 34, textAlign: "right" },
  scroll: { padding: space.xl, paddingBottom: space["3xl"] },
  title: { color: color.bone },
  subtitle: { color: color.ink400, marginTop: space.sm },
  body: { marginTop: space.xl },
  options: { gap: space.md },
  footer: {
    padding: space.xl,
    paddingTop: space.md,
    gap: space.md,
    borderTopWidth: 1,
    borderTopColor: color.ink800,
  },
  error: { color: color.warn500, textAlign: "center" },
});
