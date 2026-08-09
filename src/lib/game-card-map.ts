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
 * 资源标签按来源字段分色（语言=蓝、运行方式=橙、资源内容=绿），
 * 让用户一眼区分卡片上的标签类型。颜色取自站点主题语义令牌，未配置时回退默认。
 */
const RESOURCE_TAG_COLOR: Record<"language" | "runType" | "resourceContent", string> = {
  language: "#3b82f6",        // 蓝
  runType: "#f59e0b",         // 橙
  resourceContent: "#10b981", // 绿
}

/**
 * 将 Prisma Game（含 tags/resources）映射为 GameCard 所需的 GameCardData。
 * 资源标签来自 resources 的 language / runType / resourceContent 去重合并。
 *
 * opts.resourceTagColor：未提供时按 kind 分色（语言蓝、运行方式橙、资源内容绿），
 * 以让卡片上视觉区分资源标签的来源类别。
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
  // 按字段去重收集标签，每个标签带 kind（来源类别）和 color，便于卡片分组着色展示。
  const seen = new Set<string>()
  const resourceTags: { name: string; color: string; kind: "language" | "runType" | "resourceContent" }[] = []
  const kindOrder: Array<["language" | "runType" | "resourceContent", "language" | "runType" | "resourceContent"]> = [
    ["language", "language"],
    ["runType", "runType"],
    ["resourceContent", "resourceContent"],
  ]
  for (const r of g.resources ?? []) {
    for (const [key, kind] of kindOrder) {
      try {
        for (const name of parseTags(r[key])) {
          if (!seen.has(name)) {
            seen.add(name)
            resourceTags.push({ name, kind, color: RESOURCE_TAG_COLOR[kind] })
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
