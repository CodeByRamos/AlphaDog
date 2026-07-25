import type { Detection } from "@alphadog/core";
import { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { color, easing, radius } from "../../theme";

/**
 * Contorno animado sobre o cão detectado.
 *
 * A moldura da mira é decorativa; esta caixa é a leitura real do modelo. É o que
 * transforma a tela de "animação bonita" em "a IA está vendo o meu cão" — e por
 * isso ela precisa seguir o animal de verdade, não uma posição fixa.
 *
 * Anima com mola em vez de saltar entre posições: a detecção varia alguns pixels
 * a cada quadro, e mover direto faria a caixa tremer. A mola absorve o ruído sem
 * introduzir atraso perceptível.
 *
 * Roda inteiro na UI thread do Reanimated: a caixa se move mesmo enquanto o JS
 * está ocupado montando a próxima repetição.
 */

type Props = {
  detection: Detection | null;
  /** Dimensões do frame de onde a caixa veio. */
  frameWidth: number;
  frameHeight: number;
  /** Alvo confirmado — muda a cor para o verde de acerto. */
  locked?: boolean;
  /** Desenha os keypoints visíveis. Só em desenvolvimento. */
  showKeypoints?: boolean;
};

/**
 * O preview da câmera preenche a tela cortando o excesso (cover). Para a caixa
 * cair sobre o cão, o mesmo corte precisa ser aplicado às coordenadas: escala
 * pelo maior fator e desloca metade do que sobrou.
 */
function coverTransform(
  frameW: number,
  frameH: number,
  screenW: number,
  screenH: number,
) {
  if (frameW <= 0 || frameH <= 0) return { scale: 1, offsetX: 0, offsetY: 0 };
  const scale = Math.max(screenW / frameW, screenH / frameH);
  return {
    scale,
    offsetX: (screenW - frameW * scale) / 2,
    offsetY: (screenH - frameH * scale) / 2,
  };
}

export function DogOutline({
  detection,
  frameWidth,
  frameHeight,
  locked,
  showKeypoints,
}: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const w = useSharedValue(0);
  const h = useSharedValue(0);
  const visible = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!detection) {
      // Some suave: piscar a cada quadro perdido daria a impressão de detecção
      // instável, mesmo quando o cão continua ali.
      visible.value = withTiming(0, { duration: 260 });
      return;
    }

    const { scale, offsetX, offsetY } = coverTransform(
      frameWidth,
      frameHeight,
      screenW,
      screenH,
    );
    const box = detection.box;

    x.value = withSpring(box.x * scale + offsetX, easing.spring);
    y.value = withSpring(box.y * scale + offsetY, easing.spring);
    w.value = withSpring(box.width * scale, easing.spring);
    h.value = withSpring(box.height * scale, easing.spring);
    visible.value = withTiming(1, { duration: 200 });
  }, [detection, frameWidth, frameHeight, screenW, screenH, x, y, w, h, visible]);

  // Respiro contínuo na borda: sinal de que a leitura está viva, sem competir
  // com o cão pela atenção.
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const boxStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ translateX: x.value }, { translateY: y.value }],
    width: w.value,
    height: h.value,
  }));

  const edgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.55, 1]),
  }));

  const accent = locked ? color.sage400 : color.alpha400;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.box, boxStyle]}>
        <Animated.View
          style={[styles.edge, { borderColor: accent }, edgeStyle]}
        />
        {/* Cantos reforçados: leem como mira mesmo sobre fundo claro. */}
        <View style={[styles.corner, styles.ctl, { borderColor: accent }]} />
        <View style={[styles.corner, styles.ctr, { borderColor: accent }]} />
        <View style={[styles.corner, styles.cbl, { borderColor: accent }]} />
        <View style={[styles.corner, styles.cbr, { borderColor: accent }]} />

        {showKeypoints && detection
          ? detection.keypoints.map((kp, i) => {
              if (kp.confidence < 0.5) return null;
              const { scale, offsetX, offsetY } = coverTransform(
                frameWidth,
                frameHeight,
                screenW,
                screenH,
              );
              // Relativo à caixa, que já está posicionada.
              const left = kp.x * scale + offsetX - (detection.box.x * scale + offsetX);
              const top = kp.y * scale + offsetY - (detection.box.y * scale + offsetY);
              return (
                <View
                  key={i}
                  style={[styles.keypoint, { left, top, backgroundColor: accent }]}
                />
              );
            })
          : null}
      </Animated.View>
    </View>
  );
}

const CORNER = 18;

const styles = StyleSheet.create({
  box: { position: "absolute", top: 0, left: 0 },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderRadius: radius.sm,
  },
  corner: { position: "absolute", width: CORNER, height: CORNER },
  ctl: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  ctr: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cbl: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cbr: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  keypoint: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 3,
    marginLeft: -2.5,
    marginTop: -2.5,
    opacity: 0.9,
  },
});
