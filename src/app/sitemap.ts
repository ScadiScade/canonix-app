import { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || "https://canonix.app";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/marketplace`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const publicUniverses = await prisma.universe.findMany({
      where: { visibility: "public" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    const universePages: MetadataRoute.Sitemap = publicUniverses.map((u) => ({
      url: `${baseUrl}/s/${u.slug}`,
      lastModified: u.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [...staticPages, ...universePages];
  } catch {
    return staticPages;
  }
}
