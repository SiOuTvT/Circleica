import type { GameCardData } from "@/components/game-card"
import { Prisma } from "@prisma/client"

/** 列表/发现页统一选字段（含资源，用于推导 resourceTags） */
export const GAME_CARD_SELECT = {
  id: true,
  serialId: true,
  title: true,
  coverImage: true,
  status: true,
  isNsfw: true,
  favoriteCount: true,
  viewCount: true,
  downloadCount: true,
  downloadLinks: true,
  updatedAt: true,
  createdAt: true,
  tags: { select: { tag: { select: { name: true, color: true } } } },
  resources: { select: { language: true, runType: true, resourceContent: true } },
} satisfies Prisma.GameSelect

const CARD_TAG_COLOR = "#6b7280"

/**
 * 将 Prisma Game（含 tags/resources）映射为 GameCard 所需的 GameCardData。
 * 资源标签来自 resources 的 language / runType / resourceContent 去重合并。
 */
export function mapGameToCard(g: {
  id: string
  serialId?: number | null
  title: string
  coverImage: string | null
  status: string
  isNsfw: boolean
  favoriteCount: number
  viewCount?: number | null
  downloadCount?: number | null
  downloadLinks?: unknown
  updatedAt?: Date | string
  createdAt?: Date | string
  tags?: { tag: { name: string; color: string } }[]
  resources?: { language: unknown; runType: unknown; resourceContent: unknown }[]
}): GameCardData {
  const downloadLinks = Array.isArray(g.downloadLinks) ? g.downloadLinks : []
  const seen = new Set<string>()
  const resourceTags: { name: string; color: string }[] = []
  for (const r of g.resources ?? []) {
    for (const field of [r.language, r.runType, r.resourceContent]) {
      try {
        const arr: string[] = Array.isArray(field) ? (field as string[]) : []
        for (const name of arr) {
          if (!seen.has(name)) {
            seen.add(name)
            resourceTags.push({ name, color: CARD_TAG_COLOR })
          }
        }
      } catch {
        /* 单个资源解析失败不影响整体 */
      }
    }
  }
  return {
    id: g.id,
    serialId: g.serialId,
    title: g.title,
    coverImage: g.coverImage ?? "",
    status: g.status,
    isNsfw: g.isNsfw,
    favoriteCount: g.favoriteCount,
    viewCount: g.viewCount ?? undefined,
    downloadCount: g.downloadCount ?? undefined,
    downloadLinks,
    updatedAt: g.updatedAt,
    createdAt: g.createdAt,
    tags: (g.tags ?? []).map((t) => t.tag),
    resourceTags,
  } as unknown as GameCardData
}
