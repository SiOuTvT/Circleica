/**
 * Galvelica 广收录：从「CnGal 资料站」整批抓取中文向同人/独立 galgame，建 Work + WorkSource{CNGL} 并融合。
 *
 * 接口：GET /api/entries/GetPublishGamesByTime?year&month 列出当月发售游戏 → 逐 id 拉 GetEntryView 取全量。
 * 严格同人闸门：CnGal 列入 DOUJIN_CURATED，默认即收录（无需 GALVELICA_DOUJIN_ONLY=0）。
 * 幂等 + 断点续跑（.galvelica-ingest-cngal.json）。
 *
 * 本脚本在能连 CnGal + DB 的本机运行（沙箱无库，跑不了）。
 *
 * 用法：
 *   npm run galvelica:ingest-cngal                                  # 全量（2005 起）
 *   GALVELICA_CNGL_START_YEAR=2015 npm run galvelica:ingest-cngal   # 只收 2015 年起
 *   GALVELICA_INGEST_LIMIT=300    npm run galvelica:ingest-cngal   # 调试：只处理前 N 部
 *   GALVELICA_INGEST_RESET=1      npm run galvelica:ingest-cngal   # 从头重跑
 */
import { setTimeout as sleep } from "node:timers/promises"
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import path from "node:path"
import { PrismaClient } from "@prisma/client"
import { upsertWorkFromRaw, slugify, buildCrossSourceIndex } from "@/lib/galvelica/work-service"
import { cngalAdapter, listCngalByMonth } from "@/lib/galvelica/sources/cngal"
import { gateAllowsSource } from "@/lib/galvelica/sources/doujin-gate"

const prisma = new PrismaClient()

const START_YEAR = Number(process.env.GALVELICA_CNGL_START_YEAR || 2005)
const END_YEAR = new Date().getFullYear()
const DELAY_MS = Math.max(0, Number(process.env.GALVELICA_CNGL_DELAY_MS || 300))
const HARD_LIMIT = process.env.GALVELICA_INGEST_LIMIT ? Number(process.env.GALVELICA_INGEST_LIMIT) : Infinity
const RESET = process.env.GALVELICA_INGEST_RESET === "1"

const STATE_FILE = path.join(process.cwd(), ".galvelica-ingest-cngal.json")

type State = { year: number; month: number }
function loadState(): State {
  if (RESET) {
    if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE)
    return { year: START_YEAR, month: 1 }
  }
  if (existsSync(STATE_FILE)) {
    try {
      const s = JSON.parse(readFileSync(STATE_FILE, "utf8"))
      if (typeof s.year === "number" && typeof s.month === "number") return { year: s.year, month: s.month }
    } catch {
      /* ignore */
    }
  }
  return { year: START_YEAR, month: 1 }
}
function saveState(year: number, month: number) {
  writeFileSync(STATE_FILE, JSON.stringify({ year, month, updatedAt: new Date().toISOString() }))
}

async function main() {
  const [allowed, reason] = gateAllowsSource("CNGL")
  if (!allowed) {
    console.warn(`[ingest-cngal] 被同人闸门拦截，跳过：${reason}`)
    await prisma.$disconnect()
    return
  }

  // 构建跨源匹配索引（含 VNDB 等已入库作品）：本批 CnGal 作品若与既有 Work 表示同一作，
  // 会挂到它上面而非新建重复 Work。
  await buildCrossSourceIndex()
  console.log(`[ingest-cngal] 跨源索引已构建，开始拉取…`)

  const state = loadState()
  let year = state.year
  let month = state.month
  let created = 0
  let failed = 0
  let total = 0
  let firstReachable = false

  console.log(`[ingest-cngal] 年份 ${year}→${END_YEAR} 限流 ${DELAY_MS}ms`)

  for (; year <= END_YEAR; year++) {
    month = year === state.year ? state.month : 1
    while (month <= 12) {
      const games = await listCngalByMonth(year, month)
      if (games === null) {
        if (total === 0 && !firstReachable) {
          console.warn(`[ingest-cngal] CnGal 不可达（网络/令牌/闸门），源跳过，不污染库。`)
          await prisma.$disconnect()
          return
        }
        month++
        continue
      }
      if (games.length === 0) {
        saveState(year, month + 1)
        month++
        continue
      }
      firstReachable = true

      for (const g of games) {
        const id = String(g.id ?? "")
        if (!id || !/^\d+$/.test(id)) continue
        total++
        const slug = slugify((g.name || "") as string) || id
        try {
          const detail = (await cngalAdapter.fetchByExternalId(id)) as Record<string, unknown> | null
          if (!detail) {
            failed++
            continue
          }
          // 列表项已含 publishTime；并回详情以保证 releaseDate 有值
          if (!detail.publishTime) detail.publishTime = g.publishTime ?? null
          const workId = await upsertWorkFromRaw("CNGL", id, detail, { slug })
          if (workId) created++
          else failed++
        } catch (e) {
          failed++
          console.warn(`[ingest-cngal] 跳过 ${id}: ${e instanceof Error ? e.message : String(e)}`)
        }
        if (total >= HARD_LIMIT) break
        if (DELAY_MS > 0) await sleep(DELAY_MS)
      }

      saveState(year, month + 1)
      console.log(
        `[ingest-cngal] ${year}-${String(month).padStart(2, "0")} 完成：累计 ${total}（新增 ${created} / 失败 ${failed}）`,
      )
      if (total >= HARD_LIMIT) break
      month++
    }
    if (total >= HARD_LIMIT) break
  }

  if (total === 0) {
    console.warn(`[ingest-cngal] 全程 0 部作品——CnGal 可能不可达或返回为空，已跳过。`)
  } else {
    console.log(`[ingest-cngal] 结束：累计处理 ${total}，新增 ${created}，失败 ${failed}。`)
  }
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error("[ingest-cngal] 异常退出", e)
  await prisma.$disconnect()
  process.exit(1)
})
