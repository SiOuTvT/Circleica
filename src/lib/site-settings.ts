import { prisma } from "@/lib/prisma"
import { CACHE_TTL } from "@/lib/config"
import { logger } from "@/lib/logger"
import { revalidateTag, unstable_cache } from "next/cache"
import { cache } from "react"

/**
 * 站点配置服务
 *
 * 缓存策略（三层）：
 * 1. React cache() — 同一请求内去重（零开销）
 * 2. unstable_cache — 跨请求 Data Cache（TTL 60s）
 * 3. Prisma — 最终数据源
 *
 * 写入时 revalidateTag 清除 Data Cache，
 * 下次请求 React cache 也会拿到新数据。
 */

// ── 单项读取 ────────────────────────

const _getCachedSetting = unstable_cache(
  async (key: string, fallback: string): Promise<string> => {
    try {
      const setting = await prisma.siteSetting.findUnique({ where: { key } })
      return setting?.value ?? fallback
    } catch (e) {
      logger.db.error(`SiteSetting 查询失败: ${key}`, e)
      return fallback
    }
  },
  ["site-setting"],
  { revalidate: CACHE_TTL.SITE_SETTING, tags: ["site-settings"] }
)

/**
 * 获取站点配置值（请求级去重 + Data Cache）
 */
export const getSiteSetting = cache(
  async (key: string, fallback = ""): Promise<string> => {
    return _getCachedSetting(key, fallback)
  }
)

/**
 * 首屏关键读取：绕过 unstable_cache，直接读 DB。
 * 仅用于 RootLayout 注入主题色（ThemeScript），保证「第一次绘制即正确主题」，
 * 杜绝 FOUC——旧 Data Cache / ISR 快照可能残留过期主题色（如先粉后薄荷的闪烁）。
 * 注意：不进 unstable_cache，故写库后无需等 TTL 即可在下次请求拿到新值。
 */
export async function getSiteSettingFresh(key: string, fallback = ""): Promise<string> {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key } })
    return setting?.value ?? fallback
  } catch (e) {
    logger.db.error(`SiteSetting 直接读取失败: ${key}`, e)
    return fallback
  }
}

// ── 全量读取 ────────────────────────

const _getCachedSettings = unstable_cache(
  async (): Promise<Record<string, string>> => {
    try {
      const settings = await prisma.siteSetting.findMany({
        select: { key: true, value: true },
      })
      return Object.fromEntries(settings.map(s => [s.key, s.value]))
    } catch (e) {
      logger.db.error("SiteSetting 全量查询失败", e)
      return {}
    }
  },
  ["all-site-settings"],
  { revalidate: CACHE_TTL.SITE_SETTINGS_ALL, tags: ["site-settings"] }
)

/**
 * 获取所有站点配置（请求级去重 + Data Cache）
 */
export const getSiteSettings = cache(async (): Promise<Record<string, string>> => {
  return _getCachedSettings()
})

// ── 写入 ────────────────────────────

/**
 * 批量更新站点配置，自动清除缓存
 */
export async function updateSiteSettings(data: Record<string, unknown>): Promise<Record<string, string>> {
  const entries = Object.entries(data).filter(([k]) => typeof k === "string")

  // 批量 upsert（事务内执行）
  // 防御：entries 为空时跳过事务——prisma.$transaction([]) 会抛错导致整次保存 500，
  // 例如 pages-manager 保存空值、settings 全字段被过滤时。
  if (entries.length > 0) {
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: { key },
          update: { value: String(value ?? "") },
          create: { key, value: String(value ?? "") },
        })
      )
    )
  }

  revalidateTag("site-settings")
  logger.cache.info("SiteSettings 缓存已清除", { keys: entries.map(([k]) => k).join(",") })

  return getSiteSettings()
}

// ── 初始化检测 ──────────────────────

const _isInitialized = unstable_cache(
  async (): Promise<boolean> => {
    try {
      const setting = await prisma.siteSetting.findUnique({
        where: { key: "initialized" },
        select: { value: true },
      })
      if (setting?.value === "true") return true
      const userCount = await prisma.user.count()
      return userCount > 0
    } catch {
      // 数据库不可用时（构建期、启动期）假定已初始化，避免 redirect 循环
      return true
    }
  },
  ["site-initialized"],
  { revalidate: CACHE_TTL.SITE_INITIALIZED, tags: ["site-settings"] }
)

export const isSiteInitialized = cache(async (): Promise<boolean> => {
  return _isInitialized()
})

// ── 便捷读取 ────────────────────────

export async function getDefaultPlaceholderImage(): Promise<string | null> {
  const url = await getSiteSetting("default_placeholder_image", "")
  return url || null
}

export async function getSiteName(): Promise<string> {
  return getSiteSetting("site_name", "Circleica")
}

export async function getSiteDescription(): Promise<string> {
  return getSiteSetting("site_description", "Circleica - 极客同人社区 | 完全免费开放的视觉小说档案库")
}

export async function getSiteLogo(): Promise<string | null> {
  const url = await getSiteSetting("site_logo", "")
  return url || null
}

export async function getThemeColor(): Promise<string> {
  return getSiteSetting("themeColor", "#5FA8A0")
}

// ── 公开配置（供 /api/site-settings 使用，不含敏感信息）──

const PUBLIC_SETTING_KEYS = [
  "site_name",
  "site_description",
  "site_logo",
  "default_placeholder_image",
  "registration_enabled",
  "themeColor",
  "page_about",
  "page_rules",
  "page_contact",
  "checkin_title",
  "checkin_subtitle",
  "checkin_image_url",
]

export async function getPublicSiteSettings(): Promise<Record<string, string>> {
  const all = await getSiteSettings()
  return Object.fromEntries(
    Object.entries(all).filter(([key]) => PUBLIC_SETTING_KEYS.includes(key))
  )
}
