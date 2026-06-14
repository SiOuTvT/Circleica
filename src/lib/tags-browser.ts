/**
 * 标签浏览页面数据获取工具
 * 带 Redis/内存缓存支持，缓存 5 分钟
 */

import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import type { TagBrowserData, TagInfo, TagGroupWithTags, TagWithGroup } from "@/types/tags-browser"

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
  const groups = await prisma.tagGroup.findMany({
    where: {
      // 只显示"发现页标签"组的标签（用于搜索筛选和标签云）
      positions: { contains: "discover" },
    },
    include: {
      tags: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  // 并行获取每个标签的游戏数量
  const tagGroups: TagGroupWithTags[] = await Promise.all(
    groups.map(async (group) => {
      const tags: TagInfo[] = await Promise.all(
        group.tags.map(async (tag) => {
          const gameCount = await prisma.gameTag.count({
            where: {
              tagId: tag.id,
              game: { isPublished: true },
            },
          })
          return {
            id: tag.id,
            name: tag.name,
            color: tag.color || group.color,
            gameCount,
          }
        })
      )

      return {
        id: group.id,
        name: group.name,
        color: group.color,
        description: group.description,
        tags: tags.filter(t => t.gameCount > 0), // 只显示有游戏的标签
      }
    })
  )

  return tagGroups.filter(g => g.tags.length > 0)
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
    select: { id: true, name: true, color: true },
  })

  const tagMap = new Map(tags.map(t => [t.id, t]))

  return tagStats
    .map(ts => {
      const tag = tagMap.get(ts.tagId)
      if (!tag) return null
      return {
        id: tag.id,
        name: tag.name,
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