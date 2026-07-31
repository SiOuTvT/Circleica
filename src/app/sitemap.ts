import { prisma } from "@/lib/prisma"
import { MetadataRoute } from "next"

const BASE = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/games`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/forum`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/credits/tag`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/credits/collection`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/rules`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/credits`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.2 },
    // Galvelica 资料库子站
    { url: `${BASE}/galvelica`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/galvelica/works`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/galvelica/tags`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/galvelica/years`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/galvelica/studios`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
  ]

  try {
    const games = await prisma.game.findMany({
      where: { isPublished: true },
      select: { serialId: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    })

    const gamePages: MetadataRoute.Sitemap = games.map(g => ({
      url: `${BASE}/games/${g.serialId}`,
      lastModified: g.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }))

    return [...staticPages, ...gamePages]
  } catch {
    return staticPages
  }
}