/**
 * Galvelica 广收录：从「月幕 Galgame」整批抓取 galge 档案，建 Work + WorkSource{YMGAL} 并融合。
 *
 * 设计要点：
 *   - 月幕无「按 ID 枚举全库」接口，故按发售年份区间翻页列出（每年一页页拉）。
 *   - 严格同人闸门：月幕是 galge 广义源，默认 DOUJIN_ONLY=1 下被闸门跳过；
 *     需设 GALVELICA_DOUJIN_ONLY=0 才放开（见 sources/doujin-gate.ts）。
 *   - 稀疏跳过：某年空页直接跳过；首年首页即不可达 → 源不可用，优雅退出（不污染库）。
 *   - 幂等 + 断点续跑（.galvelica-ingest-ymgal.json）。
 *
 * 本脚本在能连月幕 + DB 的本机运行（沙箱无库，跑不了）。
 *
 * 用法：
 *   GALVELICA_DOUJIN_ONLY=0 npm run galvelica:ingest-ymgal        # 放开闸门后收录月幕
 *   GALVELICA_YMGAL_START_YEAR=2010 npm run galvelica:ingest-ymgal # 只收 2010 年起
 *   GALVELICA_INGEST_LIMIT=500    npm run galvelica:ingest-ymgal   # 调试：只处理前 N 部
 */
import { setTimeout as sleep } from "node:timers/promises"
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import path from "node:path"
import { PrismaClient } from "@prisma/client"
import { upsertWorkFromRaw, slugify } from "@/lib/galvelica/work-service"
import { listYmGalByDateRange } from "@/lib/galvelica/sources/ymgal"
import { gateAllowsSource } from "@/lib/galvelica/sources/doujin-gate"

const prisma = new PrismaClient()

const START_YEAR = Number(process.env.GALVELICA_YMGAL_START_YEAR || 1995)
const END_YEAR = new Date().getFullYear()
const PAGE_SIZE = Math.max(1, Number(process.env.GALVELICA_YMGAL_BATCH || 50))
const DELAY_MS = Math.max(0, Number(process.env.GALVELICA_YMGAL_DELAY_MS || 800))
const HARD_LIMIT = process.env.GALVELICA_INGEST_LIMIT ? Number(process.env.GALVELICA_INGEST_LIMIT) : Infinity
const RESET = process.env.GALVELICA_INGEST_RESET === "1"

const STATE_FILE = path.join(process.cwd(), ".galvelica-ingest-ymgal.json")

function loadState(): { year: number; page: number } {
  if (RESET) {
    if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE)
    return { year: START_YEAR, page: 1 }
  }
  if (existsSync(STATE_FILE)) {
    try {
      const s = JSON.parse(readFileSync(STATE_FILE, "utf8"))
      if (typeof s.year === "number" && typeof s.page === "number") return { year: s.year, page: s.page }
    } catch {
      /* ignore */
    }
  }
  return { year: START_YEAR, page: 1 }
}
function saveState(year: number, page: number) {
  writeFileSync(STATE_FILE, JSON.stringify({ year, page, updatedAt: new Date().toISOString() }))
}

async function main() {
  const [allowed, reason] = gateAllowsSource("YMGAL")
  if (!allowed) {
    console.warn(`[ingest-ymgal] 被同人闸门拦截，跳过：${reason}`)
    console.warn(`[ingest-ymgal] 若要收录月幕（galge 广义源），请设 GALVELICA_DOUJIN_ONLY=0 后重跑。`)
    await prisma.$disconnect()
    return
  }

  const state = loadState()
  let year = state.year
  let page = state.page
  let created = 0
  let failed = 0
  let total = 0
  let firstReachable = false

  console.log(`[ingest-ymgal] 年份 ${year}→${END_YEAR} 每页 ${PAGE_SIZE} 限流 ${DELAY_MS}ms`)

  for (; year <= END_YEAR; year++) {
    page = year === state.year ? state.page : 1
    let yearHasData = false
    while (true) {
      const games = await listYmGalByDateRange(
        `${year}-01-01`,
        `${year}-12-31`,
        page,
        PAGE_SIZE,
      )
      if (games === null) {
        if (total === 0 && !firstReachable) {
          console.warn(`[ingest-ymgal] 月幕不可达（网络/令牌/闸门），源跳过，不污染库。`)
          await prisma.$disconnect()
          return
        }
        break
      }
      if (games.length === 0) break
      firstReachable = true
      yearHasData = true

      for (const g of games) {
        const gid = String((g.gid ?? g.id ?? "") as string | number)
        if (!gid || !/^\d+$/.test(gid)) continue
        total++
        const slug = slugify((g.chineseName || g.name || "") as string) || gid
        try {
          const workId = await upsertWorkFromRaw("YMGAL", gid, g, { slug })
          if (workId) created++
          else failed++
        } catch (e) {
          failed++
          console.warn(`[ingest-ymgal] 跳过 ${gid}: ${e instanceof Error ? e.message : String(e)}`)
        }
        if (total >= HARD_LIMIT) break
      }

      saveState(year, page + 1)
      console.log(`[ingest-ymgal] ${year} 年 页 ${page} 完成：累计 ${total}（新增 ${created} / 失败 ${failed}）`)
      if (!games || games.length < PAGE_SIZE || total >= HARD_LIMIT) break
      page++
      if (DELAY_MS > 0) await sleep(DELAY_MS)
    }
    if (!yearHasData) console.log(`[ingest-ymgal] ${year} 年无数据，跳过`)
    if (total >= HARD_LIMIT) break
  }

  if (total === 0) {
    console.warn(`[ingest-ymgal] 全程 0 部作品——月幕可能不可达或返回为空，已跳过（不污染库）。`)
  } else {
    console.log(`[ingest-ymgal] 结束：累计处理 ${total}，新增 ${created}，失败 ${failed}。`)
  }
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error("[ingest-ymgal] 异常退出", e)
  await prisma.$disconnect()
  process.exit(1)
})
