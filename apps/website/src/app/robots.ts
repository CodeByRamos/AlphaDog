import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Áreas privadas ou sem valor de busca.
      disallow: ["/app/", "/admin/", "/api/", "/marca"],
    },
    sitemap: new URL("/sitemap.xml", siteConfig.url).toString(),
  };
}
