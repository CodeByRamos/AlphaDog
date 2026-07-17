import Svg, { Path } from "react-native-svg";
import { color } from "../theme";

/**
 * Marca AlphaDog.
 *
 * Mesmo path do site (apps/website/src/components/brand/logo.tsx): um escudo
 * que também lê como cabeça de cão, com um chevron ascendente vazado — o "A" de
 * Alpha, uma divisa de patente e uma seta de evolução ao mesmo tempo.
 *
 * O `evenodd` é o que recorta o chevron; sem ele o vazado some.
 */
const MARK = `M8 14 L10.5 3 L20.5 14 L27.5 14 L37.5 3 L40 14
  C40 30 33 38.5 24 43 C15 38.5 8 30 8 14 Z
  M24 16 L34 27 L28.2 32.4 L24 27.4 L19.8 32.4 L14 27 Z`;

export function Logo({ size = 32, tint = color.alpha500 }: { size?: number; tint?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d={MARK} fill={tint} fillRule="evenodd" />
    </Svg>
  );
}
