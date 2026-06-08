import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"

/**
 * 预设标签组定义
 * 首次访问时自动创建，确保任何部署都有这些标签组
 */
const PRESET_TAG_GROUPS = [
  {
    id: "preset_home_card",
    name: "首页卡片标签",
    description: "全站首页游戏卡片下方展示的标签，用于快速浏览游戏特征",
    color: "#60a5fa",
    positions: ["home_card", "search_filter"],
  },
  {
    id: "preset_detail_header",
    name: "详情页信息栏标签",
    description: "游戏详情页信息栏、相关游戏和资源卡片中展示的标签",
    color: "#f472b6",
    positions: ["detail_header", "detail_related", "resource_card"],
  },
  {
    id: "preset_discover",
    name: "发现页标签",
    description: "搜索筛选、标签云、排行榜等发现类页面中展示的标签",
    color: "#a78bfa",
    positions: ["search_filter", "tag_cloud", "ranking"],
  },
  {
    id: "preset_resource_tab",
    name: "资源标签",
    description: "游戏详情页资源tab区展示的标签，用于分类资源链接",
    color: "#22c55e",
    positions: ["resource_card"],
  },
]

let initPromise: Promise<void> | null = null

/**
 * 确保预设标签组存在
 * 使用 Promise 锁防止并发重复创建
 */
export async function ensurePresetTagGroups() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const existing = await prisma.tagGroup.findMany({
        where: { id: { in: PRESET_TAG_GROUPS.map((g) => g.id) } },
        select: { id: true },
      })
      const existingIds = new Set(existing.map((g) => g.id))
      const toCreate = PRESET_TAG_GROUPS.filter((g) => !existingIds.has(g.id))

      if (toCreate.length > 0) {
        await prisma.tagGroup.createMany({
          data: toCreate.map((g) => ({
            ...g,
            positions: JSON.stringify(g.positions),
            isPreset: true,
          })),
          skipDuplicates: true,
        })
        logger.db.info(`[preset-tag-groups] Created ${toCreate.length} preset tag groups`)
      }
    } catch (error) {
      logger.db.error("[preset-tag-groups] Failed:", error)
      initPromise = null // 失败时允许重试
    }
  })()

  return initPromise
}
