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
 *
 * opts.resourceTagColor：资源标签的统一颜色，默认 CARD_TAG_COLOR（灰）。首页会传入站点可配置的 cardTagColor。
 * opts.coverFallback：封面为空时的回退图（如站点占位图），默认空串。
 */
export function mapGameToCard(
  g: {
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
  },
  opts?: { resourceTagColor?: string; coverFallback?: string },
): GameCardData {
  const resourceTagColor = opts?.resourceTagColor ?? CARD_TAG_COLOR
  const downloadLinks = Array.isArray(g.downloadLinks) ? g.downloadLinks : []
  // 解析资源标签字段：兼容「数组」与「JSON 字符串」（历史存 JSON.stringify 的字段）。
  // 注意：此链路不走 repository 层反序列化（GAME_CARD_SELECT 直接查 Prisma），必须在此自行解析。
  const parseTags = (field: unknown): string[] => {
    if (Array.isArray(field)) return field.filter((x): x is string => typeof x === "string")
    if (typeof field !== "string" || field.trim() === "") return []
    try {
      const parsed: unknown = JSON.parse(field)
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []
    } catch {
      return []
    }
  }
  const seen = new Set<string>()
  const resourceTags: { name: string; color: string }[] = []
  for (const r of g.resources ?? []) {
    for (const field of [r.language, r.runType, r.resourceContent]) {
      try {
        for (const name of parseTags(field)) {
          if (!seen.has(name)) {
            seen.add(name)
            resourceTags.push({ name, color: resourceTagColor })
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
    coverImage: g.coverImage || opts?.coverFallback || "",
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
