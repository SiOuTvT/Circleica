// TEMP read-only investigation (SELECT only). Safe to delete.
import { readFileSync } from "node:fs"
import { PrismaClient } from "@prisma/client"

// load DATABASE_URL from .env manually (prisma client does not auto-load .env)
const envText = readFileSync(new URL("../.env", import.meta.url), "utf8")
const m = /^DATABASE_URL\s*=\s*"([^"]+)"|^DATABASE_URL\s*=\s*'([^']+)'|^DATABASE_URL\s*=\s*(\S+)/m.exec(envText)
if (!m) throw new Error("DATABASE_URL not found in .env")
process.env.DATABASE_URL = m[1] || m[2] || m[3]

const prisma = new PrismaClient()
const out = {}
try {
  out.workCount = await prisma.work.count()
  out.nsfwDistribution = await prisma.work.groupBy({ by: ["isNsfw"], _count: true })
  out.doujinCategory = await prisma.work.groupBy({ by: ["doujinCategory"], _count: true })

  // 来源分布
  out.sourceDistribution = await prisma.workSource.groupBy({ by: ["source"], _count: true })

  // 多源 Work 数量（workId 出现次数 > 1）
  const multiRaw = await prisma.$queryRawUnsafe(
    `SELECT "workId", COUNT(*)::int AS cnt FROM "WorkSource" GROUP BY "workId" HAVING COUNT(*) > 1 ORDER BY cnt DESC LIMIT 30`,
  )
  out.multiSourceWorkCount = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS cnt FROM (SELECT "workId" FROM "WorkSource" GROUP BY "workId" HAVING COUNT(*) > 1) t`,
  )
  out.multiSourceSamples = multiRaw

  // 评分/浏览/收藏覆盖
  out.ratingCoverage = await prisma.$queryRawUnsafe(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE "ratingAvg" IS NOT NULL)::int AS with_rating,
       COUNT(*) FILTER (WHERE "ratingCount" > 0)::int AS with_rating_count,
       COUNT(*) FILTER (WHERE "viewCount" > 0)::int AS with_views,
       COUNT(*) FILTER (WHERE "favoriteCount" > 0)::int AS with_favs,
       COUNT(*) FILTER (WHERE "coverImage" = '')::int AS no_cover,
       COUNT(*) FILTER (WHERE "screenshots" = '[]'::jsonb OR "screenshots" IS NULL)::int AS no_screenshots
     FROM "Work"`,
  )

  // 样例 raw：VNDB 源的 raw 顶层字段 + 是否含 sexual/violence
  const vndbSamples = await prisma.workSource.findMany({
    where: { source: "VNDB" },
    select: { externalId: true, raw: true },
    take: 3,
  })
  out.vndbRawSampleKeys = vndbSamples.map((s) => {
    const raw = s.raw
    const obj = typeof raw === "object" && raw !== null ? raw : {}
    const results = obj.results?.[0] ?? obj
    const keys = Object.keys(results ?? {}).sort()
    return {
      externalId: s.externalId,
      topKeys: keys,
      image: results?.image,
      screenshots: Array.isArray(results?.screenshots) ? results.screenshots.slice(0, 2) : results?.screenshots,
      hasSexual: /sexual/i.test(JSON.stringify(raw)),
      hasViolence: /violence/i.test(JSON.stringify(raw)),
    }
  })

  // 其它源样例 raw 顶层
  const otherSamples = await prisma.workSource.findMany({
    where: { source: { in: ["STEAM", "EROGESCAPE", "DLSITE", "GETCHU", "FUWANOVEL", "BOOTH", "MANUAL", "BANGUMI", "CNGL", "YMGAL"] } },
    select: { source: true, externalId: true, raw: true },
    take: 50,
  })
  const bySource = {}
  for (const s of otherSamples) {
    if (!bySource[s.source]) bySource[s.source] = { count: 0, sampleExternalIds: [], rawType: null, rawKeys: [] }
    bySource[s.source].count++
    if (bySource[s.source].sampleExternalIds.length < 3) bySource[s.source].sampleExternalIds.push(s.externalId)
    if (!bySource[s.source].rawType) {
      const raw = s.raw
      if (typeof raw === "string") {
        bySource[s.source].rawType = "string(html)"
        bySource[s.source].rawKeys = raw.slice(0, 80)
      } else if (typeof raw === "object" && raw !== null) {
        bySource[s.source].rawType = "object"
        bySource[s.source].rawKeys = Object.keys(raw).slice(0, 20)
      } else {
        bySource[s.source].rawType = String(typeof raw) + (raw == null ? ":" + raw : "")
      }
    }
  }
  out.otherSources = bySource

  // 多源样例的源组合
  if (Array.isArray(multiRaw) && multiRaw.length) {
    const ids = multiRaw.slice(0, 10).map((r) => r.workId)
    out.multiSourceCombos = await prisma.workSource.findMany({
      where: { workId: { in: ids } },
      select: { workId: true, source: true, externalId: true },
      orderBy: { workId: "asc" },
    })
  }

  // 列表排序字段现状：favoriteCount>0 的条数（quality 排序可行性）
  out.sortFieldCoverage = await prisma.$queryRawUnsafe(
    `SELECT
       COUNT(*) FILTER (WHERE "favoriteCount" > 0)::int AS popular_has_favs,
       COUNT(*) FILTER (WHERE "viewCount" > 0)::int AS views_gt0,
       COUNT(*) FILTER (WHERE "ratingAvg" IS NOT NULL)::int AS rating_avg_notnull
     FROM "Work"`,
  )

  // 编辑精选相关：curatedCollection 名
  out.galCollections = await prisma.curatedCollection.findMany({
    where: { name: { contains: "Galvelica", mode: "insensitive" } },
    select: { id: true, name: true, published: true },
  })
} catch (e) {
  out.error = String(e)
} finally {
  await prisma.$disconnect()
}
console.log(JSON.stringify(out, null, 2))
