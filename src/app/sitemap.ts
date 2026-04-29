import type { MetadataRoute } from "next";
import { NICHE_CATALOG } from "@/data/catalog";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nichefinder.io";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "monthly", priority: 1.0 },
    { url: `${SITE}/methodology`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/beginners`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  const nicheRoutes: MetadataRoute.Sitemap = NICHE_CATALOG.map((n) => ({
    url: `${SITE}/n/${n.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...nicheRoutes];
}
