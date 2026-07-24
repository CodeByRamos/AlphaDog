/**
 * Cena de visão computacional dentro do celular do hero.
 *
 * Arte conceitual, não screenshot: comunica em um segundo "o app usa IA para
 * ler a postura do cão". A honestidade fica na seção da câmera (marcada "Em
 * breve") — aqui é a visão do produto, desenhada, não um recurso apresentado
 * como pronto.
 *
 * 100% SVG + CSS (keyframes ad-scan / ad-keypoint / ad-confirm / ad-glow em
 * globals.css). Sem imagem, sem lib. Anima só transform e opacity, e o
 * kill-switch global de prefers-reduced-motion congela tudo.
 *
 * O cão é composto de formas simples com o mesmo preenchimento — sobrepostas,
 * elas se fundem numa silhueta só. É mais confiável que um único path gigante e
 * combina com a estética geométrica/minimalista da marca.
 */

/** Keypoints do esqueleto de pose, sobre a silhueta do cão sentado (perfil). */
const KEYPOINTS: { x: number; y: number; delay: number }[] = [
  { x: 210, y: 216, delay: 0 }, // focinho
  { x: 176, y: 182, delay: 0.2 }, // orelha
  { x: 158, y: 262, delay: 0.4 }, // cernelha (ombro)
  { x: 158, y: 322, delay: 0.6 }, // cotovelo
  { x: 160, y: 384, delay: 0.8 }, // pata dianteira
  { x: 112, y: 296, delay: 0.3 }, // quadril
  { x: 98, y: 356, delay: 0.5 }, // jarrete
  { x: 122, y: 384, delay: 0.7 }, // pata traseira
  { x: 82, y: 302, delay: 0.9 }, // base da cauda
];

/** Ligações do esqueleto (índices em KEYPOINTS). */
const BONES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [2, 5],
  [5, 6],
  [6, 7],
  [5, 8],
];

const scanStyle = {
  animation: "ad-scan 3.4s cubic-bezier(0.45,0,0.55,1) infinite",
} as const;

