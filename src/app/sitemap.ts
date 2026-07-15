import type { MetadataRoute } from "next";
import { routes } from "@/lib/routes";
import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: { path: string; priority: number }[] = [
    { path: routes.home, priority: 1 },
    { path: routes.quiz, priority: 0.9 },
    { path: routes.method, priority: 0.7 },
    { path: routes.reviews, priority: 0.6 },
    { path: routes.journal, priority: 0.6 },
    { path: routes.wiki, priority: 0.6 },
    { path: routes.terms, priority: 0.2 },
    { path: routes.privacy, priority: 0.2 },
  ];

  const lastModified = new Date();

  return staticRoutes.map(({ path, priority }) => ({
    url: new URL(path, siteConfig.url).toString(),
    lastModified,
    priority,
  }));
}
