import { revalidateTag, unstable_cache } from "next/cache"
import { prisma } from "./prisma"

export interface SiteSettings {
  themeColor: string
  themeRadius: number       // 0-30px
  themeShadowIntensity: number // 0-100
  themeAlpha: number        // 0-100, transparency for bg tints
}

const DEFAULT_SETTINGS: SiteSettings = {
  themeColor: "#38BDF8",
  themeRadius: 12,
  themeShadowIntensity: 50,
  themeAlpha: 15,
}

export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    try {
      const result = await prisma.$queryRaw`SELECT * FROM "SiteSetting" WHERE key = 'theme' LIMIT 1` as { key: string, value: string }[]
      if (result.length > 0) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(result[0].value) }
        } catch {
          return DEFAULT_SETTINGS
        }
      }
      return DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  },
  ["site-settings"],
  { tags: ["site-settings"], revalidate: 3600 }
)

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = await getSiteSettings()
  const updated = { ...current, ...settings }
  
  try {
    await prisma.$executeRaw`
      INSERT INTO "SiteSetting" (key, value) 
      VALUES ('theme', ${JSON.stringify(updated)})
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(updated)}
    `
  } catch {
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "SiteSetting" (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
    await prisma.$executeRaw`
      INSERT INTO "SiteSetting" (key, value) 
      VALUES ('theme', ${JSON.stringify(updated)})
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(updated)}
    `
  }
  
  revalidateTag("site-settings", "soft")
  return updated
}
