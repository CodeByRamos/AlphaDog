/**
 * Conteúdo da landing. Mantido como dado (não JSX) para que a extração para
 * next-intl seja mecânica quando um segundo idioma entrar.
 */

export const hero = {
  /**
   * Selo do hero. A referência exibe um prêmio ("#1 Product of the Day"); aqui
   * é uma afirmação verificável sobre o método, porque inventar premiação é
   * propaganda enganosa.
   */
  badge: { label: "Reforço positivo", text: "Sem coleira de choque, sem grito" },
  eyebrow: "Quatro semanas, dez minutos por dia",
  title: "O cão que olha pra você antes de decidir",
  subtitle:
    "Não é obediência de circo. É a guia fazendo uma curva frouxa no meio do quarteirão, a campainha que toca sem virar corrida, o cão que para na porta e espera. O AlphaDog é o caminho até esse dia — uma sessão de dez minutos por vez, cada uma registrada.",
  ctaPrimary: "Montar o plano do meu cão",
  ctaSecondary: "Ver como funciona",
  features: [
    { icon: "paw", label: "O cão em primeiro lugar" },
    { icon: "cap", label: "Guiado por especialistas" },
    { icon: "clock", label: "Acesso 24 horas" },
  ],
  /** Tela do app dentro do mockup. */
  phone: {
    tagline: "Seja um tutor melhor",
    cta: "Começar agora",
    footnote: "Já treina com a gente?",
    footnoteLink: "Entrar",
  },
} as const;

/**
 * Cards que flutuam ao redor do celular.
 *
 * Cada um mostra uma função que o produto realmente tem (ver `features`) — a
 * referência anuncia um assistente de IA que nós não construímos, e anunciar
 * função inexistente é o mesmo problema do prêmio inventado.
 */
export const heroCards = {
  command: { title: "Comando", name: "Senta", badge: "Dominado" },
  streak: { title: "Sequência diária", value: "12 dias" },
  program: {
    title: "Programa de treino",
    rows: ["Atenção no nome", "Senta com distração", "Passeio na guia"],
  },
  experts: { title: "Especialistas", cta: "Falar com especialista" },
  lesson: { title: "Vídeo-aula", name: "Vem aqui", duration: "10 min" },
  tip: {
    title: "Dica do dia",
    body: "Termine sempre num acerto — nunca numa falha.",
    cta: "Próxima",
  },
} as const;

/**
 * Números do produto, não do marketing.
 *
 * Os antigos "+120 mil tutores" e "4,8/5" eram inventados — métrica social falsa
 * num site com paywall é propaganda enganosa (CDC art. 37). Estes quatro são
 * afirmações verificáveis sobre como o produto funciona, não sobre quantos o
 * usam.
 */
export const stats = [
  { value: "10 min", label: "por sessão, cronometrada no app" },
  { value: "5", label: "repetições fecham um exercício" },
  { value: "4 passos", label: "por comando, com o erro comum antes" },
  { value: "0", label: "coleira de choque, enforcador ou grito" },
] as const;

export const features = [
  {
    title: "Plano diário",
    description:
      "Todo dia o app diz exatamente o que treinar e por quanto tempo. Sem adivinhação, sem improviso.",
  },
  {
    title: "Vídeo-aulas curtas",
    description:
      "Cada comando em vídeo, do primeiro passo ao reforço. Assista e treine junto, no mesmo minuto.",
  },
  {
    title: "Comandos e jogos",
    description:
      "Obediência e estímulo mental na mesma trilha — porque cão entediado inventa problema.",
  },
  {
    title: "Correção de comportamento",
    description:
      "Latido, ansiedade de separação, puxar na guia e destruição têm trilhas próprias.",
  },
  {
    title: "Pergunte a um especialista",
    description:
      "Travou? Mande sua dúvida com vídeo e receba resposta de um adestrador certificado.",
  },
  {
    title: "Sequência e desafios",
    description:
      "Constância é o que treina cão. A sequência diária e os desafios mantêm você no jogo.",
  },
] as const;

export const comparison = {
  title: "O que custa treinar um cão no Brasil",
  subtitle: "Comparação com as alternativas mais comuns.",
  rows: [
    { service: "Hotel/creche com adestramento", price: "R$ 120 a R$ 350 por diária" },
    { service: "Adestrador particular em casa", price: "R$ 150 a R$ 400 por sessão" },
    { service: "Aula em grupo", price: "R$ 200 a R$ 500 por mês" },
    { service: "Livros e cursos avulsos", price: "R$ 40 a R$ 300 cada" },
  ],
  alphadog: {
    label: "AlphaDog",
    price: "menos de R$ 2 por dia",
    included: [
      "Programa montado para o seu cão",
      "Vídeo-aulas e guias passo a passo",
      "Especialista certificado à disposição",
      "Trilhas de correção de comportamento",
      "Acesso quando e onde você quiser",
      "Garantia de 30 dias",
    ],
  },
} as const;

