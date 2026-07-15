/** Fonte única de verdade para dados da marca usados em SEO, e-mails e UI. */
export const siteConfig = {
  name: "AlphaDog",
  tagline: "Adestramento personalizado para o seu cão",
  description:
    "Programa de adestramento personalizado para o seu cão, criado a partir da raça, idade e comportamento. Aulas curtas, método positivo e acompanhamento de especialistas.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://alphadog.com.br",
  locale: "pt-BR",
  currency: "BRL",
  contactEmail: "suporte@alphadog.com.br",
  social: {
    instagram: "https://instagram.com/alphadog",
    youtube: "https://youtube.com/@alphadog",
  },
} as const;
