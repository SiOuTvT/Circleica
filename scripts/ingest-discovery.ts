/**
 * Galvelica 发现层：在 Steam 商店检索「视觉小说 / 恋爱模拟 / 同人」类作品，
 * 校验 genre 后，把现有源（VNDB/Bangumi/Cngal）可能漏掉的新 VN 建为 Work（STEAM）。
 *
 * 设计要点：
 *   - 关键词表覆盖多语种（visual novel / dating sim / otome / renai / BL / 同人 / galge …）。
 *   - isVisualNovelApp 仅放行 genre 含 "Visual Novel" / "Dating Sim" 的应用。
 *   - 去重：若 WorkSource{STEAM, appid} 已存在则跳过（幂等）。
 *   - 发现层不自动建草稿（草稿仅由收录申请触发）；只把候选作品沉淀进 Galvelica 资料库。
 *   - 断点续跑（.galvelica-ingest-discovery.json）记录已处理的关键词游标。
 *
 * 本脚本在能连 Steam + DB 的本机运行（沙箱无库，跑不了）。
 *
 * 用法：
 *   npm run galvelica:ingest-discovery
 *   GALVELICA_DISCOVERY_TERMS="visual novel,dating sim" npm run galvelica:ingest-discovery
 *   GALVELICA_DISCOVERY_PER_TERM=120 npm run galvelica:ingest-discovery
 */
import { setTimeout as sleep } from "node:timers/promises"
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import path from "node:path"
import { PrismaClient, type WorkSourceType } from "@prisma/client"
import { upsertWorkFromRaw } from "@/lib/galvelica/work-service"
import {
  searchSteamGames,
  fetchSteamAppDetails,
  isVisualNovelApp,
} from "@/lib/galvelica/sources/steam"
import { gateAllowsSource } from "@/lib/galvelica/sources/doujin-gate"

const prisma = new PrismaClient()

const DEFAULT_TERMS = [
  "visual novel",
  "dating sim",
  "otome game",
  "renai",
  "galge",
  "BL game",
  "同人",
  "doujin",
  "nakige",
  "eroge",
  "kinetic novel",
  "adventure visual novel",
]
const TERMS_ENV = (process.env.GALVELICA_DISCOVERY_TERMS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
const TERMS = TERMS_ENV.length > 0 ? TERMS_ENV : DEFAULT_TERMS

const DELAY_MS = Math.max(0, Number(process.env.GALVELICA_DISCOVERY_DELAY_MS || 250))
const PER_TERM_LIMIT = Number(process.env.GALVELICA_DISCOVERY_PER_TERM || 80)
const RESET = process.env.GALVELICA_INGEST_RESET === "1"

const STATE_FILE = path.join(process.cwd(), ".galvelica-ingest-discovery.json")

function loadState(): { termIndex: number } {
  if (RESET) {
    if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE)
    return { termIndex: 0 }
  }
  if (existsSync(STATE_FILE)) {
    try {
      const s = JSON.parse(readFileSync(STATE_FILE, "utf8"))
      if (typeof s.termIndex === "number") return { termIndex: s.termIndex }
    } catch {
      /* ignore */
    }
  }
  return { termIndex: 0 }
}
function saveState(termIndex: number) {
  writeFileSync(STATE_FILE, JSON.stringify({ termIndex, updatedAt: new Date().toISOString() }))
}

async function main() {
  const [allowed, reason] = gateAllowsSource("STEAM")
  if (!allowed) {
    console.warn(`[ingest-discovery] Steam 被同人闸门拦截：${reason}`)
    console.warn(`[ingest-discovery] 发现层需要 STEAM 源；若你确认要跑发现层，请设 GALVELICA_DOUJIN_ONLY=0 后重跑。`)
    await prisma.$disconnect()
    return
  }

  const state = loadState()
  let termIndex = state.termIndex
  let created = 0
  let skipped = 0
  let failed = 0
  let total = 0

  console.log(`[ingest-discovery] 关键词 ${TERMS.length} 个，每词上限 ${PER_TERM_LIMIT}，限流 ${DELAY_MS}ms`)

  for (; termIndex < TERMS.length; termIndex++) {
    const term = TERMS[termIndex]
    console.log(`[ingest-discovery] 检索 "${term}" …`)
    const candidates = await searchSteamGames(term, PER_TERM_LIMIT)
    for (const c of candidates) {
      total++
      const appid = c.appid
      const existing = await prisma.workSource.findFirst({
        where: { source: "STEAM" as WorkSourceType, externalId: appid },
        select: { workId: true },
      })
      if (existing) {
        skipped++
        continue
      }
      const details = await fetchSteamAppDetails(appid)
      if (!isVisualNovelApp(details)) {
        skipped++
        continue
      }
      try {
        const workId = await upsertWorkFromRaw("STEAM", appid, details, {})
        if (workId) created++
        else failed++
      } catch (e) {
        failed++
        console.warn(`[ingest-discovery] 跳过 ${appid}: ${e instanceof Error ? e.message : String(e)}`)
      }
      if (DELAY_MS > 0) await sleep(DELAY_MS)
    }
    saveState(termIndex + 1)
    console.log(
      `[ingest-discovery] "${term}" 完成：累计 ${total}（新增 ${created} / 跳过 ${skipped} / 失败 ${failed}）`,
    )
  }

  console.log(`[ingest-discovery] 结束：累计 ${total}，新增 ${created}，跳过 ${skipped}，失败 ${failed}。`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error("[ingest-discovery] 异常退出", e)
  await prisma.$disconnect()
  process.exit(1)
})