export const howItWorks = [
  {
    step: "01",
    title: "Responda sobre o seu cão",
    description: "Raça, idade, rotina e o que mais te incomoda hoje. São 2 minutos.",
  },
  {
    step: "02",
    title: "Receba o plano",
    description:
      "Montamos a trilha na ordem certa para o perfil e o objetivo do seu cão.",
  },
  {
    step: "03",
    title: "Treine 10 minutos por dia",
    description:
      "Sessões curtas e constantes. O app acompanha a evolução e ajusta o ritmo.",
  },
] as const;

export const testimonials = [
  {
    quote:
      "A Nina puxava tanto a guia que eu tinha desistido de passear. Em três semanas o passeio virou a melhor parte do meu dia.",
    author: "Marina R.",
    dog: "Nina, Border Collie, 2 anos",
  },
  {
    quote:
      "O Thor latia para tudo que passava. O que mudou foi ter um passo a passo claro em vez de dez vídeos soltos no YouTube.",
    author: "Rafael M.",
    dog: "Thor, Pastor Alemão, 4 anos",
  },
  {
    quote:
      "Adotei a Mel adulta e achei que fosse tarde demais. As sessões de 10 minutos foram a única coisa que consegui manter.",
    author: "Carolina S.",
    dog: "Mel, SRD, 6 anos",
  },
] as const;

export const faq = [
  {
    question: "Funciona para qualquer raça e idade?",
    answer:
      "Sim. O programa é montado a partir da raça, da idade e do comportamento do seu cão — de filhote a idoso, de SRD a raça pura. O que muda é o ritmo e a ordem dos exercícios.",
  },
  {
    question: "Qual método vocês usam?",
    answer:
      "Reforço positivo, baseado em ciência do comportamento animal. Sem coleira de choque, sem enforcador, sem punição. O cão aprende porque acerta compensa — não porque errar dói.",
  },
  {
    question: "Meu cão não liga para petisco. E agora?",
    answer:
      "Petisco é só uma das moedas. O quiz identifica o que motiva o seu cão — comida, brinquedo, movimento ou atenção — e o plano usa isso como recompensa.",
  },
  {
    question: "Quanto tempo por dia eu preciso ter?",
    answer:
      "Dez minutos. Sessões curtas e diárias treinam mais do que uma hora no sábado — constância vale mais que volume, e o plano é construído em cima disso.",
  },
  {
    question: "Em quanto tempo vejo resultado?",
    answer:
      "A maioria dos tutores nota mudança clara em quatro semanas seguindo o plano. Se você seguir e não vir resultado, devolvemos o valor em até 30 dias.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Pode, direto na sua conta, a qualquer momento. O acesso continua até o fim do período já pago e não há multa nem burocracia.",
  },
  {
    question: "A câmera já reconhece meu cão sozinha?",
    answer:
      "Ainda não. O modelo de visão computacional está em treinamento e não está no ar. Hoje quem marca a repetição é você, tocando “Ele acertou” quando o cão cumpre a postura pelo tempo pedido. Quando a câmera ficar pronta, ela entra como atualização do app, sem custo extra para quem já assina.",
  },
  {
    question: "Se a parte de IA não está pronta, pelo que eu pago?",
    answer:
      "Pelo plano montado a partir do perfil do seu cão, pelos exercícios guiados passo a passo com o erro comum sinalizado, pela sessão cronometrada com registro real, e pelo histórico com estatísticas e sequência diária. Tudo isso funciona hoje e não depende de câmera nenhuma. A câmera vai automatizar a contagem, não fazer o treino.",
  },
  {
    question: "O vídeo do meu cão vai para algum servidor?",
    answer:
      "Não. A imagem da câmera é usada só na tela do seu aparelho durante o treino: não é enviada, não é gravada e não é compartilhada. Quando o reconhecimento automático entrar, ele vai rodar dentro do próprio celular, pelo mesmo motivo.",
  },
] as const;

export const finalCta = {
  title: "A primeira das quatro semanas começa hoje à noite",
  subtitle:
    "Dois minutos de quiz agora, dez minutos com ele depois do jantar. Amanhã o app diz o que treinar e por quanto tempo. Sem coleira de choque e sem promessa de cão obediente em uma semana.",
  cta: "Montar o plano do meu cão",
} as const;

/**
 * Seção "o que é" — storytelling do depois (a vida do tutor quatro semanas à
 * frente). Vende o resultado, não a lista de funções.
 */
