/**
 * Catálogo de exercícios e máquina de estado da sessão.
 *
 * Um frame não é um exercício. "Senta" não é "houve um frame sentado" — é "o
 * cão sentou e permaneceu". Esta camada existe porque:
 *   1. detecção pisca; um frame ruim entre vinte bons não é falha
 *   2. exercícios têm duração
 *   3. feedback precisa de histerese — anunciar sucesso e voltar atrás no frame
 *      seguinte destrói a confiança do tutor
 */

import type { Posture, PostureReading } from "./posture";

export type ExerciseId = "sit" | "paw" | "down";

export type ExerciseStep = {
  title: string;
  body: string;
};

export type Exercise = {
  id: ExerciseId;
  name: string;
  /** Frase curta para o card. */
  tagline: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  /** Minutos típicos por sessão. */
  minutes: number;
  /** Postura que o detector precisa confirmar. */
  target: Posture;
  /** Segundos de permanência para contar como acerto. */
  holdSeconds: number;
  /** Repetições para concluir a sessão. */
  reps: number;
  steps: ExerciseStep[];
  /** Erro comum, mostrado antes de começar. */
  tip: string;
};

export const DIFFICULTY_LABEL: Record<Exercise["difficulty"], string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
};

export const EXERCISES: Record<ExerciseId, Exercise> = {
  sit: {
    id: "sit",
    name: "Sentar",
    tagline: "A base de tudo",
    description:
      "O primeiro comando de todo cão. Sentar é a posição neutra a partir da qual quase todo outro exercício começa — e é o jeito mais rápido de o seu cão aprender que prestar atenção em você compensa.",
    difficulty: "easy",
    minutes: 10,
    target: "sitting",
    holdSeconds: 2,
    reps: 5,
    tip: "Não empurre o bumbum dele para baixo. O cão precisa descobrir o movimento sozinho para aprender — se você empurra, ele aprende a esperar ser empurrado.",
    steps: [
      {
        title: "Petisco no focinho",
        body: "Segure um petisco fechado na mão, encostado no focinho dele. Deixe cheirar, sem soltar.",
      },
      {
        title: "Levante devagar",
        body: "Mova a mão para cima e um pouco para trás, por cima da cabeça. O nariz sobe, o bumbum desce sozinho.",
      },
      {
        title: "Marque o instante",
        body: 'No segundo em que o bumbum tocar o chão, diga "isso!" e entregue o petisco. O tempo é tudo aqui.',
      },
      {
        title: "Só então nomeie",
        body: 'Depois de acertar algumas vezes, comece a dizer "senta" logo antes de mover a mão.',
      },
    ],
  },
  paw: {
    id: "paw",
    name: "Dar a pata",
    tagline: "Confiança e contato",
    description:
      "Mais que um truque: acostuma o cão a ter a pata tocada, o que facilita corte de unha, limpeza e ida ao veterinário pelo resto da vida.",
    difficulty: "medium",
    minutes: 10,
    // O detector confirma a base: sentado. A pata é pequena e some da câmera
    // com frequência, então o app conta a repetição pelo tutor e usa a visão
    // para garantir que o cão está de fato sentado durante o exercício.
    target: "sitting",
    holdSeconds: 2,
    reps: 5,
    tip: "Se ele não levanta a pata, não puxe. Feche a mão com o petisco dentro e espere — a maioria dos cães tenta a pata depois de desistir do focinho.",
    steps: [
      {
        title: "Comece sentado",
        body: "O cão precisa estar sentado. Se ainda não sabe sentar, treine isso antes.",
      },
      {
        title: "Petisco na mão fechada",
        body: "Feche o petisco no punho e ofereça na altura do peito dele.",
      },
      {
        title: "Espere a pata",
        body: "Ele vai cheirar, lamber, empurrar com o focinho. Não abra. Na hora que a pata encostar na sua mão, abra e entregue.",
      },
      {
        title: "Nomeie o gesto",
        body: 'Quando ele já oferecer a pata sozinho, comece a dizer "pata" antes de estender a mão.',
      },
    ],
  },
  down: {
    id: "down",
    name: "Deitar",
    tagline: "O botão de calma",
    description:
      "É o comando que desliga a agitação. Cão que deita sob comando consegue ficar tranquilo em restaurante, na casa de visita, no veterinário.",
    difficulty: "medium",
    minutes: 12,
    target: "lying",
    holdSeconds: 3,
    reps: 5,
    tip: "Deitar deixa o cão vulnerável. Se ele hesita, não force: treine em lugar calmo, com piso macio, e aceite meio movimento no começo.",
    steps: [
      {
        title: "Comece sentado",
        body: "Peça para sentar primeiro. Deitar a partir de em pé é bem mais difícil.",
      },
      {
        title: "Desça em L",
        body: "Com o petisco no focinho, leve a mão reto para baixo até o chão, e então puxe para frente, para longe dele.",
      },
      {
        title: "Deixe seguir",
        body: "O corpo acompanha o nariz. Quando os cotovelos tocarem o chão, marque e recompense.",
      },
      {
        title: "Aumente o tempo",
        body: "Só depois que ele deitar com facilidade, comece a esperar 1, 2, 3 segundos antes de soltar o petisco.",
      },
    ],
  },
};

