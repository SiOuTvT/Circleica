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
    { url: `${BASE}/credits/studio`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/credits/creator`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
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
      // 单份 sitemap 上限 50000 条；此前 take:5000 会在游戏超过 5000 时静默截断
      take: 50000,
    })

    const gamePages: MetadataRoute.Sitemap = games.map(g => ({
      url: `${BASE}/games/${g.serialId}`,
      lastModified: g.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }))

    // Galvelica 资料库作品详情页：用 slug 作为 URL 标识（schema 标注「URL 用」）。
    // 排除商业系列作品（副站资料馆列表/详情一律排除）；总量 < 50000，单 sitemap 文件合规。
    const works = await prisma.work.findMany({
      where: { isCommercial: false },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    })

    const workPages: MetadataRoute.Sitemap = works.map(w => ({
      url: `${BASE}/galvelica/works/${w.slug}`,
      lastModified: w.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }))

    // 图鉴详情页（制作组 / 创作者 / 标签 / 精选合集）：slug 稳定；这些实体变化不频繁，
    // lastModified 用当前时间即可，重点是把详情 URL 补进 sitemap 供搜索引擎发现。
    const [studios, creators, tags, collections] = await Promise.all([
      prisma.studio.findMany({ select: { slug: true } }),
      prisma.creator.findMany({ select: { slug: true } }),
      prisma.tag.findMany({ select: { slug: true } }),
      prisma.curatedCollection.findMany({ where: { published: true }, select: { slug: true } }),
    ])
    const now = new Date()
    const toSlugPages = (prefix: string, items: { slug: string }[]): MetadataRoute.Sitemap =>
      items.map((i) => ({
        url: `${BASE}${prefix}/${i.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      }))
    const slugPages: MetadataRoute.Sitemap = [
      ...toSlugPages("/credits/studio", studios),
      ...toSlugPages("/credits/creator", creators),
      ...toSlugPages("/credits/tag", tags),
      ...toSlugPages("/credits/collection", collections),
    ]

    return [...staticPages, ...gamePages, ...workPages, ...slugPages]
  } catch {
    return staticPages
  }
}