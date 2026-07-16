import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { color, easing, radius, space, type } from "../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
};

const BG: Record<Variant, string> = {
  primary: color.alpha500,
  secondary: color.ink700,
  ghost: "transparent",
  danger: "transparent",
};

const FG: Record<Variant, string> = {
  primary: color.ink900,
  secondary: color.bone,
  ghost: color.ink300,
  danger: color.warn500,
};

/**
 * Botão.
 *
 * Encolhe ao toque com mola e dispara háptico. Os dois juntos são o que
 * diferencia um app que parece nativo de um que parece site: o dedo cobre o
 * botão, então a confirmação precisa ser física, não visual.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  fullWidth = true,
}: Props) {
  const scale = useSharedValue(1);
  const inactive = disabled || loading;

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        if (inactive) return;
        scale.value = withSpring(0.96, easing.spring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, easing.springBouncy);
      }}
      onPress={() => {
        if (inactive) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[
        styles.base,
        style,
        {
          backgroundColor: BG[variant],
          opacity: inactive ? 0.45 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        variant === "ghost" && styles.ghost,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[type.subheading, { color: FG[variant] }]}>{label}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    // 52 confortavelmente acima do mínimo de 44pt: o tutor toca com uma mão só,
    // muitas vezes com o cão puxando a guia na outra.
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
  },
  ghost: {
    borderWidth: 1,
    borderColor: color.ink700,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
});
