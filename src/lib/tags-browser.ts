/**
 * 标签浏览页面数据获取工具
 * 带 Redis/内存缓存支持，缓存 5 分钟
 */

import { prisma } from "@/lib/prisma"
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
      color: group.color || tag.color || "#a78bfa",
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
    where: { id: { in: tagIds } },
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
async function getStats(): Promise<{ totalTags: number; totalGames: number }> {
  const [totalTags, totalGames] = await Promise.all([
    prisma.tag.count(),
    prisma.game.count({ where: { isPublished: true } }),
  ])

  return { totalTags, totalGames }
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
export async function getTagDetailBySlug(slug: string): Promise<TagDetail | null> {
  try {
    // ⚠️ 标签下游戏卡片（含封面）按 NSFW 模式过滤：SFW 用户不看到露骨封面
    const nsfwMode = await getMainNsfwMode()
    const nsfwWhere = nsfwMode === "sfw" ? { isNsfw: false } : nsfwMode === "nsfw" ? { isNsfw: true } : {}
    const tag = await prisma.tag.findFirst({
      where: { slug },
      include: { group: { select: { id: true, name: true, color: true } } },
    })
    if (!tag) return null

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
      orderBy: [{ game: { favoriteCount: "desc" } }],
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
    }
  } catch (error) {
    logger.db.error("[TagsBrowser] getTagDetailBySlug failed", error)
    return null
  }
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