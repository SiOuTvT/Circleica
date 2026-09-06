/**
 * 标签浏览页面数据获取工具
 * 带 Redis/内存缓存支持，缓存 5 分钟
 */

import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { getMainNsfwMode } from "@/lib/nsfw-mode"
import type { TagBrowserData, TagDetail, TagGameItem, TagInfo, TagGroupWithTags, TagWithGroup } from "@/types/tags-browser"

/**
 * 获取标签浏览页面数据（带缓存）
 * 缓存 5 分钟，避免频繁查询数据库
 */
export async function getTagBrowserData(): Promise<TagBrowserData> {
  const cacheKeyStr = cacheKey("tags-browser", "data")

  // 尝试从缓存获取
  const cached = await cache.get<TagBrowserData>(cacheKeyStr)
  if (cached) {
    return cached
  }

  try {
    // 并发生成三组数据
    const [tagGroupsData, hotTagsData, statsData] = await Promise.all([
      // 1. 获取所有标签组及其标签（带游戏数量）
      getTagGroupsWithTags(),
      // 2. 获取热门标签（Top 30）
      getHotTags(30),
      // 3. 获取统计信息
      getStats(),
    ])

    // 4. 按首字母聚合标签
    const tagsByLetter = buildTagsByLetter(tagGroupsData)

    const data: TagBrowserData = {
      hotTags: hotTagsData,
      tagGroups: tagGroupsData,
      stats: statsData,
      tagsByLetter,
    }

    // 缓存 5 分钟
    await cache.set(cacheKeyStr, data, 300)

    return data
  } catch (error) {
    logger.db.error("[TagsBrowser] Failed to fetch data", error)
    // 返回空数据，让页面显示错误状态
    return {
      hotTags: [],
      tagGroups: [],
      stats: { totalTags: 0, totalGames: 0 },
      tagsByLetter: {},
    }
  }
}

/**
 * 获取所有标签组及其标签（带游戏数量）
 */
async function getTagGroupsWithTags(): Promise<TagGroupWithTags[]> {
  // "发现页标签"预设组（id 稳定，不依赖 positions——历史数据 positions 为空）。
  const group = await prisma.tagGroup.findUnique({
    where: { id: "preset_discover" },
  })
  if (!group) return []

  // 与后台组详情一致：预设组若没有直接挂标签，则取「已关联已发布游戏」的所有主站标签
  // 作为该组内容（发现页标签墙 = 全站分类标签），颜色统一用组色。
  const groupTags = await prisma.tag.findMany({
    where: {
      source: "circleica",
      games: { some: { game: { isPublished: true } } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, color: true },
  })

  const allTagIds = groupTags.map(t => t.id)
  const gameCounts = await prisma.gameTag.groupBy({
    by: ["tagId"],
    where: {
      tagId: { in: allTagIds },
      game: { isPublished: true },
    },
    _count: { tagId: true },
  })
  const countMap = new Map(gameCounts.map(r => [r.tagId, r._count.tagId]))

  const tags = groupTags
    .map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color || group.color || "#a78bfa",
      gameCount: countMap.get(tag.id) ?? 0,
    }))
    .filter(t => t.gameCount > 0)

  if (tags.length === 0) return []

  return [{
    id: group.id,
    name: group.name,
    color: group.color,
    description: group.description,
    tags,
  }]
}

/**
 * 获取热门标签（按游戏数量排序）
 */
async function getHotTags(limit: number): Promise<TagInfo[]> {
  const tagStats = await prisma.gameTag.groupBy({
    by: ["tagId"],
    _count: { tagId: true },
    where: {
      game: { isPublished: true },
    },
    orderBy: {
      _count: { tagId: "desc" },
    },
    take: limit,
  })

  const tagIds = tagStats.map(ts => ts.tagId)
  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds }, source: "circleica" },
    select: { id: true, name: true, slug: true, color: true },
  })

  const tagMap = new Map(tags.map(t => [t.id, t]))

  return tagStats
    .map(ts => {
      const tag = tagMap.get(ts.tagId)
      if (!tag) return null
      return {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color || "#6b7280",
        gameCount: ts._count.tagId,
      }
    })
    .filter((t): t is TagInfo => t !== null)
}

/**
 * 获取统计信息
 */
