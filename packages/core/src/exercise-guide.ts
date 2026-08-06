/**
 * Conteúdo didático de cada exercício — o Training Coach.
 *
 * Esta é a camada que ENSINA. Ela vive separada do catálogo (`exercise.ts`)
 * porque tem outro ritmo de mudança: parâmetros de sessão mudam quando o
 * produto muda; texto de ensino muda quando um adestrador revisa. Misturar os
 * dois num arquivo só faria toda revisão de conteúdo tocar código de domínio.
 *
 * Escrito para quem NUNCA treinou um cão. Sem jargão. Cada campo responde a uma
 * pergunta que o tutor faz de verdade, na ordem em que ele faz:
 *
 *   para que serve  ->  posso agora?  ->  preciso de quê?  ->  onde?  ->
 *   como fico eu?  ->  como fica ele?  ->  o que falo?  ->  o que faço com a
 *   mão?  ->  quando dou o petisco?  ->  o que costuma dar errado?  ->
 *   repito quando?  ->  paro quando?
 *
 * `aiCriteria` é o único campo com dois destinos: aparece na tela, para o tutor
 * saber o que está sendo avaliado, E entra no prompt enviado ao modelo de
 * visão. Manter uma fonte só evita a divergência clássica — a tela promete uma
 * coisa e a IA julga outra.
 */

import type { ExerciseId } from "./exercise";

/** Um erro comum e a correção correspondente. Sempre em par. */
export type CommonMistake = {
  mistake: string;
  fix: string;
};

export type ExerciseGuide = {
  /** Uma frase: o que o cão saberá fazer no fim. */
  objective: string;
  /** Por que este exercício tem esta dificuldade. */
  difficultyNote: string;
  /** Idade mínima em meses. Zero quando não há restrição. */
  minAgeMonths: number;
  ageNote: string;
  /** Exercícios que precisam vir antes. Vazio quando não há. */
  prerequisites: readonly ExerciseId[];
  prerequisiteNote: string;
  /** O que o tutor ganha — em resultado prático, não em teoria. */
  benefits: readonly string[];
  /** O que precisa ter em mãos. */
  materials: readonly string[];
  environment: string;
  handlerPosture: string;
  dogPosition: string;
  /** A palavra exata. Uma só, sempre igual. */
  verbalCue: string;
  handSignal: string;
  rewardMoment: string;
  commonMistakes: readonly CommonMistake[];
  repeatWhen: string;
  stopWhen: string;
  keyTips: readonly string[];
  /**
   * O que a IA procura na foto.
   *
   * Vai para a tela E para o prompt. Escrito como observação visual verificável
   * ("quadril apoiado no chão"), nunca como julgamento ("está correto") — o
   * modelo precisa saber onde olhar, não o que concluir.
   */
  aiCriteria: readonly string[];
  /** O que enquadrar na foto. Aparece no momento da captura. */
  photoInstruction: string;
};

