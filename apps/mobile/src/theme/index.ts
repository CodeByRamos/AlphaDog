/**
 * Design system do app.
 *
 * Mesma marca do site — ink, alpha, trust, sage, bone —, mas o app é uma
 * superfície diferente: mais escuro, mais contraste, feito para ser usado numa
 * mão só, ao ar livre, com o cão puxando a guia.
 *
 * Nada de valor solto nos componentes. Se um número aparece duas vezes na UI,
 * ele mora aqui.
 */

export const color = {
  // Base — o app é escuro. Treino acontece em varanda, quintal, sol forte:
  // fundo escuro com texto claro tem mais contraste efetivo que o inverso, e
  // não ofusca à noite.
  ink950: "#05070B",
  ink900: "#0B0E14",
  ink800: "#121826",
  ink700: "#1D2438",
  ink600: "#2E3650",
  ink500: "#47506B",
  ink400: "#6B7490",
  ink300: "#9AA1B4",
  ink200: "#C9CDD8",
  ink100: "#E8EAEF",

  // Âmbar — recompensa, progresso, ação. É a cor do "faça isso".
  alpha600: "#D98A22",
  alpha500: "#F0A73C",
  alpha400: "#F3B24F",
  alpha300: "#F6BE69",
  alpha100: "#FDEACD",

  // Sage — acerto confirmado. Só aparece quando o cão realmente fez.
  sage600: "#327264",
  sage500: "#3E8E7E",
  sage400: "#57A48F",

  // Trust — informação secundária, estados neutros.
  trust500: "#2B3A67",
  trust400: "#5468A0",
  trust300: "#7F93C2",

  // Aviso — cão saiu da posição, câmera perdeu. Não é erro do tutor.
  warn500: "#D97A3C",

  bone: "#F7F5F1",
  white: "#FFFFFF",
} as const;

/**
 * Escala de espaçamento, base 4.
 *
 * Alvo de toque mínimo é 44pt (iOS HIG). Nada clicável abaixo disso.
 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * Tipografia.
 *
 * Sora nos números e títulos (geométrica, autoritária), Inter no corpo. Os
 * pesos são só os que a fonte tem carregada — pedir 600 de uma fonte sem 600
 * faz o RN sintetizar e o resultado fica sujo.
 */
export const font = {
  display: "Sora_700Bold",
  displayExtra: "Sora_800ExtraBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
} as const;

export const type = {
  hero: { fontFamily: font.displayExtra, fontSize: 34, lineHeight: 38, letterSpacing: -0.8 },
  title: { fontFamily: font.displayExtra, fontSize: 26, lineHeight: 31, letterSpacing: -0.5 },
  heading: { fontFamily: font.display, fontSize: 20, lineHeight: 25, letterSpacing: -0.3 },
  subheading: { fontFamily: font.bodySemi, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: font.body, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: font.bodySemi, fontSize: 13, lineHeight: 17 },
  caption: { fontFamily: font.body, fontSize: 12, lineHeight: 16 },
  // Números de estatística: tabular para não dançar quando o valor muda.
  stat: { fontFamily: font.displayExtra, fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
  overline: {
    fontFamily: font.bodySemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
} as const;

/**
 * Durações de animação.
 *
 * Abaixo de ~120ms o olho não registra transição, acima de ~400ms parece lento.
 * Feedback de treino usa `instant`: o tutor precisa reagir junto com o cão.
 */
export const duration = {
  instant: 120,
  fast: 200,
  normal: 300,
  slow: 450,
} as const;

/** Curva padrão. Saída rápida, chegada suave — parece físico, não linear. */
export const easing = {
  out: [0.25, 1, 0.5, 1] as const,
  spring: { damping: 18, stiffness: 180, mass: 0.9 },
  springBouncy: { damping: 12, stiffness: 200, mass: 0.8 },
} as const;

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  lift: {
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
} as const;
