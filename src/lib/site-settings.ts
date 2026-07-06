import { prisma } from "@/lib/prisma"
import { revalidateTag, unstable_cache } from "next/cache"

/**
 * 获取站点配置值（带缓存）
 * @param key 配置键名
 * @param fallback 默认值
 */
export const getSiteSetting = unstable_cache(
  async (key: string, fallback = ""): Promise<string> => {
    try {
      const setting = await prisma.siteSetting.findUnique({ where: { key } })
      return setting?.value ?? fallback
    } catch {
      return fallback
    }
  },
  ["site-setting"],
  { revalidate: 60, tags: ["site-settings"] }
)

/**
 * 获取默认占位图 URL，无自定义时返回 null
 */
export async function getDefaultPlaceholderImage(): Promise<string | null> {
  const url = await getSiteSetting("default_placeholder_image", "")
  return url || null
}

/**
 * 获取所有站点配置（返回 key→value 映射，带缓存）
 */
export const getSiteSettings = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const settings = await prisma.siteSetting.findMany({
      select: { key: true, value: true },
    })
    return Object.fromEntries(settings.map(s => [s.key, s.value]))
  },
  ["all-site-settings"],
  { revalidate: 60, tags: ["site-settings"] }
)

/**
 * 批量更新站点配置
 */
export async function updateSiteSettings(data: Record<string, unknown>): Promise<Record<string, string>> {
  const entries = Object.entries(data).filter(([k]) => typeof k === "string")
  for (const [key, value] of entries) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value: String(value ?? "") },
      create: { key, value: String(value ?? "") },
    })
  }
  revalidateTag("site-settings", "max")
  return getSiteSettings()
}

/**
 * 检测站点是否已完成初始化
 * 优先检查 initialized 标记，向后兼容检查用户表
 */
export const isSiteInitialized = unstable_cache(
  async (): Promise<boolean> => {
    try {
      const setting = await prisma.siteSetting.findUnique({
        where: { key: "initialized" },
        select: { value: true },
      })
      if (setting?.value === "true") return true
      // 向后兼容：已部署实例无 initialized 标记但已有用户
      const userCount = await prisma.user.count()
      return userCount > 0
    } catch {
      return false
    }
  },
  ["site-initialized"],
  { revalidate: 300, tags: ["site-settings"] }
)

/** 获取站点名称（带缓存） */
export async function getSiteName(): Promise<string> {
  return getSiteSetting("site_name", "Fangame")
}

/** 获取站点描述（带缓存） */
export async function getSiteDescription(): Promise<string> {
  return getSiteSetting("site_description", "Galgame/视觉小说社区平台")
}

/** 获取站点 Logo URL，未配置返回 null */
export async function getSiteLogo(): Promise<string | null> {
  const url = await getSiteSetting("site_logo", "")
  return url || null
}
