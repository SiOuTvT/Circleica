/**
 * Stage D 补充：把现有 Galvelica Work 关联到 Bangumi，触发多源融合。
 *
 * 背景：
 *   backfill 只生成 VNDB 源；融合引擎虽支持 BANGUMI，但必须有 WorkSource{BANGUMI} 行才会生效。
 *   本脚本为「尚无 BANGUMI 源」的 Work 用标题在 Bangumi 搜 galgame，取首个结果挂源并重新融合。
 *
 * 安全性（ADR §5 优先级表）：
 *   Bangumi 只「补充」标签 / 别名 / 简介(若 VNDB 为空) / 封面(若 VNDB 为空) / 原名(若 VNDB 为空)，
 *   title、发售日、社团、Staff 等核心字段仍以 VNDB 优先。即便个别匹配不准，也只多几个标签/别名，
 *   可由站长在后台锁定或清理，不会污染核心资料。
 *
 * 幂等：已有关联的 Work 跳过；可重复跑（仅补录缺失项）。
 * 前置：BANGUMI_ACCESS_TOKEN 已配置；已跑过 galvelica:backfill。
 * 用法：npx tsx scripts/enrich-bangumi.ts
 */
import { PrismaClient } from "@prisma/client"
import { bangumiAdapter } from "@/lib/galvelica/sources/bangumi"
import { attachSourceToWork } from "@/lib/galvelica/work-service"
import type { SourceKey } from "@/lib/galvelica/sources/types"

const prisma = new PrismaClient()
const BANGUMI: SourceKey = "BANGUMI"
const DELAY_MS = 350 // 礼貌限速，避免触发 Bangumi 频率限制

async function main() {
  if (!process.env.BANGUMI_ACCESS_TOKEN) {
    console.error("[enrich-bangumi] 未检测到 BANGUMI_ACCESS_TOKEN，请先在 .env 配置后再跑。")
    process.exit(1)
  }

  const total = await prisma.work.count()
  console.log(`[enrich-bangumi] Galvelica Work 共 ${total} 部，开始关联 Bangumi 源…`)

  const works = await prisma.work.findMany({
    select: { id: true, title: true, originalWork: true, sources: { select: { source: true } } },
  })

  let attached = 0
  let skipped = 0
  let unmatched = 0

  for (const w of works) {
    const hasBangumi = w.sources.some((s) => s.source === "BANGUMI")
    if (hasBangumi) {
      skipped++
      continue
    }
    const query = (w.title || w.originalWork || "").trim()
    if (!query) {
      skipped++
      continue
    }

    const results = await bangumiAdapter.search(query)
    const top = results[0]
    if (!top) {
      unmatched++
      continue
    }

    const ok = await attachSourceToWork(w.id, BANGUMI, top.externalId)
    if (ok) attached++
    else unmatched++
    if ((attached + unmatched) % 25 === 0) {
      console.log(`[enrich-bangumi] 进度 ${attached + unmatched}/${total}…`)
    }
    await new Promise((r) => setTimeout(r, DELAY_MS))
  }

  console.log(
    `[enrich-bangumi] 完成 ✅ 关联 ${attached}，跳过 ${skipped}（已关联/无标题），未匹配 ${unmatched}。`,
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("[enrich-bangumi] 失败：", e)
    await prisma.$disconnect()
    process.exit(1)
  })
