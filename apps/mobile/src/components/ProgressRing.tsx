import { useEffect } from "react";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { color, duration } from "../theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** 0..1 */
  progress: number;
  size?: number;
  stroke?: number;
  tint?: string;
  track?: string;
  children?: React.ReactNode;
};

/**
 * Anel de progresso.
 *
 * Anima `strokeDashoffset` via animatedProps, não via estado do React: o valor
 * muda a cada frame durante a transição, e um setState por frame re-renderizaria
 * a árvore 60 vezes por segundo.
 */
export function ProgressRing({
  progress,
  size = 120,
  stroke = 10,
  tint = color.alpha500,
  track = color.ink700,
  children,
}: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: duration.slow,
    });
  }, [progress, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
  }));

  return (
    <Animated.View style={{ width: size, height: size }}>
      {/* -90° para começar às 12h em vez das 3h. */}
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tint}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </Svg>
      {children ? (
        <Animated.View
          style={{
            position: "absolute",
            width: size,
            height: size,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
