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

/**
 * Navegação.
 *
 * Só entra aqui o que já existe. Jornal, guia de raças e especialistas estão
 * definidos em `routes` mas fora da navegação de propósito: link para 404 é
 * pior que ausência de link. Voltam quando as páginas existirem.
 */
export const navLinks = [
  { href: routes.method, label: "Método" },
  { href: routes.reviews, label: "Avaliações" },
] as const;

export const footerNav = [
  {
    title: "Produto",
    links: [
      { href: routes.quiz, label: "Montar o plano" },
      { href: routes.method, label: "Método" },
      { href: routes.reviews, label: "Avaliações" },
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