export const EXERCISE_LIST: Exercise[] = [EXERCISES.sit, EXERCISES.paw, EXERCISES.down];

export type Feedback =
  | "waiting_for_dog"
  | "not_yet"
  | "hold"
  | "success"
  | "broke_early"
  | "unclear_view";

export type FeedbackEvent = {
  feedback: Feedback;
  /** Segundos restantes de permanência. Alimenta "espere mais dois segundos". */
  remainingSeconds: number;
  reason: string;
};

/** Janela de votação. Ímpar para não haver empate. */
export const VOTE_WINDOW = 5;

/**
 * Votos necessários dentro da janela.
 *
 * 3 de 5 é deliberadamente exigente: a literatura aponta ~38% dos frames como
 * "casos difíceis", e maioria simples deixaria ruído virar sucesso.
 */
export const VOTE_THRESHOLD = 3;

/**
 * Acompanha uma repetição.
 *
 * Stateful de propósito: permanência é, por definição, memória.
 */
export class RepTracker {
  private votes: Posture[] = [];
  private holdingSince: number | null = null;
  private done = false;

  constructor(
    private readonly target: Posture,
    private readonly holdSeconds: number,
  ) {}

  private votedPosture(): Posture {
    if (!this.votes.length) return "unknown";

    const targetVotes = this.votes.filter((p) => p === this.target).length;
    if (targetVotes >= VOTE_THRESHOLD) return this.target;

    // Só declara outra postura com a mesma exigência — senão dois frames ruins
    // derrubariam uma permanência boa.
    for (const candidate of ["standing", "sitting", "lying"] as const) {
      if (candidate === this.target) continue;
      if (this.votes.filter((p) => p === candidate).length >= VOTE_THRESHOLD) {
        return candidate;
      }
    }
    return "unknown";
  }

  /**
   * Consome um frame.
   *
   * `timestamp` em segundos, do relógio de captura — frames chegam irregulares
   * e é o tempo do vídeo que conta, não o de parede.
   */
  update(reading: PostureReading, timestamp: number): FeedbackEvent {
    if (this.done) {
      return { feedback: "success", remainingSeconds: 0, reason: "já concluído" };
    }

    this.votes.push(reading.posture);
    if (this.votes.length > VOTE_WINDOW) this.votes.shift();

    if (this.votes.length < VOTE_WINDOW) {
      return { feedback: "waiting_for_dog", remainingSeconds: 0, reason: "aguardando frames" };
    }

    const voted = this.votedPosture();

    if (voted === "unknown") {
      // Perder a visão não zera a permanência: o cão provavelmente continua
      // parado, e reiniciar puniria o tutor por um frame ruim.
      return { feedback: "unclear_view", remainingSeconds: 0, reason: reading.reason };
    }

    if (voted !== this.target) {
      if (this.holdingSince !== null) {
        this.holdingSince = null;
        return { feedback: "broke_early", remainingSeconds: 0, reason: `saiu para ${voted}` };
      }
      return { feedback: "not_yet", remainingSeconds: 0, reason: `está ${voted}` };
    }

    if (this.holdingSince === null) this.holdingSince = timestamp;

    const elapsed = timestamp - this.holdingSince;
    const remaining = this.holdSeconds - elapsed;

    if (remaining <= 0) {
      this.done = true;
      return { feedback: "success", remainingSeconds: 0, reason: `manteve ${elapsed.toFixed(1)}s` };
    }

    return { feedback: "hold", remainingSeconds: remaining, reason: "mantendo" };
  }

  reset(): void {
    this.votes = [];
    this.holdingSince = null;
    this.done = false;
  }

  get succeeded(): boolean {
    return this.done;
  }
}
