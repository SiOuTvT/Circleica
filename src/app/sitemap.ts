import { prisma } from "@/lib/prisma"
import { MetadataRoute } from "next"

const BASE = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,              lastModified: new Date(), changeFrequency: "daily",   priority: 1 },
    { url: `${BASE}/search`,  lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/forum`,   lastModified: new Date(), changeFrequency: "hourly",  priority: 0.8 },
    { url: `${BASE}/creators`,lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/collections`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  ]

  try {
    const [games, creators] = await Promise.all([
      prisma.game.findMany({
        where: { isPublished: true },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.creator.findMany({
        select: { id: true, createdAt: true },
      }),
    ])

    const gameRoutes: MetadataRoute.Sitemap = games.map(g => ({
      url:             `${BASE}/games/${g.id}`,
      lastModified:    g.updatedAt,
      changeFrequency: "weekly",
      priority:        0.8,
    }))

    const creatorRoutes: MetadataRoute.Sitemap = creators.map(c => ({
      url:             `${BASE}/creators/${c.id}`,
      lastModified:    c.createdAt,
      changeFrequency: "monthly",
      priority:        0.6,
    }))

    return [...staticRoutes, ...gameRoutes, ...creatorRoutes]
  } catch {
    return staticRoutes
  }
}