// 标签浏览页「总标签数 / 已发布游戏数」两个聚合计数：与标签/游戏发布无强实时要求，
// 用 unstable_cache 缓存 5 分钟，避免每次访问标签页都重复 count（PERF-4）。
const _tagStatsCache = unstable_cache(
  async () => {
    const [totalTags, totalGames] = await Promise.all([
      prisma.tag.count(),
      prisma.game.count({ where: { isPublished: true } }),
    ])
    return { totalTags, totalGames }
  },
  ["tags-browser-stats"],
  { revalidate: 300 },
)

async function getStats(): Promise<{ totalTags: number; totalGames: number }> {
  return _tagStatsCache()
}

/**
 * 按首字母聚合标签
 */
function buildTagsByLetter(tagGroups: TagGroupWithTags[]): Record<string, TagWithGroup[]> {
  const letterMap = new Map<string, TagWithGroup[]>()

  for (const group of tagGroups) {
    for (const tag of group.tags) {
      // 获取首字母（中文取拼音首字母，英文取大写首字母）
      const firstChar = tag.name.charAt(0)
      const letter = getLetterKey(firstChar)

      if (!letterMap.has(letter)) {
        letterMap.set(letter, [])
      }

      letterMap.get(letter)!.push({
        ...tag,
        group: {
          id: group.id,
          name: group.name,
          color: group.color,
        },
      })
    }
  }

  // 转为对象并按 key 排序
  const result: Record<string, TagWithGroup[]> = {}
  const sortedKeys = Array.from(letterMap.keys()).sort()
  for (const key of sortedKeys) {
    result[key] = letterMap.get(key)!.sort((a, b) =>
      a.name.localeCompare(b.name, "zh-Hans-CN")
    )
  }

  return result
}

/**
 * 标签详情：标签本身 + 该标签下已发布游戏（全量查询，超安全阈值截断展示）
 * DB 不可达返回 null（绝不注入假数据）。
 */
const TAG_GAME_LIMIT = 60

/**
 * 标签详情（按 slug 路由）：标签本身 + 该标签下已发布游戏（全量查询，超安全阈值截断展示）
 * DB 不可达返回 null（绝不注入假数据）。slug 缺失的存量标签在回填前不可达。
 */
const SORT_ORDER: Record<"hot" | "new" | "name", Prisma.GameTagOrderByWithRelationInput[]> = {
  hot: [{ game: { favoriteCount: "desc" } }],
  new: [{ game: { createdAt: "desc" } }],
  name: [{ game: { title: "asc" } }],
}

/**
 * 路由段容错解码（用于 slug 这类可能含非 ASCII 的路由参数）。
 *
 * 背景：Archive 路由是「CJK 直出」——库里存的是中文原文，而浏览器把中文 slug 放进 URL 时
 * 会 percent-encode（如「男主角」→ %E7%94%B7%E4%B8%BB%E8%A7%92）。Next 交给页面的 params 仍是编码串，
 * 直接拿去查库必然 miss；英文 slug 编码前后一致所以看起来没事。
 *
 * 规则（按指令）：
 *  - v 不含 % 直接返回；
 *  - 含 % 则尝试 decodeURIComponent，解码后若仍含 %（双重编码）再解一次，最多两轮；
 *  - 任何一步抛错（畸形 % 序列）退回上一次的值，绝不让请求因解码失败而 500。
 */
function decodeSlug(v: string): string {
  if (!v.includes("%")) return v
  const tryDecode = (s: string): string => {
    try {
      const once = decodeURIComponent(s)
      if (once.includes("%")) {
        try {
          return decodeURIComponent(once)
        } catch {
          return once
        }
      }
      return once
    } catch {
      return s
    }
  }
  return tryDecode(v)
}

