/**
 * Avaliações exibidas em /avaliacoes.
 *
 * Conteúdo de exemplo — substituir por avaliações reais antes de publicar. As
 * notas 3 e 4 estão aqui de propósito: uma página só com cinco estrelas não
 * convence ninguém, e a crítica honesta ("não é mágica, exige constância") faz
 * mais pela conversão do que elogio uniforme.
 *
 * Quando entrarem avaliações reais, este arquivo dá lugar à tabela Review do
 * Prisma, que já existe no schema com moderação (`isApproved`).
 */

export type Review = {
  author: string;
  dog: string;
  rating: number;
  body: string;
};

export const reviews: readonly Review[] = [
  {
    author: "Marina R.",
    dog: "Nina, Border Collie, 2 anos",
    rating: 5,
    body: "A Nina puxava tanto a guia que eu tinha desistido de passear. Em três semanas o passeio virou a melhor parte do meu dia. O que mudou foi ter um passo a passo, não mais um vídeo solto.",
  },
  {
    author: "Rafael M.",
    dog: "Thor, Pastor Alemão, 4 anos",
    rating: 5,
    body: "O Thor latia para tudo que passava na frente de casa. Em um mês reduziu uns 80%. Não é silêncio absoluto, mas dá pra receber visita sem passar vergonha.",
  },
  {
    author: "Carolina S.",
    dog: "Mel, SRD, 6 anos",
    rating: 5,
    body: "Adotei a Mel adulta e achei que fosse tarde demais. As sessões de 10 minutos foram a única coisa que consegui manter com dois filhos em casa.",
  },
  {
    author: "Diego P.",
    dog: "Amora, Bulldog Francês, 8 meses",
    rating: 4,
    body: "Conteúdo muito bom e bem explicado. Só senti falta de mais material específico para raça braquicefálica — a Amora cansa rápido e tive que adaptar o ritmo por conta própria.",
  },
  {
    author: "Juliana T.",
    dog: "Bento, Golden Retriever, 1 ano",
    rating: 5,
    body: "O que me pegou foi a parte de generalização. Ele já sentava em casa, mas ignorava na rua. Hoje senta na calçada com cachorro passando do lado.",
  },
  {
    author: "André L.",
    dog: "Zeus, Rottweiler, 3 anos",
    rating: 3,
    body: "O método funciona, mas não é mágica. Nas duas primeiras semanas quase larguei porque não vi quase nada mudar. Só engrenou quando eu passei a treinar todo dia de verdade, e não três vezes por semana. Se você não tiver essa constância, não adianta.",
  },
  {
    author: "Patrícia N.",
    dog: "Lupi, Shih Tzu, 5 anos",
    rating: 5,
    body: "Ansiedade de separação era um inferno — chorava o dia inteiro e a vizinha reclamava. O protocolo de dessensibilização foi lento, mas foi o único que funcionou.",
  },
  {
    author: "Marcelo A.",
    dog: "Pipoca, SRD, 7 meses",
    rating: 4,
    body: "Ótimo para o básico e para xixi no lugar certo. Achei o app um pouco insistente com notificação no começo, mas dá pra desligar nas configurações.",
  },
  {
    author: "Fernanda C.",
    dog: "Kira, Husky, 2 anos",
    rating: 5,
    body: "Husky é teimoso e eu já tinha tentado adestrador particular, que custou caro e durou pouco. Aqui o que mudou foi eu entender o porquê de cada exercício.",
  },
];