export const EXERCISE_GUIDES: Record<ExerciseId, ExerciseGuide> = {
  // ------------------------------------------------------------------ sentar
  sit: {
    objective:
      "Ensinar o cão a sentar imediatamente ao ouvir o comando, sem precisar de petisco à vista.",
    difficultyNote:
      "É o exercício mais fácil que existe: o movimento é natural, e a maioria dos cães acerta na primeira sessão.",
    minAgeMonths: 2,
    ageNote:
      "Pode começar assim que o filhote chega em casa, por volta de 8 semanas. Filhote aprende rápido, mas cansa em 5 minutos — sessões curtas.",
    prerequisites: [],
    prerequisiteNote: "Nenhum. É por aqui que todo cão começa.",
    benefits: [
      "É a posição de partida de quase todos os outros comandos",
      "Cão sentado não pula em visita, não avança na porta, não puxa a guia",
      "Ensina, na prática, que prestar atenção em você compensa",
      "Dá ao tutor uma ferramenta para interromper agitação sem gritar",
    ],
    materials: [
      "Petiscos pequenos e macios (do tamanho de uma ervilha, uns 15 por sessão)",
      "Um pote ou bolsa para ter o petisco à mão sem o cão ver",
    ],
    environment:
      "Dentro de casa, num cômodo silencioso, sem outras pessoas ou animais. Piso que não escorregue — em piso liso o cão trava as patas e não consegue baixar o quadril com segurança.",
    handlerPosture:
      "De pé ou levemente agachado, de frente para o cão, ombros relaxados. Não se debruce sobre ele: corpo por cima é ameaça para cão, e ele vai recuar em vez de sentar.",
    dogPosition:
      "De pé, de frente para você, a um passo de distância. As quatro patas no chão antes de começar.",
    verbalCue: '"Senta" — uma palavra, tom normal, uma vez só.',
    handSignal:
      "Mão fechada com o petisco, palma para cima, subindo do focinho até acima da cabeça. Depois que ele aprende, o gesto vira só a mão aberta subindo, sem petisco.",
    rewardMoment:
      "No instante em que o quadril encosta no chão. Até dois segundos depois. Passou disso, ele já não sabe pelo que está sendo pago — e pode achar que foi pago por levantar de novo.",
    commonMistakes: [
      {
        mistake: 'Repetir "senta, senta, SENTA" quando ele não obedece.',
        fix: "Diga uma vez. Se ele não sentar em 3 segundos, volte a guiar com o petisco por mais 5 repetições. Repetir ensina que o comando só vale na terceira vez.",
      },
      {
        mistake: "Empurrar o bumbum para baixo com a mão.",
        fix: "Nunca empurre. O cão precisa descobrir o movimento sozinho — se você empurra, ele aprende a esperar ser empurrado, e o comando nunca funciona à distância.",
      },
      {
        mistake: "Recompensar tarde, quando ele já levantou.",
        fix: "Tenha o petisco já na mão e diga “isso!” no segundo do toque. A palavra marca o instante; o petisco pode chegar logo depois.",
      },
      {
        mistake: "Levantar a mão rápido demais ou alto demais.",
        fix: "Ele recua ou pula em vez de sentar. Suba devagar e mantenha a mão baixa, quase encostando na cabeça.",
      },
      {
        mistake: "Treinar com fome demais ou logo depois de comer.",
        fix: "Fome demais deixa o cão frenético; barriga cheia tira o interesse pelo petisco. Treine entre as refeições.",
      },
    ],
    repeatWhen:
      "5 repetições por rodada, 2 a 3 rodadas por dia. Só avance para o comando sem petisco depois de 10 acertos seguidos guiados.",
    stopWhen:
      "Ao primeiro sinal de cansaço: ele se distrai, se afasta, boceja, se coça ou ignora o petisco. Sempre encerre num acerto — parar depois de um erro deixa o erro como última lembrança.",
    keyTips: [
      "Só diga a palavra “senta” DEPOIS que ele já acerta o movimento guiado. Nomear cedo demais gruda a palavra num movimento que ele ainda não sabe fazer.",
      "Filhote em piso liso escorrega e não senta — leve para um tapete.",
      "Se ele senta e levanta na hora, é ansiedade de petisco. Espere um segundo a mais antes de entregar.",
      "Termine antes de ele enjoar. É melhor 5 repetições ótimas que 20 arrastadas.",
    ],
    aiCriteria: [
      "Quadril e patas traseiras apoiados no chão",
      "Patas dianteiras esticadas e alinhadas, sustentando o tronco",
      "Coluna ereta, peito levantado",
      "Cabeça acima da linha dos ombros",
      "Cão não está deitado nem agachado a meio caminho",
    ],
    photoInstruction:
      "Fotografe o cão de lado ou em três quartos, com o corpo inteiro no quadro — do focinho até as patas traseiras.",
  },

  // -------------------------------------------------------------- dar a pata
  paw: {
    objective:
      "Ensinar o cão a levantar e oferecer a pata quando você pedir, sem que você precise pegá-la.",
    difficultyNote:
      "Média: o movimento não é natural como sentar, e depende de o cão ter paciência para tentar coisas até acertar.",
    minAgeMonths: 3,
    ageNote:
      "A partir dos 3 meses. Antes disso o filhote ainda tem equilíbrio instável para se sustentar em três patas.",
    prerequisites: ["sit"],
    prerequisiteNote:
      "Precisa sentar com segurança. Cão em pé que levanta a pata perde o equilíbrio e vira pulo.",
    benefits: [
      "Acostuma o cão a ter a pata tocada — corte de unha, limpeza e veterinário deixam de ser luta",
      "Ensina o cão a oferecer comportamento em vez de esperar passivamente",
      "Aumenta a confiança dele no contato físico com você",
      "É o truque que a família toda vai pedir, e isso mantém o treino vivo",
    ],
    materials: [
      "Petiscos pequenos e macios",
      "Um tapete ou tapetinho para ele sentar confortável",
    ],
    environment:
      "Dentro de casa, sem barulho, com ele sentado em superfície não escorregadia. Sentar-se no chão de frente para o cão ajuda.",
    handlerPosture:
      "Agachado ou sentado no chão, na altura dos olhos dele. Mão oferecida na altura do peito do cão, nunca acima da cabeça.",
    dogPosition:
      "Sentado, de frente para você, peso distribuído nas duas patas dianteiras.",
    verbalCue: '"Pata" — dita só depois que ele já oferece o movimento sozinho.',
    handSignal:
      "Mão fechada com o petisco dentro, dedos para cima, na altura do peito dele. Depois vira mão aberta e vazia, palma para cima.",
    rewardMoment:
      "No instante em que a pata ENCOSTA na sua mão. Não espere ele apoiar bonito nem manter — o toque é o momento.",
    commonMistakes: [
      {
        mistake: "Pegar a pata do cão e levantar você mesmo.",
        fix: "Nunca puxe. Pata puxada é desconforto; pata oferecida é escolha. Feche a mão com o petisco e espere — a maioria tenta a pata em 10 a 30 segundos.",
      },
      {
        mistake: "Desistir porque ele só usa o focinho.",
        fix: "É a fase normal. Ignore o focinho completamente, sem falar nada, e continue com a mão fechada. Ele tenta a pata quando desiste do nariz.",
      },
      {
        mistake: "Oferecer a mão alto demais.",
        fix: "Ele se levanta para alcançar. Mantenha na altura do peito dele.",
      },
      {
        mistake: "Aceitar a pata quando ele está em pé.",
        fix: "Peça o senta antes. Pata em pé vira pulo, e pulo é o comportamento que você não quer reforçar.",
      },
    ],
    repeatWhen:
      "5 repetições por rodada, com pausa de alguns segundos entre elas. Duas rodadas por dia bastam.",
    stopWhen:
      "Se ele parar de tentar e apenas ficar olhando por mais de um minuto, encerre. Frustração acumulada faz o cão desistir do jogo inteiro.",
    keyTips: [
      "Alterne a mão que você oferece — senão ele aprende “pata direita para a mão esquerda” e trava com a outra.",
      "Quando ele já oferecer rápido, peça com a mão aberta e VAZIA e recompense com a outra mão. É isso que separa o comando do reflexo de cheirar petisco.",
      "Um cão que aprende a dar a pata começa a oferecer pata para tudo. Só recompense quando você pediu.",
    ],
    aiCriteria: [
      "Cão sentado, quadril no chão",
      "Uma pata dianteira levantada, fora do chão",
      "Pata direcionada para a frente ou para a mão do tutor",
      "Peso apoiado na outra pata dianteira, corpo estável",
      "Cão não está em pé nem com as duas dianteiras no ar",
    ],
    photoInstruction:
      "Fotografe de frente ou em três quartos, mostrando o cão sentado e a pata levantada. A sua mão pode aparecer no quadro.",
  },

  // ------------------------------------------------------------------ deitar
  down: {
    objective:
      "Ensinar o cão a deitar ao comando, a partir de sentado ou em pé, e permanecer deitado alguns segundos.",
    difficultyNote:
      "Média: o movimento é fácil, mas deitar deixa o cão vulnerável, e cães inseguros resistem.",
    minAgeMonths: 3,
    ageNote:
      "A partir dos 3 meses. Cães mais velhos ou com dor nas articulações podem ter dificuldade física — nesse caso, converse com o veterinário antes.",
    prerequisites: ["sit"],
    prerequisiteNote:
      "Sentar primeiro. Deitar a partir de sentado é muito mais fácil que a partir de em pé.",
    benefits: [
      "É o botão de calma: cão deitado não fica agitado, não late, não circula",
      "Permite levar o cão a restaurante, casa de visita e sala de espera do veterinário",
      "Base para o “fica” de longa duração",
      "Reduz a excitação em momentos de estresse, como chegada de visitas",
    ],
    materials: [
      "Petiscos pequenos e macios",
      "Um tapete, tapetinho ou caminha — piso duro e frio desmotiva o cão a deitar",
    ],
    environment:
      "Lugar calmo, silencioso, com piso macio. Evite fazer ao lado da porta ou de janela com movimento.",
    handlerPosture:
      "Agachado ao lado dele, não de frente. Ficar de frente e curvado por cima é postura de ameaça e faz o cão recuar.",
    dogPosition:
      "Sentado, ao seu lado ou levemente à sua frente, calmo antes de começar.",
    verbalCue: '"Deita" — tom baixo e calmo. Voz animada aqui atrapalha: você quer que ele desacelere.',
    handSignal:
      "Mão com o petisco descendo do focinho até o chão, em linha reta, e depois puxando devagar para longe dele, como se desenhasse um L.",
    rewardMoment:
      "No instante em que os cotovelos e a barriga tocam o chão. Entregue o petisco no chão, entre as patas dianteiras — assim ele não levanta para pegar.",
    commonMistakes: [
      {
        mistake: "Puxar a guia para baixo ou empurrar o dorso.",
        fix: "Nunca force. Cão forçado a deitar aprende que deitar é perder o controle, e passa a resistir mais.",
      },
      {
        mistake: "Entregar o petisco na altura do rosto.",
        fix: "Ele levanta para pegar e o exercício se desfaz. Entregue no chão, entre as patas.",
      },
      {
        mistake: "Treinar em piso frio, duro ou molhado.",
        fix: "Leve para um tapete. Muitos cães que “não deitam” só não querem deitar naquele chão.",
      },
      {
        mistake: "Exigir o movimento completo desde a primeira tentativa.",
        fix: "Recompense o meio caminho: cotovelo dobrado, peito baixando. Depois vá exigindo mais.",
      },
    ],
    repeatWhen:
      "5 repetições por rodada. Só aumente o tempo deitado (de 3 para 5, depois 10 segundos) quando ele deitar sem hesitar.",
    stopWhen:
      "Se ele começar a evitar você, se afastar ou virar a cabeça, pare. Isso é desconforto, não teimosia.",
    keyTips: [
      "Cães de peito largo (bulldog, pug, boxer) demoram mais — a anatomia dificulta.",
      "Se ele deita e levanta na hora, você está recompensando tarde. Marque com “isso!” no toque da barriga.",
      "Deitar de lado, com o quadril caído, é ainda melhor: significa que ele relaxou de verdade.",
    ],
    aiCriteria: [
      "Barriga e peito em contato com o chão",
      "Cotovelos das patas dianteiras apoiados no chão",
      "Patas traseiras dobradas e apoiadas, não em pé",
      "Cabeça acima do chão ou apoiada, mas corpo baixo",
      "Cão não está sentado nem agachado no meio do movimento",
    ],
    photoInstruction:
      "Fotografe de lado, com o corpo inteiro do cão no quadro, mostrando a barriga em contato com o chão.",
  },

  // -------------------------------------------------------------------- toca
  touch: {
    objective:
      "Ensinar o cão a encostar o focinho na palma da sua mão quando você oferecer.",
    difficultyNote:
      "Fácil: o cão já cheira mãos por instinto. Aqui você só dá nome e recompensa ao que ele já faz.",
    minAgeMonths: 2,
    ageNote: "Desde filhote. É um dos primeiros exercícios que se pode ensinar.",
    prerequisites: [],
    prerequisiteNote: "Nenhum.",
    benefits: [
      "Resolve o resto: é com o “toca” que você move o cão sem puxar a guia",
      "Tira o cão de situação ruim sem confronto — outro cão, criança, portão aberto",
      "Ferramenta de recall: cão que toca a mão vem até você",
      "Aumenta a confiança de cães tímidos, porque a iniciativa é sempre deles",
    ],
    materials: ["Petiscos pequenos", "Só a sua mão — nenhum equipamento"],
    environment:
      "Qualquer lugar calmo para começar. Depois de aprendido, funciona em qualquer lugar, e é isso que o torna útil.",
    handlerPosture:
      "Em pé ou agachado, braço relaxado, mão estendida ao lado do corpo — não à frente do rosto dele.",
    dogPosition: "Em pé ou sentado, livre para se aproximar. Sem guia esticada.",
    verbalCue: '"Toca" — dita no momento em que você estende a mão.',
    handSignal:
      "Palma aberta, dedos juntos, virada para o cão, a um palmo do focinho dele.",
    rewardMoment:
      "No instante em que o focinho encosta na palma. Nem antes (cheirar de longe não conta), nem depois.",
    commonMistakes: [
      {
        mistake: "Empurrar a mão contra o focinho do cão.",
        fix: "A mão fica parada. Quem se move é ele — é isso que torna o comando útil depois.",
      },
      {
        mistake: "Manter petisco na mão que ele deve tocar.",
        fix: "A mão do toque fica vazia. O petisco vem da outra mão. Senão você ensina “cheire onde tem comida”, não “toque minha mão”.",
      },
      {
        mistake: "Oferecer a mão longe demais.",
        fix: "Comece a um palmo. Só aumente a distância quando ele acertar 9 de 10.",
      },
    ],
    repeatWhen:
      "6 repetições por rodada, várias rodadas curtas ao longo do dia. É o exercício que mais aceita repetição.",
    stopWhen:
      "Quando ele começar a errar a mão ou perder o interesse. Como é fácil, o erro costuma ser sinal de tédio.",
    keyTips: [
      "Alterne as mãos e os lados do corpo.",
      "Depois de aprendido, use no dia a dia: para chamar, para tirar do caminho, para passar por outro cão.",
      "É o melhor exercício para cão tímido, porque ele controla a aproximação.",
    ],
    aiCriteria: [
      "Focinho do cão em contato ou a poucos centímetros da mão do tutor",
      "Mão do tutor aberta, com a palma voltada para o cão",
      "Cabeça do cão direcionada para a mão",
      "Corpo do cão orientado em direção ao tutor",
    ],
    photoInstruction:
      "Fotografe de lado, mostrando ao mesmo tempo o focinho do cão e a sua mão aberta.",
  },

  // -------------------------------------------------------------------- fica
  stay: {
    objective:
      "Ensinar o cão a permanecer na posição em que está até você liberar, mesmo com você se afastando.",
    difficultyNote:
      "Difícil: exige autocontrole, que é a habilidade que mais demora a se desenvolver em cães.",
    minAgeMonths: 4,
    ageNote:
      "A partir dos 4 meses. Filhote muito novo não tem maturidade para se conter — cobrar cedo demais só gera frustração nos dois.",
    prerequisites: ["sit", "down"],
    prerequisiteNote:
      "Ele precisa sentar ou deitar sob comando com segurança. Não dá para ficar numa posição que ele ainda não sabe assumir.",
    benefits: [
      "Segurança real: cão que fica não corre para a rua quando o portão abre",
      "Permite abrir a porta, descarregar compras e receber visita sem confusão",
      "Base para deixar o cão sozinho em um cômodo sem ansiedade",
      "Desenvolve autocontrole, que melhora todo o resto do comportamento",
    ],
    materials: [
      "Petiscos de alto valor (queijo, frango) — este exercício é difícil e precisa valer a pena",
      "Guia longa, se for treinar em ambiente aberto",
    ],
    environment:
      "Comece em casa, sem distração nenhuma. Só leve para fora quando ele acertar 9 de 10 dentro de casa.",
    handlerPosture:
      "De frente para ele, corpo ereto, movimentos lentos. Movimento brusco convida o cão a se mover junto.",
    dogPosition: "Sentado ou deitado, na posição que você escolheu antes de começar.",
    verbalCue:
      '"Fica" — dito uma vez, no início. E uma palavra de liberação, sempre a mesma: "pode".',
    handSignal:
      "Palma aberta virada para o cão, como quem diz “pare”, mantida enquanto ele espera.",
    rewardMoment:
      "Volte até ele e recompense NA POSIÇÃO, antes de liberar. Nunca chame o cão para receber o prêmio — isso ensina que sair da posição é o que dá petisco.",
    commonMistakes: [
      {
        mistake: "Chamar o cão para receber a recompensa.",
        fix: "Volte você até ele. O petisco chega onde ele está, ainda na posição.",
      },
      {
        mistake: "Aumentar tempo, distância e distração ao mesmo tempo.",
        fix: "Aumente UMA coisa por vez. Se aumentar a distância, reduza o tempo. Se levar para a rua, volte para 2 segundos e um passo.",
      },
      {
        mistake: 'Repetir "fica, fica, fica" enquanto se afasta.',
        fix: "Diga uma vez. Repetir vira ruído de fundo e o comando perde valor.",
      },
      {
        mistake: "Esquecer de liberar.",
        fix: "Sempre encerre com a palavra de liberação. Sem ela o cão nunca sabe quando acabou, e passa a se liberar sozinho.",
      },
      {
        mistake: "Sumir de vista cedo demais.",
        fix: "Comece com você visível, a um passo. Sumir de vista é um dos últimos estágios.",
      },
    ],
    repeatWhen:
      "5 repetições por rodada, com o tempo variando: 3 segundos, depois 8, depois 2 de novo. Variar impede que ele decore o tempo e se solte sozinho.",
    stopWhen:
      "Se ele quebrar a posição três vezes seguidas, o passo está difícil demais. Volte ao nível anterior e encerre num acerto.",
    keyTips: [
      "Sempre volte para o cão. Sempre.",
      "Um passo para trás já é distância. Não comece com cinco.",
      "Se ele quebra a posição, não brigue: apenas recoloque em silêncio e facilite a próxima.",
      "A palavra de liberação é tão importante quanto o comando.",
    ],
    aiCriteria: [
      "Cão mantém a posição de sentado ou deitado",
      "Patas na mesma posição, sem sinal de que se levantou",
      "Corpo orientado para frente, sem estar em movimento",
      "Cabeça pode acompanhar o tutor, mas o corpo permanece parado",
    ],
    photoInstruction:
      "Fotografe à distância, com o cão inteiro no quadro, mostrando que ele permaneceu onde foi deixado.",
  },

  // --------------------------------------------------------------------- vem
  come: {
    objective:
      "Ensinar o cão a vir correndo até você imediatamente, em qualquer situação, ao ouvir o comando.",
    difficultyNote:
      "Difícil: compete com tudo que é mais interessante que você — outro cão, um cheiro, um gato.",
    minAgeMonths: 2,
    ageNote:
      "Comece desde filhote, quando ele já segue você naturalmente. Essa fase é uma janela — aproveite antes que a independência chegue.",
    prerequisites: [],
    prerequisiteNote:
      "Nenhum, mas o “toca” ajuda muito: cão que toca a mão já sabe vir até ela.",
    benefits: [
      "É o comando que salva vidas: portão aberto, guia solta, cão correndo para a rua",
      "Permite dar liberdade ao cão em parque e trilha com segurança",
      "Fortalece o vínculo — vir até você passa a ser sempre a melhor opção",
    ],
    materials: [
      "Petiscos de altíssimo valor (frango, queijo, salsicha) — precisa ganhar do resto do mundo",
      "Guia longa de 5 a 10 metros para a fase intermediária",
    ],
    environment:
      "Comece dentro de casa, em corredor. Depois quintal fechado. Só depois lugar aberto, sempre com guia longa até estar perfeito.",
    handlerPosture:
      "Agachado, braços abertos, corpo virado de lado ou até de costas. Correr na direção do cão faz ele fugir; se afastar faz ele vir.",
    dogPosition: "Livre, a alguns passos, de preferência já olhando para você.",
    verbalCue:
      '"Vem" — dito uma vez, com voz alegre e aguda. Nunca com voz de bronca.',
    handSignal: "Braços abertos ou mão batendo na coxa, num gesto convidativo.",
    rewardMoment:
      "Quando ele chegar até você e você conseguir tocar a coleira. Não recompense a meio caminho — senão ele aprende a parar a três metros.",
    commonMistakes: [
      {
        mistake: "Chamar o cão para fazer algo que ele não gosta (banho, remédio, ir embora do parque).",
        fix: "Vá até ele nessas horas. Se “vem” significar fim da diversão, ele para de vir.",
      },
      {
        mistake: "Brigar com o cão quando ele finalmente chega.",
        fix: "Nunca. Ele associa a bronca ao ato de vir, não ao que fez antes. Comemore sempre, mesmo que tenha demorado.",
      },
      {
        mistake: "Chamar quando você sabe que ele não vai vir.",
        fix: "Cada chamado ignorado enfraquece o comando. Se não tem certeza, vá buscá-lo.",
      },
      {
        mistake: "Correr atrás do cão.",
        fix: "Faça o contrário: corra na direção oposta. O instinto dele é seguir.",
      },
    ],
    repeatWhen:
      "6 repetições por rodada, sempre terminando com o cão solto de novo para brincar — assim vir não significa fim da liberdade.",
    stopWhen:
      "Ao primeiro chamado ignorado em ambiente novo. Volte para um ambiente mais fácil.",
    keyTips: [
      "Recompense TODA vez, mesmo depois de aprendido. Este é o único comando que nunca deve deixar de valer a pena.",
      "Use uma palavra nova se o “vem” já estiver queimado por chamados ignorados.",
      "Torne um jogo: duas pessoas se revezando chamando o cão de lados opostos.",
    ],
    aiCriteria: [
      "Cão orientado em direção ao tutor",
      "Corpo em movimento ou já próximo ao tutor",
      "Cabeça e olhar dirigidos ao tutor",
      "Cão não está se afastando nem distraído com outra coisa",
    ],
    photoInstruction:
      "Fotografe o cão chegando até você ou já ao seu lado, com o corpo dele voltado na sua direção.",
  },

  // ------------------------------------------------------------------- junto
  heel: {
    objective:
      "Ensinar o cão a caminhar ao seu lado, com a guia frouxa, sem puxar.",
    difficultyNote:
      "Difícil: o cão anda naturalmente mais rápido que você, e puxar sempre funcionou para ele até agora.",
    minAgeMonths: 3,
    ageNote:
      "A partir dos 3 meses, depois da vacinação completa para sair à rua. Dentro de casa pode começar antes.",
    prerequisites: ["touch"],
    prerequisiteNote:
      "O “toca” ajuda a posicionar o cão do lado certo sem puxar a guia.",
    benefits: [
      "Passeio deixa de ser luta e vira o melhor momento do dia para os dois",
      "Protege as articulações e a traqueia do cão, que sofrem com o puxão",
      "Permite passear com segurança perto de rua movimentada",
      "Reduz reatividade: cão que anda junto reage menos a outros cães",
    ],
    materials: [
      "Peitoral (não coleira de enforcar nem enforcador)",
      "Guia de 1,5 a 2 metros, sem retrátil — a retrátil ensina exatamente o oposto",
      "Petiscos acessíveis com uma mão só",
    ],
    environment:
      "Comece dentro de casa ou no quintal, sem distração. Rua movimentada é o último estágio, não o primeiro.",
    handlerPosture:
      "Ombros retos, guia frouxa na mão do lado do cão, braço relaxado ao longo do corpo. Guia esticada o tempo todo ensina o cão a puxar contra ela.",
    dogPosition:
      "Ao seu lado, ombro dele na altura da sua perna. Escolha um lado e mantenha sempre o mesmo.",
    verbalCue: '"Junto" — dito ao iniciar a caminhada.',
    handSignal:
      "Mão do lado do cão batendo levemente na coxa, indicando a posição.",
    rewardMoment:
      "Enquanto ele está na posição certa e a guia está frouxa — não depois de corrigir. Recompense o acerto em curso, não o retorno ao acerto.",
    commonMistakes: [
      {
        mistake: "Continuar andando quando ele puxa.",
        fix: "Pare completamente. Só volte a andar quando a guia afrouxar. Andar enquanto puxa ensina que puxar funciona.",
      },
      {
        mistake: "Usar guia retrátil.",
        fix: "Troque por guia fixa. A retrátil recompensa o puxão com mais comprimento — é o oposto do que você quer.",
      },
      {
        mistake: "Puxar a guia de volta com força.",
        fix: "O cão puxa contra a pressão por reflexo. Em vez disso, pare, chame a atenção dele e recomece.",
      },
      {
        mistake: "Começar na rua movimentada.",
        fix: "Comece no corredor de casa. Sem base, a rua é impossível.",
      },
    ],
    repeatWhen:
      "8 trechos curtos de 10 a 20 passos, com pausa entre eles. Melhor que uma caminhada longa mal feita.",
    stopWhen:
      "Se ele estiver ofegante, muito excitado ou puxando sem parar, encerre. Passeio ruim reforça o hábito ruim.",
    keyTips: [
      "Mude de direção sem avisar quando ele começar a se adiantar. Ele aprende a prestar atenção em você.",
      "Recompense em movimento, não parando toda hora.",
      "Deixe uma parte do passeio livre para farejar. O cão precisa disso, e separar “hora de andar junto” de “hora de cheirar” torna as duas mais fáceis.",
    ],
    aiCriteria: [
      "Cão posicionado ao lado do tutor, não à frente nem atrás",
      "Guia visivelmente frouxa, formando uma curva",
      "Cabeça do cão na altura da perna do tutor ou próxima",
      "Cão orientado na mesma direção do tutor",
    ],
    photoInstruction:
      "Fotografe de lado ou peça para alguém fotografar vocês dois caminhando, mostrando a guia e a posição do cão.",
  },

  // ----------------------------------------------------------- olha pra mim
  watch: {
    objective:
      "Ensinar o cão a olhar nos seus olhos e manter o olhar por alguns segundos ao ouvir o comando.",
    difficultyNote:
      "Fácil de ensinar, difícil de manter em ambiente com distração. É por isso que vale tanto.",
    minAgeMonths: 2,
    ageNote: "Desde filhote.",
    prerequisites: [],
    prerequisiteNote: "Nenhum.",
    benefits: [
      "Dá ao tutor um jeito de recuperar a atenção do cão em qualquer situação",
      "Interrompe reatividade antes que ela comece — cão olhando para você não está fixado no outro cão",
      "Fortalece o vínculo: olhar nos olhos libera ocitocina nos dois",
      "É o pré-requisito silencioso de todo comando difícil",
    ],
    materials: ["Petiscos pequenos"],
    environment:
      "Comece em casa, sem nada acontecendo. Depois vá aumentando a distração devagar: outro cômodo, quintal, rua tranquila, rua movimentada.",
    handlerPosture:
      "Agachado ou em pé, de frente para ele, rosto visível. Não use óculos escuros nas primeiras sessões.",
    dogPosition: "Sentado, de frente para você, a um passo.",
    verbalCue: '"Olha" — ou o nome do cão, se preferir usar o nome como chamada de atenção.',
    handSignal:
      "Dedo indicador levado do focinho dele até perto do seu próprio olho.",
    rewardMoment:
      "No instante em que os olhos dele encontram os seus. No começo, meio segundo já vale.",
    commonMistakes: [
      {
        mistake: "Encarar o cão de forma fixa e intensa.",
        fix: "Olhar fixo é ameaça para cão. Mantenha o rosto relaxado, olhar suave.",
      },
      {
        mistake: "Exigir muitos segundos logo no começo.",
        fix: "Recompense meio segundo. Aumente para 2, depois 5 — só depois que o anterior estiver fácil.",
      },
      {
        mistake: "Segurar o petisco perto do próprio rosto o tempo todo.",
        fix: "Vira dependência do petisco à vista. Depois das primeiras sessões, mantenha as mãos abaixadas.",
      },
    ],
    repeatWhen:
      "6 repetições curtas por rodada. É um exercício para fazer várias vezes ao dia, em contextos diferentes.",
    stopWhen:
      "Quando ele parar de conseguir olhar por causa da distração. Isso significa que o ambiente está difícil demais — recue um passo.",
    keyTips: [
      "Este é o comando que impede o problema, em vez de corrigi-lo depois.",
      "Use antes de cruzar com outro cão na rua, não durante.",
      "Cão que desvia o olhar não está desobedecendo: está desconfortável. Facilite.",
    ],
    aiCriteria: [
      "Cabeça do cão levantada e voltada para o tutor",
      "Olhos do cão direcionados para o rosto do tutor",
      "Cão em posição estável, geralmente sentado",
      "Orelhas para frente, indicando atenção",
    ],
    photoInstruction:
      "Fotografe de frente, mostrando a cabeça e os olhos do cão voltados para você.",
  },

  // ------------------------------------------------------------------ deixa
  leave_it: {
    objective:
      "Ensinar o cão a ignorar algo que ele quer — comida no chão, lixo, objeto — quando você pedir.",
    difficultyNote:
      "Média: exige autocontrole, mas o progresso é rápido porque a recompensa é imediata e clara.",
    minAgeMonths: 4,
    ageNote: "A partir dos 4 meses, quando o autocontrole começa a se desenvolver.",
    prerequisites: ["sit"],
    prerequisiteNote:
      "Ajuda muito ter o senta: cão sentado tem menos chance de avançar no objeto.",
    benefits: [
      "Segurança: impede o cão de comer chocolate, osso de frango, remédio ou lixo na rua",
      "Evita conflito com outros cães e com crianças que estão comendo",
      "Ensina que se afastar do que ele quer traz algo melhor",
    ],
    materials: [
      "Dois tipos de petisco: um comum (o que ele vai deixar) e um melhor (o que ele ganha)",
      "Superfície onde apoiar o petisco à vista",
    ],
    environment:
      "Dentro de casa, no chão, sem outros animais por perto para não gerar disputa.",
    handlerPosture:
      "Agachado ao lado do petisco, mão pronta para cobri-lo se ele avançar.",
    dogPosition: "Sentado ou em pé, a um passo do petisco no chão.",
    verbalCue: '"Deixa" — tom firme, sem gritar.',
    handSignal: "Palma aberta sobre o objeto, como quem protege.",
    rewardMoment:
      "No instante em que ele desviar o olhar do petisco proibido. Recompense com o petisco MELHOR, vindo da outra mão — nunca com o que ele deveria deixar.",
    commonMistakes: [
      {
        mistake: "Deixar o cão pegar o petisco proibido.",
        fix: "Cubra com a mão antes. Uma vez que ele consegue, aprende que insistir funciona.",
      },
      {
        mistake: "Recompensar com o próprio petisco que ele deveria deixar.",
        fix: "A recompensa vem sempre de outra fonte, e deve ser melhor. Senão ele aprende a esperar em vez de desistir.",
      },
      {
        mistake: "Usar tom de bronca ou gritar.",
        fix: "Não é punição. É uma troca: você desiste disso, ganha aquilo.",
      },
      {
        mistake: "Começar com algo irresistível.",
        fix: "Comece com um petisco comum, coberto pela sua mão. Só depois descubra, só depois deixe no chão.",
      },
    ],
    repeatWhen:
      "6 repetições por rodada. Aumente a dificuldade em etapas: mão fechada, mão aberta, petisco no chão coberto, petisco no chão livre.",
    stopWhen:
      "Se ele avançar três vezes seguidas, o nível está alto demais. Volte a cobrir com a mão.",
    keyTips: [
      "“Deixa” é diferente de “solta”. Deixa é para o que ele ainda não pegou.",
      "Pratique na rua com coisas reais depois de dominar em casa — é lá que salva a vida dele.",
      "Recompense generosamente. Está pedindo algo genuinamente difícil.",
    ],
    aiCriteria: [
      "Cão com a cabeça ou o olhar desviado do objeto",
      "Cão mantendo distância do objeto, sem avançar",
      "Corpo do cão sem inclinação em direção ao objeto",
      "Objeto visível no quadro, ainda intocado",
    ],
    photoInstruction:
      "Fotografe mostrando ao mesmo tempo o cão e o objeto que ele está ignorando.",
  },

  // -------------------------------------------------------- espera a comida
  wait_food: {
    objective:
      "Ensinar o cão a esperar sentado enquanto o pote é colocado no chão, e só comer quando você liberar.",
    difficultyNote:
      "Média: a motivação é altíssima, o que torna difícil — mas também torna o aprendizado rápido.",
    minAgeMonths: 3,
    ageNote: "A partir dos 3 meses, na rotina normal de refeição.",
    prerequisites: ["sit"],
    prerequisiteNote: "Precisa sentar sob comando.",
    benefits: [
      "Transforma a refeição, que é o momento mais agitado do dia, em treino de calma",
      "Reduz o risco de engasgo e de torção gástrica por comer rápido demais",
      "Previne guarda de recurso: o pote vem de você, e isso é bom",
      "Treina autocontrole duas vezes por dia, sem tempo extra",
    ],
    materials: ["O pote de comida dele", "A ração da refeição — sem petisco extra"],
    environment:
      "O lugar habitual da refeição, com o cão sozinho. Se houver outro animal, separe.",
    handlerPosture:
      "Em pé, segurando o pote na altura da cintura, movimento lento na descida.",
    dogPosition: "Sentado, de frente para você, antes de o pote descer.",
    verbalCue: '"Espera" para segurar, e "pode" para liberar. Sempre as mesmas duas palavras.',
    handSignal: "Palma aberta virada para ele enquanto espera.",
    rewardMoment:
      "A recompensa é a própria comida. Libere com “pode” depois de 3 segundos no começo, aumentando aos poucos.",
    commonMistakes: [
      {
        mistake: "Baixar o pote até o chão mesmo com ele avançando.",
        fix: "Levante o pote de volta assim que ele se mover. Só desce quando ele estiver parado. Ele aprende em duas ou três refeições.",
      },
      {
        mistake: "Esquecer a palavra de liberação.",
        fix: "Sem ela o cão se libera sozinho e o exercício não existe.",
      },
      {
        mistake: "Exigir muito tempo logo no início.",
        fix: "Comece com 3 segundos. Não é resistência que se treina aqui, é o hábito de esperar.",
      },
      {
        mistake: "Tirar o pote depois que ele começou a comer.",
        fix: "Nunca. Isso cria guarda de recurso, que é um problema sério e difícil de desfazer.",
      },
    ],
    repeatWhen:
      "Todo dia, nas refeições. 4 repetições por sessão significa segurar, liberar, e repetir com porções menores.",
    stopWhen:
      "Se ele ficar ansioso demais, latir ou tremer, reduza o tempo. Comida não deve virar fonte de estresse.",
    keyTips: [
      "É o treino com melhor custo-benefício do app: acontece na rotina que já existe.",
      "Divida a ração em duas ou três porções para treinar mais vezes na mesma refeição.",
      "Se ele já tem guarda de recurso (rosna perto do pote), procure um adestrador antes de treinar isso.",
    ],
    aiCriteria: [
      "Cão sentado com o quadril no chão",
      "Pote de comida visível, no chão ou na mão do tutor",
      "Cão sem contato com o pote — focinho afastado",
      "Corpo do cão sem avanço em direção ao pote",
    ],
    photoInstruction:
      "Fotografe mostrando o cão sentado e o pote de comida no mesmo quadro.",
  },

  // ---------------------------------------------------------------- procura
  find_it: {
    objective:
      "Ensinar o cão a procurar e encontrar petiscos escondidos usando o faro.",
    difficultyNote:
      "Fácil: o cão já sabe farejar. Aqui você só organiza o que ele faz naturalmente.",
    minAgeMonths: 2,
    ageNote:
      "Desde filhote, e continua valendo para cão idoso — é o exercício que menos exige do corpo.",
    prerequisites: [],
    prerequisiteNote: "Nenhum.",
    benefits: [
      "Dez minutos de faro cansam mais que meia hora de corrida",
      "Ideal para dia de chuva, cão em recuperação ou apartamento pequeno",
      "Reduz ansiedade e comportamento destrutivo",
      "Aumenta a confiança de cães tímidos, porque ele resolve o problema sozinho",
    ],
    materials: [
      "Petiscos com cheiro forte",
      "Caixas de papelão, toalhas ou tapete de faro — opcional",
    ],
    environment:
      "Qualquer cômodo, ou o quintal. Comece num espaço pequeno e delimitado.",
    handlerPosture:
      "Fora do caminho, em silêncio. Depois de dar o comando, não ajude nem aponte.",
    dogPosition:
      "Livre para se mover e cheirar. Este é o único exercício sem posição definida.",
    verbalCue: '"Procura" — dito uma vez, ao liberar.',
    handSignal:
      "Mão apontando a área de busca no começo. Depois, nenhum — ele deve trabalhar sozinho.",
    rewardMoment:
      "O petisco encontrado é a recompensa. Não precisa dar nada além. Elogie quando ele achar.",
    commonMistakes: [
      {
        mistake: "Apontar onde está o petisco.",
        fix: "Deixe ele procurar. O trabalho mental é o objetivo — entregar a resposta elimina o benefício.",
      },
      {
        mistake: "Esconder difícil demais na primeira vez.",
        fix: "Comece com o petisco à vista, no chão. Depois parcialmente escondido. Depois fora de vista.",
      },
      {
        mistake: "Fazer com o cão assistindo você esconder.",
        fix: "No começo até ajuda, mas depois tire ele do cômodo — senão ele usa a memória, não o faro.",
      },
    ],
    repeatWhen:
      "5 buscas por sessão. Uma sessão por dia já muda o comportamento de um cão agitado.",
    stopWhen:
      "Quando ele parar de procurar ou se deitar. Faro cansa de verdade, e o cansaço aparece rápido.",
    keyTips: [
      "É o melhor recurso para dia de chuva.",
      "Funciona com cão idoso, cego ou em recuperação de cirurgia.",
      "Aumente a dificuldade devagar: altura, esconderijos, cômodos diferentes.",
    ],
    aiCriteria: [
      "Cão com o focinho próximo ao chão ou ao esconderijo",
      "Postura de busca ativa: corpo baixo, cabeça abaixada",
      "Cão em movimento ou concentrado numa área específica",
      "Ambiente com objetos ou área de busca visível",
    ],
    photoInstruction:
      "Fotografe o cão farejando, com o focinho perto do chão ou do esconderijo.",
  },
};

/** Guia de um exercício. Lança se o id não existir — id inválido é bug, não estado. */
export function getExerciseGuide(id: ExerciseId): ExerciseGuide {
  const guide = EXERCISE_GUIDES[id];
  if (!guide) throw new Error(`Guia não encontrado para o exercício: ${id}`);
  return guide;
}
