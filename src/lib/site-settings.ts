import { prisma } from "./prisma"

export interface SiteSettings {
  themeColor: string
}

const DEFAULT_SETTINGS: SiteSettings = {
  themeColor: "#38BDF8", // sky-400, the current default
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    // Use Announcement table with a special key, or just read from a simple approach
    // We'll use a dedicated approach: store in a SiteSetting table via raw query
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
    // Table might not exist yet, return defaults
    return DEFAULT_SETTINGS
  }
}

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
    // Table might not exist, try creating it
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "SiteSetting" (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
    await prisma.$executeRaw`
      INSERT INTO "SiteSetting" (key, value) 
      VALUES ('theme', ${JSON.stringify(updated)})
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(updated)}
    `
  }
  
  return updated
}