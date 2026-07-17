import { DIFFICULTY_LABEL, EXERCISE_LIST, EXERCISES, type Exercise } from "@alphadog/core";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card } from "../../src/components/Card";
import { Logo } from "../../src/components/Logo";
import { ProgressRing } from "../../src/components/ProgressRing";
import { Screen } from "../../src/components/Screen";
import { dashboardHighlight, greeting, relativeDay } from "../../src/features/dashboard/greeting";
import { useDogData } from "../../src/features/dashboard/useDogData";
import { color, duration, radius, space, type } from "../../src/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { dog, stats, weekly, recommended, isLoading, isRefetching, refetch } = useDogData();

  if (isLoading || !dog) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={color.alpha500} />
      </Screen>
    );
  }

  const highlight = dashboardHighlight(stats, dog.name);
  const masteryProgress = stats.masteredExercises.length / EXERCISE_LIST.length;

  return (
    <Screen bottomInset={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={color.alpha500}
          />
        }
      >
        <Animated.View entering={FadeInDown.duration(duration.normal)} style={styles.header}>
          <View>
            <Text style={[type.bodySmall, { color: color.ink400 }]}>
              {greeting(new Date().getHours())}
            </Text>
            <Text style={[type.title, { color: color.bone }]}>{highlight.headline}</Text>
            <Text style={[type.body, { color: color.ink400, marginTop: 4 }]}>
              {highlight.sub}
            </Text>
          </View>
          <Logo size={32} />
        </Animated.View>

        {/* Progresso geral */}
        <Animated.View entering={FadeInDown.duration(duration.normal).delay(60)}>
          <Card raised style={styles.progressCard}>
            <ProgressRing progress={masteryProgress} size={96} stroke={8}>
              <Text style={[type.stat, { color: color.bone }]}>
                {stats.masteredExercises.length}
              </Text>
              <Text style={[type.caption, { color: color.ink400 }]}>
                de {EXERCISE_LIST.length}
              </Text>
            </ProgressRing>

            <View style={styles.progressText}>
              <Text style={[type.overline, { color: color.alpha500 }]}>
                Comandos dominados
              </Text>
              <Text style={[type.body, { color: color.ink300, marginTop: space.xs }]}>
                {stats.masteredExercises.length === 0
                  ? `${dog.name} ainda está aprendendo o primeiro.`
                  : stats.masteredExercises.length === EXERCISE_LIST.length
                    ? `${dog.name} domina todos. Hora de revisar.`
                    : `Faltam ${EXERCISE_LIST.length - stats.masteredExercises.length} para completar.`}
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* Estatísticas */}
        <Animated.View
          entering={FadeInDown.duration(duration.normal).delay(120)}
          style={styles.statRow}
        >
          <Stat value={String(stats.streakDays)} label={stats.streakDays === 1 ? "dia seguido" : "dias seguidos"} icon="flame" />
          <Stat value={`${Math.round(stats.overallSuccessRate * 100)}%`} label="de acerto" icon="checkmark-circle" />
          <Stat value={String(stats.totalMinutes)} label="minutos" icon="time" />
        </Animated.View>

        {/* Semana */}
        <Animated.View entering={FadeInDown.duration(duration.normal).delay(180)}>
          <Card>
            <Text style={[type.overline, { color: color.ink400 }]}>Sua semana</Text>
            <WeekBars data={weekly} />
            <Text style={[type.caption, { color: color.ink500, marginTop: space.sm }]}>
              {stats.sessionsThisWeek === 0
                ? "Nenhuma sessão nos últimos 7 dias."
                : `${stats.sessionsThisWeek} ${stats.sessionsThisWeek === 1 ? "sessão" : "sessões"} nos últimos 7 dias.`}
            </Text>
          </Card>
        </Animated.View>

        {/* Recomendação */}
        {recommended ? (
          <Animated.View entering={FadeInDown.duration(duration.normal).delay(240)}>
            <Text style={[type.overline, styles.sectionTitle]}>Recomendado para hoje</Text>
            <ExerciseCard
              exercise={recommended}
              featured
              mastered={stats.masteredExercises.includes(recommended.id)}
              onPress={() => router.push(`/training/${recommended.id}`)}
            />
          </Animated.View>
        ) : null}

        {/* Catálogo */}
        <Animated.View entering={FadeInDown.duration(duration.normal).delay(300)}>
          <Text style={[type.overline, styles.sectionTitle]}>Todos os treinos</Text>
          <View style={styles.exerciseList}>
            {EXERCISE_LIST.filter((e) => e.id !== recommended?.id).map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                mastered={stats.masteredExercises.includes(exercise.id)}
                onPress={() => router.push(`/training/${exercise.id}`)}
              />
            ))}
          </View>
        </Animated.View>

        {/* Última sessão */}
        {stats.lastSession ? (
          <Animated.View entering={FadeInDown.duration(duration.normal).delay(360)}>
            <Text style={[type.overline, styles.sectionTitle]}>Última sessão</Text>
            <Card>
              <View style={styles.lastRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.subheading, { color: color.bone }]}>
                    {EXERCISES[stats.lastSession.exerciseId].name}
                  </Text>
                  <Text style={[type.bodySmall, { color: color.ink400 }]}>
                    {relativeDay(stats.lastSession.startedAt)} ·{" "}
                    {stats.lastSession.successCount} de {stats.lastSession.totalReps} acertos
                  </Text>
                </View>
                <Text style={[type.stat, { color: color.sage400, fontSize: 22 }]}>
                  {Math.round(stats.lastSession.successRate * 100)}%
                </Text>
              </View>
            </Card>
          </Animated.View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Stat({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Card style={styles.stat}>
      <Ionicons name={icon} size={16} color={color.alpha500} />
      {/* tabular-nums: sem isto o número dança quando muda de 9 para 10. */}
      <Text style={[type.stat, styles.statValue]}>{value}</Text>
      <Text style={[type.caption, { color: color.ink400 }]} numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function WeekBars({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const today = new Date().getDay();

  return (
    <View style={styles.week}>
      {data.map((count, i) => {
        // data[6] é hoje; andando para trás no calendário.
        const weekday = (today - (6 - i) + 7) % 7;
        const isToday = i === 6;
        return (
          <View key={i} style={styles.dayCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${(count / max) * 100}%`,
                    backgroundColor: count > 0 ? color.alpha500 : color.ink700,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                type.caption,
                { color: isToday ? color.alpha500 : color.ink500 },
              ]}
            >
              {WEEKDAYS[weekday]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ExerciseCard({
  exercise,
  onPress,
  featured,
  mastered,
}: {
  exercise: Exercise;
  onPress: () => void;
  featured?: boolean;
  mastered?: boolean;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card raised={featured} style={styles.exercise}>
        <View style={styles.exerciseHead}>
          <View style={{ flex: 1 }}>
            <View style={styles.exerciseTitleRow}>
              <Text style={[type.heading, { color: color.bone }]}>{exercise.name}</Text>
              {mastered ? (
                <View style={styles.masteredPill}>
                  <Ionicons name="checkmark" size={10} color={color.ink900} />
                  <Text style={styles.masteredText}>Dominado</Text>
                </View>
              ) : null}
            </View>
            <Text style={[type.bodySmall, { color: color.ink400 }]}>{exercise.tagline}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={color.ink500} />
        </View>

        <View style={styles.meta}>
          <Meta icon="barbell" text={DIFFICULTY_LABEL[exercise.difficulty]} />
          <Meta icon="time" text={`${exercise.minutes} min`} />
          <Meta icon="repeat" text={`${exercise.reps} repetições`} />
        </View>
      </Card>
    </Pressable>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={12} color={color.ink500} />
      <Text style={[type.caption, { color: color.ink400 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: space.xl, gap: space.lg, paddingBottom: space["4xl"] },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: space.lg },
  progressCard: { flexDirection: "row", alignItems: "center", gap: space.lg },
  progressText: { flex: 1 },
  statRow: { flexDirection: "row", gap: space.md },
  stat: { flex: 1, gap: space.xs, paddingVertical: space.lg },
  statValue: { color: color.bone, fontSize: 22, fontVariant: ["tabular-nums"] },
  sectionTitle: { color: color.ink400, marginTop: space.md, marginBottom: space.md },
  week: { flexDirection: "row", gap: space.sm, marginTop: space.md, height: 64 },
  dayCol: { flex: 1, alignItems: "center", gap: space.xs },
  barTrack: { flex: 1, width: "100%", justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: radius.sm, minHeight: 4 },
  exerciseList: { gap: space.md },
  exercise: { gap: space.md },
  exerciseHead: { flexDirection: "row", alignItems: "center", gap: space.md },
  exerciseTitleRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  masteredPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: color.sage400,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  masteredText: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: color.ink900 },
  meta: { flexDirection: "row", gap: space.lg },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  lastRow: { flexDirection: "row", alignItems: "center", gap: space.md },
});
