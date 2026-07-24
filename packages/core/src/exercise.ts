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

export type ExerciseId =
  | "sit"
  | "paw"
  | "down"
  | "touch"
  | "stay"
  | "come"
  | "heel"
  | "watch"
  | "leave_it"
  | "wait_food"
  | "find_it";

/**
 * Trilha do exercício. Agrupa a biblioteca por objetivo, não por dificuldade —
 * o tutor pensa "quero que ele pare de puxar a guia", não "quero um exercício
 * médio". Agility, socialização e truques avançados entram quando houver o
 * conteúdo (exigem equipamento, outro cão, ou vídeo) — ver ROADMAP.
 */
export type ExerciseCategory =
  | "basico"
  | "obediencia"
  | "autocontrole"
  | "foco"
  | "enriquecimento";

export const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  basico: "Básico",
  obediencia: "Obediência",
  autocontrole: "Autocontrole",
  foco: "Foco",
  enriquecimento: "Enriquecimento",
};

export const CATEGORY_ORDER: ExerciseCategory[] = [
  "basico",
  "obediencia",
  "autocontrole",
  "foco",
  "enriquecimento",
];

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
  category: ExerciseCategory;
  difficulty: "easy" | "medium" | "hard";
  /** Minutos típicos por sessão. */
  minutes: number;
  /** Postura que o detector precisa confirmar. */
  target: Posture;
  /**
   * True quando a câmera não julga este exercício — vir, andar junto, olhar,
   * farejar não são posturas. Hoje todo exercício é marcado pelo tutor (não há
   * modelo), então a flag só muda o futuro: quando a visão entrar, ela assume os
   * de postura (sit/down/stay/place) e deixa estes com o tutor. Ser honesto
   * sobre isso agora evita prometer que a câmera fará o que ela não faz.
   */
  manualOnly?: boolean;
  /** Segundos de permanência para contar como acerto. */
  holdSeconds: number;
  /** Repetições para concluir a sessão. */
  reps: number;
  steps: ExerciseStep[];
  /** Erro comum, mostrado antes de começar. */
  tip: string;
  /** O que significa "dominar" este exercício — o critério concreto de conclusão. */
  completion: string;
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
    category: "basico",
    difficulty: "easy",
    minutes: 10,
    target: "sitting",
    holdSeconds: 2,
    reps: 5,
    tip: "Não empurre o bumbum dele para baixo. O cão precisa descobrir o movimento sozinho para aprender — se você empurra, ele aprende a esperar ser empurrado.",
    completion: "Ele senta ao comando de voz, sem o petisco como isca, em três sessões seguidas com 80% de acerto.",
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
    category: "basico",
    difficulty: "medium",
    minutes: 10,
    // O detector confirma a base: sentado. A pata é pequena e some da câmera
    // com frequência, então o app conta a repetição pelo tutor e usa a visão
    // para garantir que o cão está de fato sentado durante o exercício.
    target: "sitting",
    holdSeconds: 2,
    reps: 5,
    tip: "Se ele não levanta a pata, não puxe. Feche a mão com o petisco dentro e espere — a maioria dos cães tenta a pata depois de desistir do focinho.",
    completion: "Ele oferece a pata ao comando, sem você estender a mão primeiro, em três sessões com 80% de acerto.",
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
    category: "basico",
    difficulty: "medium",
    minutes: 12,
    target: "lying",
    holdSeconds: 3,
    reps: 5,
    tip: "Deitar deixa o cão vulnerável. Se ele hesita, não force: treine em lugar calmo, com piso macio, e aceite meio movimento no começo.",
    completion: "Ele deita ao comando a partir de sentado ou em pé, sem isca, em três sessões com 80% de acerto.",
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
  touch: {
    id: "touch",
    name: "Toca",
    tagline: "O comando que resolve o resto",
    description:
      "O cão encosta o focinho na sua mão sob comando. Parece bobo e é a ferramenta mais versátil do adestramento: reposiciona o cão sem guia, tira o foco de um gatilho, e vira a base para vir, girar e subir na balança do veterinário.",
    category: "foco",
    difficulty: "easy",
    minutes: 8,
    target: "standing",
    manualOnly: true,
    holdSeconds: 1,
    reps: 6,
    tip: "Não persiga o focinho dele com a mão. Ofereça a mão parada e espere ele vir — se você move a mão atrás do nariz, ensina o cão a fugir dela.",
    completion: "Ele encosta o focinho na sua mão assim que você a apresenta, de qualquer ângulo, em três sessões com 80%.",
    steps: [
      {
        title: "Mão aberta ao lado do focinho",
        body: "Mostre a palma da mão a uns 5 cm do nariz dele. A curiosidade faz o cão cheirar — é só o que você precisa.",
      },
      {
        title: "Marque o toque",
        body: 'No instante em que o focinho encosta na palma, diga "isso!" e recompense com a outra mão.',
      },
      {
        title: "Adicione a palavra",
        body: 'Depois de alguns acertos, diga "toca" logo antes de apresentar a mão.',
      },
      {
        title: "Varie a posição",
        body: "Ofereça a mão mais alto, mais baixo, para o lado. O cão aprende a te seguir — é isso que torna o comando útil.",
      },
    ],
  },
  stay: {
    id: "stay",
    name: "Fica",
    tagline: "Autocontrole que vale ouro",
    description:
      "O cão permanece na posição até você liberar. É o freio de mão do adestramento: porta aberta, comida no chão, visita chegando — nada disso vira caos quando o cão sabe ficar.",
    category: "autocontrole",
    difficulty: "hard",
    minutes: 12,
    // A câmera pode confirmar que ele continua sentado; o difícil é a duração, e
    // isso o cronômetro de permanência já mede.
    target: "sitting",
    holdSeconds: 5,
    reps: 5,
    tip: "Não aumente distância e tempo ao mesmo tempo. Primeiro ele fica com você colado por mais tempo; só depois você começa a dar um passo para trás. Subir os dois de uma vez é a receita para ele levantar.",
    completion: "Ele mantém a posição por 10 segundos com você a três passos de distância, em três sessões com 80%.",
    steps: [
      {
        title: "Peça para sentar",
        body: "Comece com o cão sentado e você bem à frente dele.",
      },
      {
        title: "Espere um segundo, marque",
        body: 'Conte "um" na cabeça, e se ele não levantou, diga "isso!" e recompense ainda sentado. Recompensar na posição é o que ensina a ficar.',
      },
      {
        title: "Some tempo devagar",
        body: "Vá para 2, 3, 5 segundos. Se ele levantar, você subiu rápido demais: volte um degrau.",
      },
      {
        title: "Crie a liberação",
        body: 'Escolha uma palavra de solta — "pode" — e diga sempre que a espera acabar. Ele aprende que só sai quando ouve isso.',
      },
    ],
  },
  come: {
    id: "come",
    name: "Vem",
    tagline: "O comando que salva vidas",
    description:
      "O cão volta para você quando chamado, mesmo distraído. É o comando mais importante que existe: é o que traz o cão de volta da rua, do outro cão, do portão aberto. Treina-se para nunca precisar dele numa emergência sem estar pronto.",
    category: "obediencia",
    difficulty: "hard",
    minutes: 10,
    target: "standing",
    manualOnly: true,
    holdSeconds: 1,
    reps: 6,
    tip: 'Nunca chame "vem" para algo ruim — banho, corte de unha, fim do passeio. Se vir até você às vezes termina em algo chato, o cão para de vir. Vir tem que pagar sempre.',
    completion: "Ele vem correndo ao primeiro chamado, com uma distração por perto, em três sessões com 80%.",
    steps: [
      {
        title: "Comece pertinho",
        body: "Com o cão a um metro, diga o nome dele + \"vem\" numa voz animada, e abra os braços.",
      },
      {
        title: "Pague grande",
        body: "Quando ele chegar, festa: petisco bom, voz feliz, carinho. Vir até você tem que ser a melhor coisa do dia.",
      },
      {
        title: "Aumente a distância",
        body: "Vá afastando. Peça ajuda de alguém para segurar e soltar o cão, ou chame de outro cômodo.",
      },
      {
        title: "Adicione distração só no fim",
        body: "Só quando ele vier fácil, treine com um brinquedo no chão por perto. Se ele ignorar você, a distração está forte demais ainda.",
      },
    ],
  },
  heel: {
    id: "heel",
    name: "Junto",
    tagline: "Passeio sem puxar",
    description:
      "O cão caminha ao seu lado com a guia frouxa, em vez de te arrastar. Transforma o passeio de luta de braço em o melhor momento do dia — para você e para ele.",
    category: "obediencia",
    difficulty: "hard",
    minutes: 12,
    target: "standing",
    manualOnly: true,
    holdSeconds: 1,
    reps: 8,
    tip: "Guia esticada nunca anda. No instante em que a guia tensiona, pare como uma árvore. O cão aprende que puxar trava o passeio e guia frouxa faz ele andar. Puxar de volta ensina o contrário.",
    completion: "Ele mantém a guia frouxa por uma quadra inteira, com uma distração no caminho, em três sessões.",
    steps: [
      {
        title: "Comece parado, cão ao lado",
        body: "Com o cão do seu lado esquerdo e sentado, dê um passo. Se ele acompanhar sem esticar, marque e recompense na altura da sua perna.",
      },
      {
        title: "Recompense a posição certa",
        body: "Petisco sempre entregue junto à sua perna, nunca à frente. Você está ensinando onde é bom estar.",
      },
      {
        title: "Pare quando esticar",
        body: "Guia tensionou? Pare. Espere o cão afrouxar (olhar para você, dar um passo atrás). Só então recomece.",
      },
      {
        title: "Some passos",
        body: "Dois passos sem esticar, marque. Depois três, cinco, dez. A conta sobe pela guia frouxa, não pela distância.",
      },
    ],
  },
  watch: {
    id: "watch",
    name: "Olha pra mim",
    tagline: "Atenção sob comando",
    description:
      "O cão faz contato visual com você quando pedido. É a base do foco: um cão que te olha é um cão que não está fixado no outro cachorro, na moto, no gato. Todo comando difícil começa por aqui.",
    category: "foco",
    difficulty: "easy",
    minutes: 6,
    target: "sitting",
    manualOnly: true,
    holdSeconds: 2,
    reps: 6,
    tip: "Não repita o nome dele dez vezes. Diga uma vez e espere. Se ele não olhar em alguns segundos, faça um som curto para chamar a atenção — mas nomear em vão ensina o cão a ignorar o próprio nome.",
    completion: "Ele te olha e sustenta o olhar por 2 segundos ao comando, com algo acontecendo em volta, em três sessões.",
    steps: [
      {
        title: "Petisco à altura dos seus olhos",
        body: "Leve um petisco do focinho dele até perto do seu olho. O olhar sobe junto.",
      },
      {
        title: "Marque o olhar",
        body: 'No segundo em que os olhos encontram os seus, diga "isso!" e entregue.',
      },
      {
        title: "Tire a isca",
        body: 'Comece a dizer "olha" sem levar o petisco ao rosto. Recompense quando ele te olhar mesmo assim.',
      },
      {
        title: "Segure o olhar",
        body: "Espere 1, depois 2 segundos de olho no olho antes de marcar. É a duração que vira foco de verdade.",
      },
    ],
  },
  leave_it: {
    id: "leave_it",
    name: "Deixa",
    tagline: "Ignorar sob comando",
    description:
      "O cão desiste de algo que quer — o petisco no chão, o lixo na calçada, o sapato. É autocontrole puro, e é o que evita do chocolate esquecido na mesa virar emergência no veterinário.",
    category: "autocontrole",
    difficulty: "medium",
    minutes: 8,
    target: "standing",
    manualOnly: true,
    holdSeconds: 1,
    reps: 6,
    tip: "Nunca deixe ele pegar o item proibido como recompensa. O prêmio por deixar vem SEMPRE da sua outra mão, com algo melhor. Se deixar o petisco no chão às vezes deixa ele comer o do chão, o comando não pega.",
    completion: "Ele tira o foco do item ao comando e olha para você, com o item à vista, em três sessões com 80%.",
    steps: [
      {
        title: "Petisco no punho fechado",
        body: "Feche um petisco na mão e ofereça. O cão vai cheirar, lamber, cutucar. Não abra.",
      },
      {
        title: "Espere ele desistir",
        body: 'No instante em que ele para de insistir e recua, diga "isso!" e pague com um petisco MELHOR da outra mão.',
      },
      {
        title: "Adicione a palavra",
        body: 'Quando ele já recuar rápido, diga "deixa" logo antes de mostrar o punho.',
      },
      {
        title: "Leve para o chão",
        body: "Coloque o petisco no chão coberto pela mão. Descubra aos poucos. Se ele avançar, cubra de novo. Marque quando ele recuar.",
      },
    ],
  },
  wait_food: {
    id: "wait_food",
    name: "Espera a comida",
    tagline: "Calma na hora da refeição",
    description:
      "O cão espera sentado antes de comer, em vez de pular na tigela. Transforma a refeição de bagunça diária num exercício grátis de autocontrole — duas vezes por dia, todo dia.",
    category: "autocontrole",
    difficulty: "medium",
    minutes: 5,
    target: "sitting",
    manualOnly: true,
    holdSeconds: 3,
    reps: 4,
    tip: "Se ele levantar quando a tigela desce, a tigela sobe de volta. A comida só encosta no chão enquanto ele fica sentado. Ele aprende em poucos dias que sentar faz a comida descer e levantar faz ela subir.",
    completion: "Ele fica sentado enquanto a tigela desce e só come quando você libera, em três refeições seguidas.",
    steps: [
      {
        title: "Peça para sentar",
        body: "Com a tigela na mão, peça para o cão sentar antes de qualquer coisa.",
      },
      {
        title: "Desça devagar",
        body: "Leve a tigela ao chão bem devagar. Levantou? Suba a tigela e recomece. Ficou sentado? Continue descendo.",
      },
      {
        title: "Tigela no chão, cão sentado",
        body: "Consiga pousar a tigela com ele ainda sentado. Segure a espera por 1, 2, 3 segundos.",
      },
      {
        title: "Libere",
        body: 'Diga "pode" e deixe ele comer. A palavra de liberação é o que separa esperar de ser proibido.',
      },
    ],
  },
  find_it: {
    id: "find_it",
    name: "Procura",
    tagline: "Cansa mais que uma corrida",
    description:
      "O cão usa o faro para achar petiscos escondidos. Dez minutos de faro cansam um cão mais que uma hora de caminhada — e é o melhor remédio para o cão entediado que inventa problema em casa.",
    category: "enriquecimento",
    difficulty: "easy",
    minutes: 10,
    target: "standing",
    manualOnly: true,
    holdSeconds: 1,
    reps: 5,
    tip: "Não ajude apontando. Deixe o cão resolver com o nariz — é o trabalho mental que cansa. Apontar transforma um exercício de faro num de seguir o seu dedo.",
    completion: "Ele procura e acha petiscos escondidos pelo cômodo usando só o faro, sem desistir, em três sessões.",
    steps: [
      {
        title: "Mostre e esconda fácil",
        body: 'Deixe o cão ver você largar um petisco a um metro. Diga "procura" e deixe ele ir buscar.',
      },
      {
        title: "Esconda de leve",
        body: "Agora esconda atrás de um pé de mesa, sob a borda do tapete. Perto e fácil ainda.",
      },
      {
        title: "Espalhe pelo cômodo",
        body: "Com o cão em outro cômodo, esconda 5 petiscos. Solte e diga \"procura\". Deixe o nariz trabalhar.",
      },
      {
        title: "Suba a dificuldade",
        body: "Esconda mais alto, dentro de caixas, embrulhado em pano. Cada nível novo é um cérebro cansado no fim.",
      },
    ],
  },
};

export const EXERCISE_LIST: Exercise[] = [
  EXERCISES.sit,
  EXERCISES.down,
  EXERCISES.paw,
  EXERCISES.touch,
  EXERCISES.stay,
  EXERCISES.come,
  EXERCISES.heel,
  EXERCISES.watch,
  EXERCISES.leave_it,
  EXERCISES.wait_food,
  EXERCISES.find_it,
];

/** Exercícios de uma categoria, na ordem da lista. */
export function exercisesByCategory(category: ExerciseCategory): Exercise[] {
  return EXERCISE_LIST.filter((e) => e.category === category);
}

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
