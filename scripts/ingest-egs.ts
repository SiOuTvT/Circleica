/**
 * Galvelica 摄入 — ErogameScape（日本权威 galge 库）。
 *
 * ⚠️ 需服务器具备出口代理/可达性。
 * 默认不启用：ingest-entrypoint.sh 仅在 GALVELICA_ENABLE_EGS=1 时调用本脚本。
 *
 * 同人判定策略（EGS 无干净「同人」标记）：
 *   - 默认仅「补强已存在作品」：只把 EGS 源挂到已通过跨源匹配命中的现有 Work 上
 *     （通常是对应的 VNDB 作品），继承其 doujinCategory，不新建未匹配作品，避免污染 PURE。
 *   - 设 EGS_INGEST_ALL=1 时，也新建作品，统一按 DERIVATIVE 兜底（EGS 偏商业，保守不进 PURE）。
 */
import { setTimeout as sleep } from "node:timers/promises"
import { PrismaClient } from "@prisma/client"
import { erogesapeAdapter } from "@/lib/galvelica/sources/egs"
import { findCrossSourceMatch, upsertWorkFromRaw } from "@/lib/galvelica/work-service"

const prisma = new PrismaClient()
const ENABLED = process.env.GALVELICA_ENABLE_EGS === "1"
const INGEST_ALL = process.env.EGS_INGEST_ALL === "1"
const PER_PAGE = Math.max(1, Number(process.env.EGS_PER_PAGE || 100))
const DELAY_MS = Math.max(0, Number(process.env.EGS_DELAY_MS || 3000))

async function main() {
  if (!ENABLED) {
    console.log("[ingest-egs] 未启用（设 GALVELICA_ENABLE_EGS=1 开启；需服务器可达 erogesape.net）")
    return
  }
  console.log(`[ingest-egs] 开始：INGEST_ALL=${INGEST_ALL} 每页=${PER_PAGE} 限流=${DELAY_MS}ms`)

  let page = 1
  let total = 0
  let enriched = 0
  let created = 0
  let failed = 0

  while (true) {
    let games: any[] = []
    try {
      games = await erogesapeAdapter.listGames(page, PER_PAGE)
    } catch (e) {
      console.warn(
        `[ingest-egs] 第 ${page} 页拉取失败（EGS 不可达？需出口代理）：${e instanceof Error ? e.message : String(e)}`,
      )
      break
    }
    if (games.length === 0) {
      console.log(`[ingest-egs] 第 ${page} 页空，结束。`)
      break
    }

    for (const game of games) {
      const normalized = erogesapeAdapter.normalize(game)
      if (!normalized.title) continue
      const externalId = String(game.id ?? "")
      if (!externalId) continue
      total++

      // 默认仅补强已存在作品：先查跨源匹配，无匹配则跳过（不新建，避免污染 PURE）
      if (!INGEST_ALL) {
        const matchId = await findCrossSourceMatch("EROGESCAPE", normalized)
        if (!matchId) continue
      }

      try {
        const workId = await upsertWorkFromRaw("EROGESCAPE", externalId, game, {
          doujinCategory: "DERIVATIVE",
        })
        if (workId) {
          if (INGEST_ALL) created++
          else enriched++
        } else failed++
      } catch (e) {
        failed++
        console.warn(`[ingest-egs] 跳过 ${externalId}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    console.log(`[ingest-egs] 页 ${page}：累计 ${total}（补强 ${enriched} / 新建 ${created} / 失败 ${failed}）`)
    page++
    if (DELAY_MS > 0) await sleep(DELAY_MS)
  }

  console.log(`[ingest-egs] 结束：累计 ${total}，补强 ${enriched}，新建 ${created}，失败 ${failed}。`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error("[ingest-egs] 异常退出", e)
  await prisma.$disconnect()
  process.exit(1)
})
