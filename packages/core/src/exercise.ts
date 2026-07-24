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
  /**
   * Nome de ícone Ionicons, resolvido pelo app. Fica como string para o core
   * não depender de biblioteca de UI; o app faz o cast. Um ícone por passo dá
   * âncora visual ao gesto — o tutor treina com o celular apoiado longe e
   * reconhece o passo pelo desenho antes de ler.
   */
  icon?: string;
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
        icon: "restaurant-outline",
        body: "Prenda um petisco entre os dedos, mão fechada, e encoste no focinho dele. Deixe cheirar e lamber sem soltar — o nariz gruda na sua mão e vira um ímã que você vai guiar. Se ele pular, abaixe a mão e espere as quatro patas no chão antes de continuar.",
      },
      {
        title: "Levante devagar",
        icon: "arrow-up-outline",
        body: "Mova a mão lentamente para cima e um pouco para trás, por cima da cabeça, na direção das orelhas. Para seguir o petisco com o nariz, ele levanta a cabeça — e a física faz o resto: cabeça sobe, bumbum desce. Se ele recuar em vez de sentar, você está indo rápido ou alto demais.",
      },
      {
        title: "Marque o instante",
        icon: "flash-outline",
        body: 'No exato segundo em que o bumbum tocar o chão, diga "isso!" com voz animada e abra a mão. A recompensa precisa chegar em até 2 segundos — depois disso ele já não sabe pelo que está sendo pago. Não espere ele "terminar de sentar bonito": o toque do bumbum no chão é o momento.',
      },
      {
        title: "Só então nomeie",
        icon: "chatbubble-outline",
        body: 'Depois de 5 a 10 acertos seguidos, comece a dizer "senta" — uma vez só — logo ANTES de mover a mão. A palavra vem antes do gesto, nunca junto. Se ele não sentar, não repita "senta senta senta": volte um passo e faça mais repetições guiadas.',
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
        icon: "checkmark-circle-outline",
        body: "Cão sentado, você agachado à frente dele, na altura dos olhos. Se ele ainda não domina o sentar, treine aquilo primeiro. Se levantar no meio do exercício, peça o senta de novo antes de continuar — dar a pata em pé vira pulo.",
      },
      {
        title: "Petisco na mão fechada",
        icon: "hand-left-outline",
        body: "Feche um petisco dentro do punho e ofereça na altura do peito dele, com os dedos para cima. Perto o suficiente para ele alcançar sem sair do lugar.",
      },
      {
        title: "Espere a pata",
        icon: "time-outline",
        body: 'Ele vai cheirar, lamber, cutucar com o focinho — ignore tudo. A maioria dos cães tenta a pata em 10 a 30 segundos, quando desiste do focinho. No instante em que a pata ENCOSTAR na sua mão, diga "isso!", abra e entregue. Nunca puxe a pata: pata puxada é desconforto, pata oferecida é escolha.',
      },
      {
        title: "Nomeie o gesto",
        icon: "chatbubble-outline",
        body: 'Quando ele oferecer a pata rápido e sem hesitar, diga "pata" logo antes de estender a mão. Depois alterne: peça com a mão aberta e vazia, e recompense com a outra — é o que separa o comando do reflexo de cheirar petisco.',
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
        icon: "checkmark-circle-outline",
        body: "Peça o senta primeiro, num lugar calmo e de piso confortável — tapete, grama, colchonete. Deitar a partir de em pé é bem mais difícil, e piso frio ou duro faz ele desistir no meio do movimento.",
      },
      {
        title: "Desça em L",
        icon: "arrow-down-outline",
        body: "Com o petisco preso entre os dedos e o nariz dele grudado na sua mão, desça a mão RETO até o chão, entre as patas dianteiras dele. Espere o focinho acompanhar. Então arraste a mão pelo chão para longe dele, desenhando um L. O nariz desce e depois estica — e os cotovelos vêm ao chão.",
      },
      {
        title: "Deixe seguir",
        icon: "trending-down-outline",
        body: 'O corpo segue o nariz no ritmo dele; não empurre o dorso para baixo. Se ele levantar o bumbum para alcançar a mão, foi rápido demais — recomece do senta. Quando os DOIS cotovelos tocarem o chão, marque "isso!" e entregue o petisco no chão, entre as patas: comer embaixo mantém ele deitado.',
      },
      {
        title: "Aumente o tempo",
        icon: "hourglass-outline",
        body: "Só depois que ele deitar com facilidade, comece a segurar a entrega: 1 segundo, depois 2, depois 3 — sempre entregando com ele ainda deitado. Se levantar antes, sem bronca: só não vem petisco, e a próxima espera fica um degrau mais curta.",
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
        icon: "hand-right-outline",
        body: "Estique a palma aberta, dedos para baixo, a uns 5 cm do focinho — vindo de lado, não por cima da cabeça (mão descendo do alto assusta). A curiosidade natural faz o cão esticar o pescoço e investigar. É só o que você precisa.",
      },
      {
        title: "Marque o toque",
        icon: "flash-outline",
        body: 'No instante em que o focinho ENCOSTA na palma — não quando só cheira de longe —, diga "isso!" e entregue o petisco com a OUTRA mão. A mão do toque nunca segura comida: ela é o alvo, não a recompensa.',
      },
      {
        title: "Adicione a palavra",
        icon: "chatbubble-outline",
        body: 'Depois de 5 acertos seguidos, diga "toca" — uma vez, voz neutra — logo antes de apresentar a mão. A palavra vira o gatilho; a mão vira a confirmação.',
      },
      {
        title: "Varie a posição",
        icon: "move-outline",
        body: "Apresente a mão mais alta, mais baixa, à esquerda, à direita, um passo para trás. Cada variação que ele acerta torna o comando mais sólido — e é o que permite usá-lo depois para reposicionar o cão em qualquer situação, sem encostar na guia.",
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
        icon: "checkmark-circle-outline",
        body: "Com o cão sentado, fique de pé BEM à frente dele, quase encostando. Distância vem muito depois — o primeiro adversário é o tempo, não o espaço.",
      },
      {
        title: "Espere um segundo, marque",
        icon: "time-outline",
        body: 'Conte "um" em silêncio. Se ele não levantou, diga "isso!" e entregue o petisco NA POSIÇÃO, com ele ainda sentado — nunca o chame para vir buscar. Recompensar no lugar é exatamente o que ensina que ficar parado paga.',
      },
      {
        title: "Some tempo devagar",
        icon: "hourglass-outline",
        body: "Suba para 2, 3, 5 segundos, um degrau por vez — e varie (às vezes 2, às vezes 4) para ele não prever o fim. Se levantar, sem bronca: você subiu rápido demais. Volte para um tempo em que ele acerta e fique ali mais algumas repetições.",
      },
      {
        title: "Crie a liberação",
        icon: "flag-outline",
        body: 'Escolha uma palavra de solta — "pode" — e diga TODA vez que a espera acabar, antes de ele se mexer. Com o tempo ele aprende que só a palavra encerra o exercício — e é isso que segura o cão diante da porta aberta.',
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
        icon: "walk-outline",
        body: 'A um metro de distância, agache, diga o nome dele + "vem" UMA vez, com voz alta e alegre, e abra os braços. Se ele não vier, não repita o comando — faça um som de beijo ou bata palma. "Vem" repetido dez vezes vira ruído de fundo.',
      },
      {
        title: "Pague grande",
        icon: "gift-outline",
        body: "Quando ele chegar, faça a festa do ano: petisco especial (não a ração de sempre), voz aguda, carinho no peito. Vir até você precisa ser A melhor coisa que acontece no dia dele — é contra isso que o cheiro do poste vai competir amanhã.",
      },
      {
        title: "Aumente a distância",
        icon: "resize-outline",
        body: "Vá para 3 metros, depois outro cômodo. Peça a alguém para segurar o cão enquanto você se afasta e chama. Sempre UMA chamada + festa na chegada. Segure de leve o peitoral por 1 segundo antes de entregar o petisco: cão que chega e já sai correndo não terminou de vir.",
      },
      {
        title: "Adicione distração só no fim",
        icon: "alert-circle-outline",
        body: 'Só quando ele vier voando dentro de casa, treine com UM brinquedo parado no chão, longe do caminho. Se ele ignorar você, a distração está forte demais: afaste-a ou melhore o petisco. E NUNCA chame "vem" para banho, bronca ou fim do passeio — isso desfaz semanas de treino num dia.',
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
        icon: "body-outline",
        body: 'Cão sentado junto à sua perna esquerda, guia frouxa na mão direita cruzando o corpo, petiscos na esquerda. Dê UM passo e pare. Ele acompanhou sem esticar? "Isso!" e petisco na altura da costura da calça.',
      },
      {
        title: "Recompense a posição certa",
        icon: "location-outline",
        body: "O petisco aparece SEMPRE colado à sua perna esquerda, nunca à frente do seu corpo. Onde a comida aparece é onde o cão aprende a estar — petisco entregue à frente ensina o cão a andar na sua frente, que é o problema que você veio resolver.",
      },
      {
        title: "Pare quando esticar",
        icon: "hand-left-outline",
        body: "No instante em que a guia tensionar, pare e vire uma estátua: sem puxão, sem “não”, sem arrastar. Espere ele olhar para trás ou dar um passo de volta, afrouxando a guia — e só então retome. Andar é a recompensa; guia esticada desliga o passeio.",
      },
      {
        title: "Some passos",
        icon: "footsteps-outline",
        body: "Dois passos sem esticar → marque. Depois quatro, seis, dez. Conte passos de guia frouxa, não metros. A partir de dez, varie o ritmo e faça curvas: cão que acompanha curva está andando COM você, não apenas na sua direção.",
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
        icon: "eye-outline",
        body: "Sente-se à frente dele, deixe cheirar um petisco e leve a mão devagar do focinho dele até o canto do SEU olho. O olhar dele sobe seguindo a mão — e encontra o seu.",
      },
      {
        title: "Marque o olhar",
        icon: "flash-outline",
        body: 'No instante em que os olhos dele encontram os seus — mesmo que por meio segundo — diga "isso!" e entregue. Contato curtíssimo no começo é normal: olhar fixo é desconfortável para cães por natureza, e você está pagando exatamente a coragem de sustentar.',
      },
      {
        title: "Tire a isca",
        icon: "remove-circle-outline",
        body: 'Agora diga "olha" SEM levar a mão ao rosto, e espere. Ele vai encarar sua mão primeiro (onde sempre teve comida) — ignore. Quando desistir da mão e subir o olhar para o seu rosto, marque na hora.',
      },
      {
        title: "Segure o olhar",
        icon: "hourglass-outline",
        body: "Espere 1 segundo de olho no olho antes de marcar, depois 2 — contando devagar. Depois leve para onde a vida acontece: quintal, varanda, calçada calma. Um cão que sustenta o olhar com o mundo passando é um cão que escolheu você. É a fundação de todos os outros comandos.",
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
        icon: "hand-left-outline",
        body: "Feche um petisco comum dentro do punho e ofereça. Ele vai cheirar, lamber, cutucar, talvez roer de leve — aguente firme: punho fechado, braço parado, nenhuma palavra ainda.",
      },
      {
        title: "Espere ele desistir",
        icon: "time-outline",
        body: 'Em algum momento ele recua, senta ou desvia o olhar — esse é o instante. "Isso!" e pague com um petisco MELHOR, vindo da outra mão. O do punho nunca é entregue: quem desiste do proibido ganha algo melhor que o proibido.',
      },
      {
        title: "Adicione a palavra",
        icon: "chatbubble-outline",
        body: 'Quando ele recuar em 1–2 segundos, diga "deixa" logo antes de apresentar o punho. A palavra entra quando o comportamento já existe — nomear cedo demais é dar nome à bagunça.',
      },
      {
        title: "Leve para o chão",
        icon: "arrow-down-outline",
        body: 'Petisco no chão, sua mão em concha por cima. Ele investiga; quando recuar, marque e pague da outra mão. Aos poucos, descubra o petisco, com a mão pairando por perto. Se ele avançar, só cubra de novo — sem bronca. A meta final: petisco descoberto no chão, você diz "deixa", e ele olha para VOCÊ.',
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
        icon: "checkmark-circle-outline",
        body: 'Prepare a tigela normalmente — ele já vai estar girando de ansiedade, e é normal. Segure a tigela na altura da cintura e peça "senta" UMA vez. Espere o quanto precisar: a refeição é a maior recompensa do dia dele, e ela só anda quando o bumbum encosta no chão.',
      },
      {
        title: "Desça devagar",
        icon: "arrow-down-outline",
        body: "Comece a descer a tigela lentamente. É um teste vivo: bumbum saiu do chão → a tigela volta para a cintura, sem uma palavra. Sentou de novo → a tigela volta a descer. Nos primeiros dias isso repete 5, 10 vezes — persista, cada subida de tigela ensina mais que qualquer bronca.",
      },
      {
        title: "Tigela no chão, cão sentado",
        icon: "restaurant-outline",
        body: "Pouse a tigela no chão com ele ainda sentado — mão pronta para levantá-la se ele avançar; o timing é tudo. Conseguiu pousar? Segure 1 segundo de espera. Amanhã 2, depois 3.",
      },
      {
        title: "Libere",
        icon: "flag-outline",
        body: 'Diga "pode" com voz clara e deixe comer em paz. SEMPRE a mesma palavra, sempre ANTES de ele se mexer. Em uma semana o ritual fica automático — e você ganhou dois treinos de autocontrole por dia, de graça, pelo resto da vida dele.',
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
        icon: "eye-outline",
        body: 'Com ele olhando, jogue um petisco a um metro, diga "procura" e solte. Fácil de propósito: a primeira sessão existe só para ligar a palavra à ação de buscar com o nariz.',
      },
      {
        title: "Esconda de leve",
        icon: "search-outline",
        body: 'Peça o fica (ou segure de leve pelo peitoral), esconda o petisco atrás de um pé de mesa ainda meio à vista, e solte com "procura". Se ele for na direção errada, NÃO aponte — espere. O nariz encontra; é exatamente isso que está sendo treinado.',
      },
      {
        title: "Espalhe pelo cômodo",
        icon: "home-outline",
        body: 'Deixe-o em outro cômodo, esconda 5 petiscos em alturas baixas — atrás do sofá, sob a borda do tapete, num canto —, traga-o e diga "procura" uma vez. Deixe trabalhar em silêncio: cada farejada é esforço mental de verdade. Dez minutos disso cansam mais que uma hora de rua.',
      },
      {
        title: "Suba a dificuldade",
        icon: "trending-up-outline",
        body: "Petisco dentro de caixa de papelão aberta, embrulhado num pano, em cima de um degrau. Um esconderijo novo por sessão, não todos de uma vez. Se ele desistir, facilite um nível: terminar com vitória é o que faz ele topar procurar amanhã.",
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
