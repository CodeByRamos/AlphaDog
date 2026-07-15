import type { MetadataRoute } from "next";
import { routes } from "@/lib/routes";
import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  // Só entra rota que existe — sitemap com 404 derruba a confiança do
  // crawler no arquivo inteiro. Jornal e wiki voltam quando forem construídos.
  const staticRoutes: { path: string; priority: number }[] = [
    { path: routes.home, priority: 1 },
    { path: routes.quiz, priority: 0.9 },
    { path: routes.method, priority: 0.7 },
    { path: routes.reviews, priority: 0.6 },
    { path: routes.contact, priority: 0.4 },
    { path: routes.guarantee, priority: 0.4 },
    { path: routes.terms, priority: 0.2 },
    { path: routes.privacy, priority: 0.2 },
    { path: routes.subscriptionPolicy, priority: 0.2 },
  ];

  const lastModified = new Date();

  return staticRoutes.map(({ path, priority }) => ({
    url: new URL(path, siteConfig.url).toString(),
    lastModified,
    priority,
  }));
}