export function HudScene() {
  return (
    <svg
      viewBox="0 0 276 560"
      className="h-full w-full"
      role="img"
      aria-label="Conceito da análise de postura do cão por visão computacional"
    >
      <defs>
        <linearGradient id="hud-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B0E14" />
          <stop offset="1" stopColor="#05070B" />
        </linearGradient>
        <linearGradient id="hud-scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F0A73C" stopOpacity="0" />
          <stop offset="1" stopColor="#F0A73C" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id="hud-halo" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#2B3A67" stopOpacity="0.55" />
          <stop offset="1" stopColor="#2B3A67" stopOpacity="0" />
        </radialGradient>
        <filter id="hud-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Fundo e halo */}
      <rect width="276" height="560" fill="url(#hud-bg)" />
      <ellipse cx="138" cy="300" rx="150" ry="180" fill="url(#hud-halo)" />

      {/* Grade sutil de HUD */}
      <g stroke="#F0A73C" strokeOpacity="0.05" strokeWidth="1">
        {[100, 160, 220, 280, 340, 400, 460].map((y) => (
          <line key={y} x1="20" y1={y} x2="256" y2={y} />
        ))}
        {[52, 112, 172, 232].map((x) => (
          <line key={x} x1={x} y1="90" x2={x} y2="470" />
        ))}
      </g>

      {/* Barra de status do "modo treino" */}
      <g fontFamily="ui-monospace, monospace">
        <circle cx="30" cy="46" r="3.5" fill="#3E8E7E">
          <animate
            attributeName="opacity"
            values="1;0.3;1"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </circle>
        <text x="42" y="50" fill="#C9CDD8" fontSize="11" fontWeight="600" letterSpacing="1.5">
          MODO TREINO
        </text>
        <text x="246" y="50" fill="#6B7490" fontSize="10" textAnchor="end" letterSpacing="1">
          24 fps
        </text>
      </g>

      {/* --- Silhueta do cão sentado (perfil, focinho à direita) ---
          Um corpo em path contínuo (garupa sentada -> dorso -> peito), com pernas,
          cabeça e cauda por cima. Mais legível que elipses soltas. */}
      <g fill="#1E2742" stroke="#3A4A72" strokeWidth="1.5" strokeLinejoin="round">
        {/* cauda, atrás da garupa */}
        <path d="M80 300 q-30 10 -34 54 q15 7 26 -7 q7 -22 22 -30 z" />
        {/* garupa sentada, apoiada no chão */}
        <path d="M72 386 C66 338 80 298 110 292 C138 287 150 314 141 342 C135 364 120 382 98 386 Z" />
        {/* peito + perna dianteira: coluna vertical até o chão */}
        <path d="M140 336 C150 316 150 296 153 268 L170 268 C172 300 172 344 170 386 L146 386 C146 362 146 348 140 336 Z" />
        {/* segunda perna, levemente atrás */}
        <rect x="126" y="330" width="12" height="56" rx="6" fillOpacity="0.8" />
        {/* pescoço + cabeça */}
        <path d="M150 272 q4 -42 32 -52 l8 40 q-22 8 -26 30 z" />
        <circle cx="182" cy="214" r="28" />
        {/* focinho à direita */}
        <path d="M206 206 q24 1 27 15 q-4 13 -27 13 q-11 -13 0 -28 z" />
        {/* orelha */}
        <path d="M168 190 q-12 -20 4 -32 q18 4 16 28 q-10 8 -20 4 z" />
      </g>

      {/* linha do chão — pequenas marcas */}
      <line x1="60" y1="386" x2="216" y2="386" stroke="#3A4A72" strokeWidth="1.5" strokeDasharray="2 6" />

      {/* --- Esqueleto de pose --- */}
      <g stroke="#F0A73C" strokeOpacity="0.6" strokeWidth="1.5">
        {BONES.map(([a, b], i) => (
          <line
            key={i}
            x1={KEYPOINTS[a].x}
            y1={KEYPOINTS[a].y}
            x2={KEYPOINTS[b].x}
            y2={KEYPOINTS[b].y}
          />
        ))}
      </g>

      {/* Keypoints pulsando */}
      <g filter="url(#hud-glow)">
        {KEYPOINTS.map((kp, i) => (
          <circle
            key={i}
            cx={kp.x}
            cy={kp.y}
            r="3.4"
            fill="#F6BE69"
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              animation: `ad-keypoint 2.2s ease-in-out ${kp.delay}s infinite`,
            }}
          />
        ))}
      </g>

      {/* --- Caixa delimitadora com cantos em L --- */}
      <g stroke="#F3B24F" strokeWidth="2" fill="none" strokeLinecap="round">
        {/* cantos */}
        <path d="M58 118 l0 -18 l18 0" />
        <path d="M218 100 l18 0 l0 18" />
        <path d="M58 384 l0 18 l18 0" />
        <path d="M218 402 l18 0 l0 -18" />
        <rect x="58" y="100" width="178" height="302" strokeOpacity="0.25" strokeWidth="1" />
      </g>
      <text
        x="62"
        y="94"
        fill="#F3B24F"
        fontSize="10"
        fontFamily="ui-monospace, monospace"
        letterSpacing="1"
      >
        POSE · 24 pts
      </text>

      {/* --- Linha de varredura --- */}
      <g style={{ transform: "translateY(100px)" }}>
        <g style={scanStyle}>
          <rect x="58" y="-26" width="178" height="26" fill="url(#hud-scan)" opacity="0.5" />
          <line x1="58" y1="0" x2="236" y2="0" stroke="#F0A73C" strokeWidth="2" />
        </g>
      </g>

      {/* --- Selo de confirmação do comando --- */}
      <g
        style={{
          transformBox: "view-box",
          transformOrigin: "center",
          animation: "ad-confirm 3.4s ease-out infinite",
        }}
      >
        <rect x="60" y="486" width="156" height="40" rx="12" fill="#121826" stroke="#3E8E7E" strokeWidth="1.5" />
        <circle cx="84" cy="506" r="11" fill="#3E8E7E" />
        <path d="M79 506 l4 4 l7 -8" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="104" y="502" fill="#fff" fontSize="13" fontFamily="ui-sans-serif, sans-serif" fontWeight="700">
          Senta
        </text>
        <text x="104" y="516" fill="#9AA1B4" fontSize="10" fontFamily="ui-monospace, monospace">
          postura confirmada · 98%
        </text>
      </g>
    </svg>
  );
}
