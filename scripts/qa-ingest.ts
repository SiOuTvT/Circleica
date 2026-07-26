/**
 * Galvelica 收录质量只读诊断（QA）。
 *
 * 只做 SELECT，绝不写入/修改任何数据。用于核查 ingest 结果的数据质量。
 * 在本机能连 DB 的机器运行（沙箱无库，跑不了）。
 *
 * 用法：
 *   npx tsx scripts/qa-ingest.ts
 *   DATABASE_URL=... npx tsx scripts/qa-ingest.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function pct(n: number, d: number): string {
  if (d === 0) return "0.0%"
  return ((n / d) * 100).toFixed(1) + "%"
}

function flag(value: number, warnBelow: number, badBelow: number): string {
  if (value < badBelow) return "  ❌ BAD"
  if (value < warnBelow) return "  ⚠️ WARN"
  return "  ✅ OK"
}

async function main() {
  console.log("══════════════════════════════════════════════")
  console.log("  Galvelica 收录质量诊断（只读）")
  console.log("══════════════════════════════════════════════\n")

  const totalWorks = await prisma.work.count()
  console.log(`【总览】融合后 Work 总数：${totalWorks}`)

  // ── 1. 各源数量 ──
  console.log("\n── 1. 各源 WorkSource 分布 ──")
  const bySource = await prisma.workSource.groupBy({ by: ["source"], _count: true })
  bySource.sort((a, b) => b._count - a._count)
  for (const s of bySource) {
    console.log(`  ${s.source.padEnd(10)} ${s._count}  (${pct(s._count, totalWorks)})`)
  }
  const totalSources = bySource.reduce((a, s) => a + s._count, 0)
  console.log(`  合计 WorkSource 记录：${totalSources}（多源融合的作品会有 >1 条）`)

  // ── 2. 字段完整度（融合后的有效展示值）──
  console.log("\n── 2. 融合字段完整度（占 Work 总数）──")
  const [
    titleFilled, originalFilled, englishFilled, aliasesFilled,
    descFilled, coverFilled, relDateFilled, studioFilled, urlFilled, steamFilled,
  ] = await Promise.all([
    prisma.work.count({ where: { title: { not: "" } } }),
    prisma.work.count({ where: { originalWork: { not: "" } } }),
    prisma.work.count({ where: { englishName: { not: "" } } }),
    prisma.work.count({ where: { aliases: { not: "" } } }),
    prisma.work.count({ where: { description: { not: "" } } }),
    prisma.work.count({ where: { coverImage: { not: "" } } }),
    prisma.work.count({ where: { releaseDate: { not: null } } }),
    prisma.work.count({ where: { studioName: { not: "" } } }),
    prisma.work.count({ where: { officialUrl: { not: "" } } }),
    prisma.work.count({ where: { steamAppId: { not: "" } } }),
  ])
  const rows: Array<[string, number, number, number]> = [
    ["title(标题)", titleFilled, 100, 99],
    ["originalWork(原名)", originalFilled, 40, 20],
    ["englishName(英文)", englishFilled, 40, 20],
    ["aliases(别名)", aliasesFilled, 40, 20],
    ["description(简介)", descFilled, 50, 30],
    ["coverImage(封面)", coverFilled, 60, 40],
    ["releaseDate(发售日)", relDateFilled, 80, 60],
    ["studioName(工作室)", studioFilled, 50, 30],
    ["officialUrl(官网)", urlFilled, 10, 5],
    ["steamAppId(Steam)", steamFilled, 5, 1],
  ]
  for (const [label, n, warn, bad] of rows) {
    console.log(`  ${label.padEnd(22)} ${pct(n, totalWorks).padStart(7)}  (${n})${flag(n, warn * totalWorks / 100, bad * totalWorks / 100)}`)
  }

  // ── 3. 孤儿 Work（无来源）──
  console.log("\n── 3. 孤儿 / 异常 ──")
  const orphans = await prisma.work.count({ where: { sources: { none: {} } } })
  console.log(`  无 WorkSource 的孤儿 Work：${orphans}${orphans === 0 ? "  ✅ OK" : "  ❌ BAD（不该出现）"}`)
  const badStatus = await prisma.workSource.count({ where: { status: { not: "ok" } } })
  console.log(`  WorkSource 状态异常(stale/error)：${badStatus}${badStatus === 0 ? "  ✅ OK" : "  ⚠️ WARN"}`)
  const emptyTitle = await prisma.work.count({ where: { title: "" } })
  console.log(`  title 为空的 Work：${emptyTitle}${emptyTitle === 0 ? "  ✅ OK" : "  ❌ BAD"}`)

  // ── 4. 疑似重复（同标题+同发售日）──
  console.log("\n── 4. 疑似重复（同 title + 同 releaseDate，融合未合并）──")
  const withDate = await prisma.work.findMany({
    where: { releaseDate: { not: null } },
    select: { title: true, releaseDate: true },
  })
  const seen = new Map<string, number>()
  for (const w of withDate) {
    const key = (w.title || "").trim().toLowerCase() + "||" + (w.releaseDate?.toISOString().slice(0, 10) ?? "")
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  let dupGroups = 0
  let dupExtra = 0
  for (const c of seen.values()) {
    if (c > 1) { dupGroups++; dupExtra += c - 1 }
  }
  console.log(`  疑似重复组：${dupGroups}（多出 ${dupExtra} 条）${dupGroups === 0 ? "  ✅ OK" : dupGroups < 50 ? "  ⚠️ WARN（少量，可接受）" : "  ❌ BAD（融合可能漏合）"}`)

  // ── 5. 发售日分布（异常年份检测）──
  console.log("\n── 5. 发售日年份分布（异常检测）──")
  const buckets = new Map<number, number>()
  let future = 0
  const nowYear = new Date().getFullYear()
  for (const w of withDate) {
    const y = w.releaseDate!.getFullYear()
    if (y > nowYear) future++
    buckets.set(y, (buckets.get(y) ?? 0) + 1)
  }
  const years = [...buckets.keys()].sort((a, b) => a - b)
  console.log(`  年份范围：${years[0]} – ${years[years.length - 1]}（覆盖 ${years.length} 年）`)
  console.log(`  未来年份(> ${nowYear})：${future}${future === 0 ? "  ✅ OK" : "  ⚠️ WARN"}`)
  // 打印每十年分布（压缩输出）
  const decade = new Map<number, number>()
  for (const [y, c] of buckets) decade.set(Math.floor(y / 10) * 10, (decade.get(Math.floor(y / 10) * 10) ?? 0) + c)
  for (const d of [...decade.keys()].sort((a, b) => a - b)) {
    console.log(`  ${d}s: ${decade.get(d)}`)
  }

  console.log("\n══════════════════════════════════════════════")
  console.log("  诊断完成（只读，未修改任何数据）")
  console.log("══════════════════════════════════════════════")
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error("诊断异常", e)
  await prisma.$disconnect()
  process.exit(1)
})
