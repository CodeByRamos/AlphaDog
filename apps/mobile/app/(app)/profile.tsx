import { formatWeight, possessive } from "@alphadog/core";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Field } from "../../src/components/Field";
import { Screen } from "../../src/components/Screen";
import { updateDog, uploadDogPhoto } from "../../src/data/dogs";
import { useDogData } from "../../src/features/dashboard/useDogData";
import { BREEDS, parseWeightKg } from "../../src/features/onboarding/steps";
import { useAuth } from "../../src/state/auth";
import { color, duration, radius, space, type } from "../../src/theme";

const ENERGY_LABEL: Record<string, string> = {
  calm: "Calmo",
  moderate: "Moderado",
  high: "Agitado",
  very_high: "Elétrico",
};

const EXPERIENCE_LABEL: Record<string, string> = {
  none: "Nunca treinou",
  basic: "Sabe o básico",
  intermediate: "Já sabe bastante",
};

const AGE_LABEL: Record<string, string> = {
  puppy: "Filhote",
  adolescent: "Adolescente",
  adult: "Adulto",
  senior: "Idoso",
};

const GOAL_LABEL: Record<string, string> = {
  obedience: "Um cão obediente",
  fix_behavior: "Resolver um problema",
  socialize: "Socializar",
  tricks: "Ensinar truques",
  bond: "Nos conectar melhor",
};

export default function ProfileScreen() {
  const { dog, stats, isLoading } = useDogData();
  const { signOut, session } = useAuth();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [weightText, setWeightText] = useState("");
  const [weightError, setWeightError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      updateDog(dog!.id, {
        name: name.trim(),
        weightGrams: weightText.trim() ? parseWeightKg(weightText) : dog!.weightGrams,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dogs"] });
      setEditing(false);
    },
  });

  const photo = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error("permission");

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (picked.canceled || !picked.assets[0]) return null;

      const url = await uploadDogPhoto(session!.user.id, dog!.id, picked.assets[0].uri);
      return updateDog(dog!.id, { photoUrl: url });
    },
    onSuccess: async (result) => {
      if (result) await queryClient.invalidateQueries({ queryKey: ["dogs"] });
    },
    onError: (err) => {
      Alert.alert(
        "Não foi possível trocar a foto",
        err instanceof Error && err.message === "permission"
          ? "Autorize o acesso às fotos nas configurações."
          : "Tente de novo em instantes.",
      );
    },
  });

  if (isLoading || !dog) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={color.alpha500} />
      </Screen>
    );
  }

  function startEditing() {
    setName(dog!.name);
    setWeightText(dog!.weightGrams ? String(dog!.weightGrams / 1000).replace(".", ",") : "");
    setWeightError(null);
    setEditing(true);
  }

  return (
    <Screen bottomInset={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(duration.normal)} style={styles.hero}>
          <Pressable
            onPress={() => photo.mutate()}
            disabled={photo.isPending}
            accessibilityRole="button"
            accessibilityLabel="Trocar foto"
            style={styles.avatarWrap}
          >
            {dog.photoUrl ? (
              <Image source={{ uri: dog.photoUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarEmpty]}>
                <Ionicons name="paw" size={34} color={color.ink500} />
              </View>
            )}
            <View style={styles.avatarBadge}>
              {photo.isPending ? (
                <ActivityIndicator size="small" color={color.ink900} />
              ) : (
                <Ionicons name="camera" size={14} color={color.ink900} />
              )}
            </View>
          </Pressable>

          <Text style={[type.title, { color: color.bone }]}>{dog.name}</Text>
          <Text style={[type.body, { color: color.ink400 }]}>
            {BREEDS.find((b) => b.value === dog.breedSlug)?.label ?? "SRD"} ·{" "}
            {AGE_LABEL[dog.ageGroup]}
          </Text>
        </Animated.View>

        {editing ? (
          <Animated.View entering={FadeInDown.duration(duration.fast)}>
            <Card style={{ gap: space.lg }}>
              <Field label="Nome" value={name} onChangeText={setName} maxLength={40} />
              <Field
                label="Peso"
                value={weightText}
                onChangeText={(t) => {
                  setWeightText(t);
                  setWeightError(
                    t.trim() && parseWeightKg(t) === null ? "Peso entre 0,5 e 120 kg" : null,
                  );
                }}
                error={weightError}
                suffix="kg"
                keyboardType="decimal-pad"
              />
              <View style={styles.editRow}>
                <Button label="Cancelar" variant="secondary" onPress={() => setEditing(false)} />
                <Button
                  label="Salvar"
                  onPress={() => save.mutate()}
                  loading={save.isPending}
                  disabled={!name.trim() || !!weightError}
                />
              </View>
            </Card>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(duration.normal).delay(60)}>
            <Card style={{ gap: space.md }}>
              <Row label="Peso" value={formatWeight(dog.weightGrams)} />
              <Row label="Energia" value={ENERGY_LABEL[dog.energyLevel] ?? "—"} />
              <Row label="Experiência" value={EXPERIENCE_LABEL[dog.experienceLevel] ?? "—"} />
              <Row label="Objetivo" value={GOAL_LABEL[dog.goal] ?? "—"} />
              <Button label="Editar" variant="secondary" onPress={startEditing} />
            </Card>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(duration.normal).delay(120)}>
          <Text style={[type.overline, styles.section]}>Evolução</Text>
          <Card style={styles.evolution}>
            <Evo value={String(stats.totalSessions)} label="sessões" />
            <Evo value={String(stats.masteredExercises.length)} label="dominados" />
            <Evo value={`${stats.totalMinutes}min`} label="treinando" />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(duration.normal).delay(180)}>
          <Text style={[type.overline, styles.section]}>Conta</Text>
          <Card style={{ gap: space.md }}>
            <Row label="E-mail" value={session?.user.email ?? "—"} />
            <Button
              label="Sair"
              variant="danger"
              onPress={() => {
                Alert.alert("Sair da conta?", `O progresso ${possessive(dog)} ${dog.name} fica salvo.`, [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Sair", style: "destructive", onPress: () => void signOut() },
                ]);
              }}
            />
          </Card>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={[type.bodySmall, { color: color.ink400 }]}>{label}</Text>
      <Text style={[type.subheading, { color: color.bone }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Evo({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Text style={[type.stat, { color: color.bone, fontSize: 22 }]}>{value}</Text>
      <Text style={[type.caption, { color: color.ink400 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: space.xl, gap: space.lg, paddingBottom: space["4xl"] },
  hero: { alignItems: "center", gap: space.sm, paddingVertical: space.lg },
  avatarWrap: { marginBottom: space.sm },
  avatar: { width: 96, height: 96, borderRadius: radius.pill, backgroundColor: color.ink800 },
  avatarEmpty: { alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: color.ink700 },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: color.alpha500,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: color.ink900,
  },
  section: { color: color.ink400, marginTop: space.md, marginBottom: space.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.lg },
  editRow: { flexDirection: "row", gap: space.md },
  evolution: { flexDirection: "row", justifyContent: "space-around", paddingVertical: space.lg },
});
