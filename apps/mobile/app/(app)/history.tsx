import { EXERCISES, EXERCISE_LIST, type TrainingRecord } from "@alphadog/core";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card } from "../../src/components/Card";
import { Screen } from "../../src/components/Screen";
import { relativeDay } from "../../src/features/dashboard/greeting";
import { useDogData } from "../../src/features/dashboard/useDogData";
import { color, duration, radius, space, type } from "../../src/theme";

export default function HistoryScreen() {
  const { dog, sessions, stats, isLoading, isRefetching, refetch } = useDogData();

  if (isLoading || !dog) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={color.alpha500} />
      </Screen>
    );
  }

  return (
    <Screen bottomInset={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={color.alpha500} />
        }
      >
        <Animated.View entering={FadeInDown.duration(duration.normal)}>
          <Text style={[type.title, { color: color.bone }]}>Progresso</Text>
          <Text style={[type.body, { color: color.ink400, marginTop: 4 }]}>
            Tudo que {dog.name} já treinou.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(duration.normal).delay(60)} style={styles.grid}>
          <Big value={String(stats.totalSessions)} label="sessões" />
          <Big value={`${stats.totalMinutes}min`} label="treinando" />
          <Big value={`${Math.round(stats.overallSuccessRate * 100)}%`} label="de acerto" />
          <Big value={String(stats.streakDays)} label={stats.streakDays === 1 ? "dia seguido" : "dias seguidos"} />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(duration.normal).delay(120)}>
          <Text style={[type.overline, styles.section]}>Comandos</Text>
          <Card style={{ gap: space.md }}>
            {EXERCISE_LIST.map((exercise) => {
              const mastered = stats.masteredExercises.includes(exercise.id);
              const done = sessions.filter((s) => s.exerciseId === exercise.id);
              const best = done.length
                ? Math.max(...done.map((s) => s.successRate))
                : 0;

              return (
                <View key={exercise.id} style={styles.cmdRow}>
                  <View
                    style={[
                      styles.cmdDot,
                      { backgroundColor: mastered ? color.sage400 : color.ink600 },
                    ]}
                  >
                    {mastered ? (
                      <Ionicons name="checkmark" size={12} color={color.ink900} />
                    ) : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.subheading, { color: color.bone }]}>{exercise.name}</Text>
                    <Text style={[type.caption, { color: color.ink500 }]}>
                      {done.length === 0
                        ? "Ainda não treinado"
                        : `${done.length} ${done.length === 1 ? "sessão" : "sessões"} · melhor ${Math.round(best * 100)}%`}
                    </Text>
                  </View>
                  {mastered ? (
                    <Text style={[type.caption, { color: color.sage400 }]}>Dominado</Text>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(duration.normal).delay(180)}>
          <Text style={[type.overline, styles.section]}>Sessões</Text>
          {sessions.length === 0 ? (
            <Card style={styles.empty}>
              <Ionicons name="calendar-outline" size={30} color={color.ink500} />
              <Text style={[type.body, { color: color.ink400, textAlign: "center" }]}>
                Nenhuma sessão ainda. A primeira aparece aqui.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: space.sm }}>
              {sessions.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

function SessionRow({ session }: { session: TrainingRecord }) {
  const rate = Math.round(session.successRate * 100);
  // Verde só a partir de 80%: é o mesmo limiar de "dominado". Pintar 50% de
  // verde diria ao tutor que meio acerto é bom.
  const tint = rate >= 80 ? color.sage400 : rate >= 50 ? color.alpha500 : color.ink400;

  return (
    <Card style={styles.sessionRow}>
      <View style={styles.sessionIcon}>
        <Ionicons
          name={session.completed ? "checkmark-done" : "pause"}
          size={15}
          color={color.ink300}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.subheading, { color: color.bone }]}>
          {EXERCISES[session.exerciseId].name}
        </Text>
        <Text style={[type.caption, { color: color.ink500 }]}>
          {relativeDay(session.startedAt)} · {session.successCount}/{session.totalReps} ·{" "}
          {Math.round(session.durationSeconds / 60)}min
        </Text>
      </View>
      <Text style={[type.subheading, { color: tint, fontVariant: ["tabular-nums"] }]}>
        {rate}%
      </Text>
    </Card>
  );
}

function Big({ value, label }: { value: string; label: string }) {
  return (
    <Card style={styles.big}>
      <Text style={[type.stat, { color: color.bone, fontVariant: ["tabular-nums"] }]}>
        {value}
      </Text>
      <Text style={[type.caption, { color: color.ink400 }]}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: space.xl, gap: space.lg, paddingBottom: space["4xl"] },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  big: { width: "47%", flexGrow: 1, gap: 2, paddingVertical: space.lg },
  section: { color: color.ink400, marginTop: space.md, marginBottom: space.md },
  cmdRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  cmdDot: { width: 22, height: 22, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  sessionRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  sessionIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: color.ink700,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", gap: space.md, paddingVertical: space["2xl"] },
});