export const whatIs = {
  eyebrow: "O depois",
  title: "Como é a sua terça-feira daqui a um mês",
  lead: "São sete e dez da noite. Você pega a guia e ele não sobe na parede: senta na porta, porque sentar é o que abre a porta. Vocês descem, e pela primeira vez em muito tempo você repara na rua em vez de reparar no próprio braço.",
  blocks: [
    {
      title: "O passeio que não dói no dia seguinte",
      body: "A guia faz uma barriga frouxa entre vocês e a coleira só é lembrada quando passa outro cachorro. Quando ele acelera, você para, ele olha pra trás, e o passeio recomeça. No fim da quadra o ombro está inteiro e a mão não está marcada.",
    },
    {
      title: "A campainha que não vira emboscada",
      body: "Toca a campainha e ele late duas vezes, não trinta. Você diz “deita” no meio do corredor e ele deita — o mesmo deitar que vocês treinaram em cima do tapete da sala. A visita entra e encontra um cão, não uma comoção.",
    },
    {
      title: "O jantar em que ninguém implora",
      body: "Vocês sentam à mesa e ele deita ao lado, sem cotovelo na sua perna e sem baba na altura do prato. Não é resignação: deitar ali já foi pago tantas vezes que virou o hábito mais barato que ele tem.",
    },
    {
      title: "O olhar de dois segundos",
      body: "É a mudança que ninguém filma e que muda tudo: antes de decidir qualquer coisa, ele te olha. Dois segundos de checagem, na porta do elevador, na calçada, no portão aberto. Foi pra isso que serviram as cinco repetições de sentar, todo dia.",
    },
  ],
  close:
    "Nada disso é sorte, temperamento ou raça. É o acúmulo de sessões curtas feitas na ordem certa — e é exatamente isso que o AlphaDog organiza, marca no relógio e guarda pra você conferir depois.",
} as const;

/**
 * Seção da câmera — o diferencial do produto, escrito com honestidade radical.
 *
 * O modelo de visão computacional NÃO está no ar. Esta seção vende a ambição do
 * recurso e publica o critério que ele precisa atingir, em vez de fingir que já
 * funciona. Anunciar recurso inexistente como pronto, num site que cobra, é
 * propaganda enganosa — e a convenção do repo já proíbe isso.
 */
export const cameraSection = {
  eyebrow: "Em desenvolvimento",
  title: "A câmera que vai contar as repetições por você",
  lead: "O treino de hoje funciona sem câmera nenhuma: você apoia o celular, o app cronometra e guia, e quando o cão cumpre a postura você toca “Ele acertou”. A câmera é o passo seguinte — ela vai fazer essa marcação sozinha, e só entra no ar quando confirmar postura e permanência melhor que o olho apressado de um tutor cansado.",
  steps: [
    {
      title: "Encontrar o cão, não só o movimento",
      body: "O detector localiza o cão no quadro e marca 24 pontos do corpo: patas, cotovelos, jarretes, cernelha, base da cauda. É o mesmo esquema do StanfordExtra, o conjunto de referência acadêmico para pose canina.",
      status: "em-breve",
    },
    {
      title: "Dois sinais independentes precisam concordar",
      body: "A postura é lida de duas formas ao mesmo tempo: pela proporção da caixa que envolve o cão e pela geometria dos pontos. Quando o cão senta, as patas traseiras somem atrás do corpo — a caixa sobrevive à oclusão, a geometria não. Se as duas discordam, a resposta é “não sei”, nunca a mais otimista.",
      status: "em-breve",
    },
    {
      title: "Um quadro não é um acerto",
      body: "Detecção pisca: um quadro ruim entre vinte bons não é falha do cão. A decisão sai de uma janela de cinco quadros e exige três votos iguais, e a permanência é contada pelo relógio da captura. Sentar é sentar e ficar dois segundos — não aparecer sentado num quadro.",
      status: "em-breve",
    },
    {
      title: "Na dúvida, calar a boca",
      body: "Um “isso!” na hora errada ensina o cão a repetir o comportamento errado e ensina você a desconfiar do app. Quando a leitura fica ambígua, a tela diz que não está vendo direito em vez de chutar. Ficar em silêncio custa uma repetição; elogiar errado custa o treino inteiro.",
      status: "em-breve",
    },
  ],
  today: {
    title: "Enquanto isso, quem marca é você",
    body: "Você toca em “Ele acertou” no instante do acerto e a sessão segue: pausa de três segundos para recompensar, próxima repetição, registro no histórico. Funciona hoje, em qualquer celular, sem depender de nenhum modelo.",
  },
  privacy:
    "O vídeo não sai do seu aparelho. A imagem existe só pra você se enxergar durante a sessão — não é enviada, não é gravada, não é compartilhada. Quando o reconhecimento automático entrar, vai rodar dentro do próprio celular, pelo mesmo motivo.",
  note: "O reconhecimento por câmera ainda está em treinamento e não está no ar. Preferimos escrever isso aqui, na página de vendas, a deixar você descobrir depois de pagar.",
} as const;

