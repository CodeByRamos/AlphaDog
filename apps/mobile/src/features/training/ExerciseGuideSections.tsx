import { EXERCISES, getExerciseGuide, type Exercise } from "@alphadog/core";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "../../components/Card";
import { color, radius, space, type } from "../../theme";

/**
 * Training Coach — as instruções completas do exercício.
 *
 * Aparece na tela de preparação, antes de a câmera abrir, e é o que o tutor lê
 * com o cão ainda solto pela casa. Escrito para quem nunca treinou um cão: sem
 * jargão, e respondendo às perguntas na ordem em que elas aparecem — para que
 * serve, posso agora, preciso de quê, onde, como fico eu, o que falo, quando
 * recompenso, o que costuma dar errado.
 *
 * Todo o conteúdo vem de `exercise-guide.ts`, a mesma fonte que monta o prompt
 * da avaliação. Não há como a tela ensinar uma coisa e a IA cobrar outra.
 */
export function ExerciseGuideSections({ exercise }: { exercise: Exercise }) {
  const guide = getExerciseGuide(exercise.id);

  return (
    <View style={{ gap: space.xl }}>
      <Section title="Objetivo">
        <Text style={styles.body}>{guide.objective}</Text>
      </Section>

      <Section title="Antes de começar">
        <Fact icon="calendar-outline" label="Idade" value={guide.ageNote} />
        <Fact
          icon="link-outline"
          label="Pré-requisitos"
          value={
            guide.prerequisites.length > 0
              ? `${guide.prerequisites.map((id) => EXERCISES[id].name).join(", ")} — ${guide.prerequisiteNote}`
              : guide.prerequisiteNote
          }
        />
        <Fact icon="time-outline" label="Tempo médio" value={`${exercise.minutes} minutos`} />
        <Fact icon="speedometer-outline" label="Dificuldade" value={guide.difficultyNote} />
      </Section>

      <Section title="O que você precisa">
        {guide.materials.map((item) => (
          <Bullet key={item} text={item} />
        ))}
        <Fact icon="home-outline" label="Ambiente ideal" value={guide.environment} />
      </Section>

      <Section title="Posição">
        <Fact icon="person-outline" label="Você" value={guide.handlerPosture} />
        <Fact icon="paw-outline" label="Seu cão" value={guide.dogPosition} />
      </Section>

      <Section title="Comando">
        <Fact icon="chatbubble-outline" label="O que falar" value={guide.verbalCue} />
        <Fact icon="hand-left-outline" label="Gesto" value={guide.handSignal} />
        <Fact icon="gift-outline" label="Quando recompensar" value={guide.rewardMoment} />
      </Section>

      <Section title="Erros mais comuns">
        {guide.commonMistakes.map((item) => (
          <Card key={item.mistake} style={styles.mistake}>
            <View style={styles.mistakeHead}>
              <Ionicons name="close-circle" size={16} color={color.warn500} />
              <Text style={[type.caption, styles.mistakeText]}>{item.mistake}</Text>
            </View>
            <View style={styles.mistakeHead}>
              <Ionicons name="checkmark-circle" size={16} color={color.sage400} />
              <Text style={[type.caption, styles.fixText]}>{item.fix}</Text>
            </View>
          </Card>
        ))}
      </Section>

      <Section title="Ritmo">
        <Fact icon="repeat-outline" label="Quando repetir" value={guide.repeatWhen} />
        <Fact icon="hand-right-outline" label="Quando parar" value={guide.stopWhen} />
      </Section>

      <Section title="Dicas importantes">
        {guide.keyTips.map((tip) => (
          <Bullet key={tip} text={tip} />
        ))}
      </Section>

      <Section title="Benefícios">
        {guide.benefits.map((benefit) => (
          <Bullet key={benefit} text={benefit} icon="sparkles-outline" />
        ))}
      </Section>

      {/* Dito de frente, e sem eufemismo: o tutor tem direito de saber o que
          está sendo julgado na foto dele antes de tirá-la. */}
      <Section title="O que a IA vai analisar">
        <Text style={styles.body}>
          Você vai fotografar {exercise.name.toLowerCase()} e a avaliação olha
          estes pontos, um por um:
        </Text>
        {guide.aiCriteria.map((criterion) => (
          <Bullet key={criterion} text={criterion} icon="eye-outline" />
        ))}
        <View style={styles.photoHint}>
          <Ionicons name="camera-outline" size={16} color={color.alpha500} />
          <Text style={[type.caption, styles.photoHintText]}>
            {guide.photoInstruction}
          </Text>
        </View>
      </Section>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={[type.overline, { color: color.alpha500 }]}>{title}</Text>
      {children}
    </View>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={16} color={color.ink400} />
      <View style={{ flex: 1 }}>
        <Text style={[type.caption, { color: color.ink500 }]}>{label}</Text>
        <Text style={styles.body}>{value}</Text>
      </View>
    </View>
  );
}

function Bullet({
  text,
  icon = "ellipse",
}: {
  text: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.bullet}>
      <Ionicons name={icon} size={icon === "ellipse" ? 6 : 14} color={color.ink500} />
      <Text style={[styles.body, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, color: color.ink300 },
  fact: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  bullet: { flexDirection: "row", gap: space.sm, alignItems: "flex-start", paddingLeft: 2 },
  mistake: { gap: space.sm },
  mistakeHead: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  mistakeText: { color: color.bone, flex: 1, lineHeight: 19 },
  fixText: { color: color.ink300, flex: 1, lineHeight: 19 },
  photoHint: {
    flexDirection: "row",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: "rgba(217,119,66,0.10)",
    borderWidth: 1,
    borderColor: "rgba(217,119,66,0.28)",
    marginTop: space.sm,
  },
  photoHintText: { color: color.bone, flex: 1, lineHeight: 19 },
});
