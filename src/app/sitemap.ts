import { prisma } from "@/lib/prisma"
import { MetadataRoute } from "next"

const BASE = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/forum`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/collections`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
  ]

  try {
    const games = await prisma.game.findMany({
      where: { isPublished: true },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    })

    const gamePages: MetadataRoute.Sitemap = games.map(g => ({
      url: `${BASE}/games/${g.id}`,
      lastModified: g.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }))

    return [...staticPages, ...gamePages]
  } catch {
    return staticPages
  }
}