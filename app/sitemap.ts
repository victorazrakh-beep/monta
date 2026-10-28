import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { listPublicEvents } from "@/lib/data";
import { posts } from "@/lib/blog";
import { listVenues } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const u = (p: string) => `${env.siteUrl}${p}`;
  const [events, venues] = await Promise.all([listPublicEvents({ limit: 1000 }), listVenues()]);
  return [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    { url: u("/busqueda"), changeFrequency: "daily", priority: 0.8 },
    { url: u("/espacios"), changeFrequency: "weekly", priority: 0.8 },
    { url: u("/crear"), changeFrequency: "monthly", priority: 0.7 },
    { url: u("/blog"), changeFrequency: "weekly", priority: 0.6 },
    ...posts.map((p) => ({ url: u(`/blog/${p.slug}`), lastModified: p.date, priority: 0.6 })),
    ...events.map((e) => ({ url: u(`/e/${e.slug}`), changeFrequency: "daily" as const, priority: 0.9 })),
    ...venues.map((v) => ({ url: u(`/espacios/${v.slug}`), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
