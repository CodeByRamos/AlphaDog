/**
 * Conteúdo da landing. Mantido como dado (não JSX) para que a extração para
 * next-intl seja mecânica quando um segundo idioma entrar.
 */

export const hero = {
  eyebrow: "Método positivo, baseado em ciência",
  title: "Seu cão não precisa de mais gritos. Precisa de um plano.",
  subtitle:
    "O AlphaDog monta um programa de adestramento sob medida para a raça, a idade e o comportamento do seu cão — em sessões de 10 minutos que cabem no seu dia.",
  ctaPrimary: "Montar o plano do meu cão",
  ctaSecondary: "Já sou aluno",
  disclaimer: "Leva 2 minutos. Sem cartão de crédito.",
  pillars: [
    { title: "Feito para o seu cão", description: "Raça, idade e rotina" },
    { title: "Criado por especialistas", description: "Adestradores certificados" },
    { title: "No seu ritmo", description: "10 minutos por dia" },
  ],
} as const;

export const stats = [
  { value: "+120 mil", label: "tutores treinando" },
  { value: "4,8/5", label: "avaliação média" },
  { value: "10 min", label: "por sessão" },
  { value: "4 semanas", label: "para os primeiros resultados" },
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
] as const;

export const finalCta = {
  title: "O plano do seu cão começa com 2 minutos",
  subtitle:
    "Responda sobre a raça, a idade e o comportamento dele. A gente monta o resto.",
  cta: "Montar o plano do meu cão",
} as const;