export async function getTagDetailBySlug(rawSlug: string, sort: "hot" | "new" | "name" = "hot"): Promise<TagDetail | null> {
  // 函数体内从第一行起统一使用「解码后」的 slug，不再触碰原始参数。
  const slug = decodeSlug(rawSlug)
  try {
    // ⚠️ 标签下游戏卡片（含封面）按 NSFW 模式过滤：SFW 用户不看到露骨封面
    const nsfwMode = await getMainNsfwMode()
    const nsfwWhere = nsfwMode === "sfw" ? { isNsfw: false } : nsfwMode === "nsfw" ? { isNsfw: true } : {}
    const tag = await prisma.tag.findUnique({
      where: { slug },
      include: { group: { select: { id: true, name: true, color: true } } },
    })
    if (!tag) return null
    // 主站恒过滤副站数据：slug 命中但来源不是 circleica（即 galvelica 标签）一律视为不存在，
    // 杜绝副站标签窜入主站详情页。
    if (tag.source !== "circleica") return null

    const total = await prisma.gameTag.count({
      where: { tagId: tag.id, game: { isPublished: true, ...nsfwWhere } },
    })

    const rows = await prisma.gameTag.findMany({
      where: { tagId: tag.id, game: { isPublished: true, ...nsfwWhere } },
      include: {
        game: {
          select: {
            id: true,
            serialId: true,
            title: true,
            coverImage: true,
            isNsfw: true,
            status: true,
            favoriteCount: true,
            viewCount: true,
            downloadCount: true,
          },
        },
      },
      orderBy: SORT_ORDER[sort] ?? SORT_ORDER.hot,
      take: TAG_GAME_LIMIT + 1,
    })

    const items: TagGameItem[] = rows
      .filter((r) => r.game)
      .map((r) => ({
        id: r.game.id,
        serialId: r.game.serialId,
        title: r.game.title,
        coverImage: r.game.coverImage,
        isNsfw: r.game.isNsfw,
        status: r.game.status ?? "",
        favoriteCount: r.game.favoriteCount ?? 0,
        viewCount: r.game.viewCount,
        downloadCount: r.game.downloadCount,
      }))

    const hasMore = items.length > TAG_GAME_LIMIT
    const games = hasMore ? items.slice(0, TAG_GAME_LIMIT) : items

    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description,
      color: tag.color,
      group: tag.group,
      games,
      gameCount: total,
      hasMore,
      relatedTags: await getRelatedTags(tag.id),
    }
  } catch (error) {
    logger.db.error("[TagsBrowser] getTagDetailBySlug failed", error)
    return null
  }
}

/**
 * 相关标签（高级版聚合推荐）：同组其他标签优先，再补高频共现标签，去重截断。
 */
async function getRelatedTags(tagId: string, limit = 14): Promise<TagInfo[]> {
  const tag = await prisma.tag.findUnique({ where: { id: tagId }, select: { groupId: true } })
  if (!tag) return []

  // 同组其他标签（已关联已发布游戏）
  const sameGroup = tag.groupId
    ? await prisma.tag.findMany({
        where: { groupId: tag.groupId, id: { not: tagId }, source: "circleica", games: { some: { game: { isPublished: true } } } },
        select: { id: true, name: true, slug: true, color: true, _count: { select: { games: true } } },
        take: limit,
      }).then((rows) => rows.map((t) => ({ id: t.id, name: t.name, slug: t.slug, color: t.color, gameCount: t._count.games })))
    : []

  // 高频共现标签：与该标签共享游戏的其他标签，按共现游戏数排序
  const co = await prisma.gameTag.findMany({ where: { tagId }, select: { gameId: true }, take: 200 })
  const gameIds = co.map((r) => r.gameId)
  let coTags: TagInfo[] = []
  if (gameIds.length) {
    const grouped = await prisma.gameTag.groupBy({
      by: ["tagId"],
      where: { gameId: { in: gameIds }, tagId: { not: tagId }, game: { isPublished: true } },
      _count: { tagId: true },
      orderBy: { _count: { tagId: "desc" } },
      take: limit,
    })
    const ids = grouped.map((g) => g.tagId)
    const tags = await prisma.tag.findMany({ where: { id: { in: ids }, source: "circleica" }, select: { id: true, name: true, slug: true, color: true } })
    const map = new Map(tags.map((t) => [t.id, t]))
    coTags = grouped
      .map((g) => { const t = map.get(g.tagId); return t ? { ...t, gameCount: g._count.tagId } : null })
      .filter((t): t is TagInfo => t !== null)
  }

  // 合并：同组优先，再补共现，去重截断
  const seen = new Set<string>()
  const result: TagInfo[] = []
  for (const t of [...sameGroup, ...coTags]) {
    if (seen.has(t.id)) continue
    seen.add(t.id)
    result.push(t)
    if (result.length >= limit) break
  }
  return result
}

/**
 * 获取字符的索引键（A-Z, 0-9, 其他）
 */
function getLetterKey(char: string): string {
  // 英文字母
  if (/[a-zA-Z]/.test(char)) {
    return char.toUpperCase()
  }
  // 数字
  if (/[0-9]/.test(char)) {
    return "0-9"
  }
  // 中文 - 简单处理：直接返回字符
  // 生产环境可使用 pinyin-match 库获取拼音首字母
  if (/[一-鿿]/.test(char)) {
    return char
  }
  // 其他字符
  return "#"
}