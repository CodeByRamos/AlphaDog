/** Rotas centralizadas — evita string solta espalhada pelos componentes. */
export const routes = {
  home: "/",
  quiz: "/quiz",
  method: "/metodo",
  reviews: "/avaliacoes",
  journal: "/jornal",
  wiki: "/wiki",
  experts: "/especialistas",
  contact: "/contato",
  signIn: "/entrar",
  signUp: "/cadastrar",
  app: "/app",
  terms: "/termos",
  privacy: "/privacidade",
  subscriptionPolicy: "/politica-de-assinatura",
  guarantee: "/garantia",
} as const;

export const navLinks = [
  { href: routes.method, label: "Método" },
  { href: routes.reviews, label: "Avaliações" },
  { href: routes.journal, label: "Jornal" },
  { href: routes.wiki, label: "Guia de raças" },
] as const;

export const footerNav = [
  {
    title: "Produto",
    links: [
      { href: routes.quiz, label: "Montar o plano" },
      { href: routes.method, label: "Método" },
      { href: routes.experts, label: "Falar com especialista" },
      { href: routes.reviews, label: "Avaliações" },
    ],
  },
  {
    title: "Conteúdo",
    links: [
      { href: routes.journal, label: "Jornal" },
      { href: routes.wiki, label: "Guia de raças" },
    ],
  },
  {
    title: "Empresa",
    links: [{ href: routes.contact, label: "Contato" }],
  },
  {
    title: "Legal",
    links: [
      { href: routes.terms, label: "Termos de uso" },
      { href: routes.privacy, label: "Privacidade" },
      { href: routes.subscriptionPolicy, label: "Política de assinatura" },
      { href: routes.guarantee, label: "Garantia de 30 dias" },
    ],
  },
] as const;
