import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"

/**
 * 资源标签默认值
 * 首次访问时自动创建，确保任何部署都有这些标签选项
 */
const DEFAULT_RESOURCE_TAGS: Record<string, string[]> = {
  resource_platforms: ["Windows", "Android", "iOS", "MacOS", "Linux", "其他"],
  resource_languages: ["简体中文", "繁体中文", "日文", "英文", "韩文", "其他"],
  resource_run_types: ["电脑硬盘", "模拟器", "安卓直装", "苹果直装", "原版镜像", "其他"],
  resource_content_types: ["游戏本体", "补丁资源", "番外资源", "游戏存档", "其他"],
}

let initPromise: Promise<void> | null = null

/**
 * 确保资源标签存在
 * 使用 Promise 锁防止并发重复创建
 */
export async function ensureResourceTags() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const keys = Object.keys(DEFAULT_RESOURCE_TAGS)
      const existing = await prisma.siteSetting.findMany({
        where: { key: { in: keys } },
        select: { key: true },
      })
      const existingKeys = new Set(existing.map((s) => s.key))

      const toCreate = keys.filter((k) => !existingKeys.has(k))

      if (toCreate.length > 0) {
        await prisma.siteSetting.createMany({
          data: toCreate.map((key) => ({
            key,
            value: JSON.stringify(DEFAULT_RESOURCE_TAGS[key]),
          })),
          skipDuplicates: true,
        })
        logger.db.info(`[preset-resource-tags] Created ${toCreate.length} resource tag settings`)
      }
    } catch (error) {
      logger.db.error("[preset-resource-tags] Failed:", error)
      initPromise = null
    }
  })()

  return initPromise
}
