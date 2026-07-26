/**
 * Galvelica 广收录（核心功能）：从 VNDB 整批抓取「同人 VN」目录，建 Work + WorkSource{VNDB} 并融合。
 *
 * 设计要点：
 *   - 列表一次取一整页（rich fields），直接归一化，不逐条二次拉取 → VNDB 命令数≈页数而非作品数。
 *   - 幂等：同源同 externalId 的源复用已有 Work，重跑不重复建。
 *   - 限流：每页之间 sleep，避免触发 VNDB 速率限制（匿名约 100 命令/10 分钟）。
 *   - 断点续跑：已处理的页号存 .galvelica-ingest.json，中断后重跑从断点继续。
 *   - 同人硬过滤：默认按 VNDB 同人标签筛选；这是「只收同人 VN」不变式在入库口的落地。
 *
 * 本脚本在能连 VNDB + DB 的本机运行（沙箱无库，跑不了）。
 *
 * 用法：
 *   npm run galvelica:ingest-vndb                                  # 全量同人（默认同人标签分页抓）
 *   GALVELICA_DOJIN_TAG=6229   npm run galvelica:ingest-vndb       # 指定同人标签 ID
 *   GALVELICA_INGEST_FILTER='[["tag","=","6229"]]' npm run ...     # 自定义整段 VNDB 过滤（JSON）
 *   GALVELICA_INGEST_LIMIT=200  npm run galvelica:ingest-vndb      # 调试：只抓前 N 个
 *   GALVELICA_INGEST_RESET=1    npm run galvelica:ingest-vndb      # 从头开始（清断点）
 */
import { setTimeout as sleep } from "node:timers/promises"
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import path from "node:path"
import { PrismaClient } from "@prisma/client"
import { vndbClient } from "@/lib/vndb"
import { upsertWorkFromRaw, slugify } from "@/lib/galvelica/work-service"

const prisma = new PrismaClient()

// ── 配置（环境变量可覆盖） ──────────────────────
// 默认省空间：广收录是批量建库，融合完成后丢弃原始 JSON 缓存（省 70–80% 磁盘）。
// 若想保留 raw 以便离线重融合，请设 GALVELICA_KEEP_RAW=1。
if (!process.env.GALVELICA_KEEP_RAW) process.env.GALVELICA_KEEP_RAW = "0"
const DOJIN_TAG = process.env.GALVELICA_DOJIN_TAG || "6229"
const PAGE_SIZE = Math.max(1, Number(process.env.GALVELICA_INGEST_BATCH || 25))
const DELAY_MS = Math.max(0, Number(process.env.GALVELICA_INGEST_DELAY_MS || 6000))
const HARD_LIMIT = process.env.GALVELICA_INGEST_LIMIT ? Number(process.env.GALVELICA_INGEST_LIMIT) : Infinity
const RESET = process.env.GALVELICA_INGEST_RESET === "1"

// 默认同人过滤；若显式给了 GALVELICA_INGEST_FILTER 则用它（整段 VNDB filter JSON）
const DEFAULT_FILTER: unknown[] = [["tag", "=", DOJIN_TAG]]
let FILTER: unknown[]
if (process.env.GALVELICA_INGEST_FILTER) {
  try {
    FILTER = JSON.parse(process.env.GALVELICA_INGEST_FILTER)
  } catch {
    console.error("[ingest] GALVELICA_INGEST_FILTER 不是合法 JSON，回退默认同人过滤")
    FILTER = DEFAULT_FILTER
  }
} else {
  FILTER = DEFAULT_FILTER
}

// 列表直接取融合所需全部字段，避免逐条二次拉取
const LIST_FIELDS =
  "id,title,alttitle,aliases,released,description,tags.id,tags.name,tags.rating,developers.id,developers.name,developers.original,developers.type,staff.id,staff.name,staff.original,staff.role"

const STATE_FILE = path.join(process.cwd(), ".galvelica-ingest.json")

function loadState(): { page: number } {
  if (RESET) {
    if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE)
    return { page: 1 }
  }
  if (existsSync(STATE_FILE)) {
    try {
      const s = JSON.parse(readFileSync(STATE_FILE, "utf8"))
      if (typeof s.page === "number" && s.page >= 1) return { page: s.page }
    } catch {
      /* ignore corrupt state */
    }
  }
  return { page: 1 }
}
function saveState(page: number) {
  writeFileSync(STATE_FILE, JSON.stringify({ page, updatedAt: new Date().toISOString() }))
}

async function main() {
  const state = loadState()
  let page = state.page
  let created = 0
  let failed = 0
  let total = 0

  console.log(
    `[ingest] 同人过滤=${JSON.stringify(FILTER)} 起始页=${page} 每页=${PAGE_SIZE} 限流=${DELAY_MS}ms` +
      (Number.isFinite(HARD_LIMIT) ? ` 上限=${HARD_LIMIT}` : ""),
  )

  while (true) {
    const { results, more } = await vndbClient.listVisualNovels({
      filters: FILTER,
      fields: LIST_FIELDS,
      page,
      results: PAGE_SIZE,
      sort: "id",
    })

    if (results.length === 0) {
      if (page === state.page) {
        console.warn(
          `[ingest] 首页无结果——可能同人标签 ID(${DOJIN_TAG})不对、或 VNDB 不可达。` +
            ` 检查 GALVELICA_DOJIN_TAG / GALVELICA_INGEST_FILTER，或确认网络可达 api.vndb.org。`,
        )
      } else {
        console.log(`[ingest] 第 ${page} 页空，目录已到末尾。`)
      }
      break
    }

    for (const vn of results) {
      const id = String((vn.id as string) ?? "")
      if (!id) continue
      total++
      const slug = slugify((vn.title as string) || "") || id
      try {
        const workId = await upsertWorkFromRaw("VNDB", id, { results: [vn] }, { slug })
        if (workId) created++
        else failed++
      } catch (e) {
        failed++
        console.warn(`[ingest] 跳过 ${id}: ${e instanceof Error ? e.message : String(e)}`)
      }
      if (total >= HARD_LIMIT) break
    }

    saveState(page + 1)
    console.log(`[ingest] 页 ${page} 完成：累计 ${total}（新增 ${created} / 失败 ${failed}）`)

    if (!more || total >= HARD_LIMIT) break
    page++
    if (DELAY_MS > 0) await sleep(DELAY_MS)
  }

  console.log(`[ingest] 结束：累计处理 ${total}，新增 ${created}，失败 ${failed}。`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error("[ingest] 异常退出", e)
  await prisma.$disconnect()
  process.exit(1)
})