/**
 * Seção "tudo o que você recebe", separada por status. O que está `disponivel`
 * funciona hoje; o que está `em-breve` é roadmap incluso na assinatura e leva
 * selo visível — o mesmo padrão do app.
 */
export const capabilities = {
  eyebrow: "O que você recebe",
  title: "O que está no ar, e o que ainda não está",
  lead: "Uma lista curta e verdadeira: o que já está no seu celular hoje e o que ainda estamos construindo, cada coisa com o rótulo certo. Nada aqui é print de tela que não existe.",
  groups: [
    {
      name: "O plano do seu cão",
      items: [
        { title: "Quiz de dois minutos", body: "Raça, idade, rotina e o que mais te incomoda hoje. É o que define quais exercícios vêm primeiro, em que ritmo e com qual recompensa — comida, brinquedo ou movimento.", status: "disponivel" },
        { title: "Perfil do cão", body: "Nome, idade e histórico ficam salvos no perfil dele. Dois cães em casa? Duas trilhas separadas e dois históricos, sem misturar a evolução.", status: "disponivel" },
        { title: "Exercícios guiados passo a passo", body: "Sentar, dar a pata e deitar, cada um em quatro passos curtos, com repetições e tempo de permanência definidos. Três comandos completos valem mais que uma biblioteca que você nunca termina.", status: "disponivel" },
        { title: "O erro comum, avisado antes", body: "Todo exercício abre com o erro que quase todo tutor comete. Empurrar o bumbum ensina o cão a esperar ser empurrado — melhor saber disso antes da primeira tentativa.", status: "disponivel" },
      ],
    },
    {
      name: "A sessão de dez minutos",
      items: [
        { title: "Sessão cronometrada", body: "O relógio corre na tela do começo ao fim. Sessão curta e diária treina mais que uma maratona no fim de semana, e o cronômetro existe pra você parar na hora certa, com o cão ainda querendo mais.", status: "disponivel" },
        { title: "Marcação de acerto pelo tutor", body: "Um toque em “Ele acertou” fecha a repetição. Quem decide é você, olhando o cão — o app só garante que a conta feche e que a sessão termine num acerto, nunca numa falha.", status: "disponivel" },
        { title: "Repetição com permanência", body: "O app não conta gesto solto: cada repetição pede que o cão fique na posição por alguns segundos antes de valer. É a diferença entre um cão que encosta o bumbum e um cão que espera o comando.", status: "disponivel" },
        { title: "Sessão gravada na conta", body: "Terminou, ficou registrado: exercício, duração e repetições, no perfil daquele cão. Não é um contador que zera quando você troca de celular.", status: "disponivel" },
      ],
    },
    {
      name: "A prova de que está funcionando",
      items: [
        { title: "Histórico de sessões", body: "Toda sessão fica na linha do tempo do seu cão, com data e duração. Na terceira semana, quando bater a dúvida de estar perdendo tempo, é essa tela que responde.", status: "disponivel" },
        { title: "Estatísticas do treino", body: "Tempo treinado, repetições fechadas e em quais exercícios. Um comando só entra como dominado depois de três sessões com 80% de acerto — não basta acertar uma vez num dia bom.", status: "disponivel" },
        { title: "Sequência de dias", body: "Os dias seguidos de treino, contados de hoje para trás. É a métrica mais chata e a mais honesta: ela cai no dia em que você pula, porque é isso que trava o aprendizado do cão.", status: "disponivel" },
      ],
    },
    {
      name: "Ainda em construção — incluído quando entrar",
      items: [
        { title: "Reconhecimento de postura pela câmera", body: "O app vai confirmar sozinho se o cão está sentado, deitado ou em pé, e contar os segundos de permanência. O modelo está em treinamento e ainda não está no ar.", status: "em-breve" },
        { title: "Feedback automático em tempo real", body: "O app dizendo “segura mais dois segundos” durante a repetição, sem você tirar os olhos do cão. Depende do reconhecimento por câmera estar confiável a ponto de não errar na frente do tutor.", status: "em-breve" },
        { title: "Detecção de comportamento", body: "Reconhecer padrões além da postura — puxar a guia, agitação na campainha — para sugerir o próximo exercício. Está no plano de produto, não no aplicativo de hoje.", status: "em-breve" },
        { title: "Análise de evolução por vídeo", body: "Comparar a gravação da primeira semana com a da quarta e mostrar o que mudou no cão. Ainda não existe; hoje a comparação vem do histórico e das estatísticas.", status: "em-breve" },
      ],
    },
  ],
} as const;
