import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { color, duration, easing, radius, space, type } from "../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  label: string;
  hint?: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
  /** Mostra caixa de seleção em vez de avançar sozinho. */
  multi?: boolean;
};

/**
 * Cartão de escolha do onboarding.
 *
 * A borda e o fundo animam juntos: trocar cor sem transição faz a seleção
 * parecer um bug de render em vez de resposta ao toque.
 */
export function OptionCard({ label, hint, emoji, selected, onPress, multi }: Props) {
  const scale = useSharedValue(1);
  const progress = useSharedValue(selected ? 1 : 0);

  progress.value = withTiming(selected ? 1 : 0, { duration: duration.instant });

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: progress.value > 0.5 ? color.alpha500 : color.ink700,
    backgroundColor: progress.value > 0.5 ? "rgba(240,167,60,0.10)" : color.ink800,
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.98, easing.spring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, easing.springBouncy);
      }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole={multi ? "checkbox" : "radio"}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      style={[styles.card, animated]}
    >
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}

      <View style={styles.text}>
        <Text style={[type.subheading, { color: color.bone }]}>{label}</Text>
        {hint ? (
          <Text style={[type.bodySmall, { color: color.ink400, marginTop: 2 }]}>
            {hint}
          </Text>
        ) : null}
      </View>

      {multi ? (
        <View style={[styles.check, selected && styles.checkOn]}>
          {selected ? <Ionicons name="checkmark" size={14} color={color.ink900} /> : null}
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 2,
    borderRadius: radius.md,
    padding: space.lg,
    minHeight: 64,
  },
  emoji: { fontSize: 24 },
  text: { flex: 1 },
  check: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: color.ink600,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: {
    backgroundColor: color.alpha500,
    borderColor: color.alpha500,
  },
});
