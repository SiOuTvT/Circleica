// TEMP read-only: theme tags existence + rating field availability in raw
import { readFileSync } from "node:fs"
import { PrismaClient } from "@prisma/client"
const envText = readFileSync(new URL("../.env", import.meta.url), "utf8")
const m = /^DATABASE_URL\s*=\s*"([^"]+)"|^DATABASE_URL\s*=\s*'([^']+)'|^DATABASE_URL\s*=\s*(\S+)/m.exec(envText)
process.env.DATABASE_URL = m[1] || m[2] || m[3]
const prisma = new PrismaClient()
const out = {}
try {
  out.themeTags = await prisma.tag.findMany({
    where: { source: "galvelica", name: { in: ["恋爱", "多结局", "ADV", "暴力", "NSFW"] } },
    select: { name: true, source: true, _count: { select: { works: true } } },
  })
  out.galvelicaTagCount = await prisma.tag.count({ where: { source: "galvelica" } })
  out.popularTagsSample = await prisma.tag.findMany({
    where: { source: "galvelica", works: { some: {} } },
    select: { name: true, _count: { select: { works: true } } },
    orderBy: { works: { _count: "desc" } },
    take: 10,
  })
  // VNDB raw 是否含 "rating" 顶层字段（作品综合评分）？
  const sample = await prisma.workSource.findFirst({
    where: { source: "VNDB" },
    select: { raw: true },
  })
  const obj = sample?.raw?.results?.[0] ?? sample?.raw ?? {}
  out.vndbRawHasTopRating = Object.prototype.hasOwnProperty.call(obj, "rating")
  out.vndbRawTopKeys = Object.keys(obj).sort()
  // tags 里的 sexual 内容标签样例（可推导 NSFW）
  const t = await prisma.workSource.findFirst({
    where: { source: "VNDB" },
    select: { raw: true },
  })
  const tags = t?.raw?.results?.[0]?.tags ?? []
  out.sexualTagSample = tags.filter((x) => /sexual|nudity|adult|ecchi/i.test(x.name)).slice(0, 5)
} catch (e) {
  out.error = String(e)
} finally {
  await prisma.$disconnect()
}
console.log(JSON.stringify(out, null, 2))
