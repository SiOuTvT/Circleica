/**
 * Galvelica 广收录（核心功能）：从 VNDB 整批抓取「同人 VN」目录，建 Work + WorkSource{VNDB} 并融合。
 *
 * 设计要点：
 *   - 列表一次取一整页（rich fields），直接归一化，不逐条二次拉取 → VNDB 命令数≈页数而非作品数。
 *   - 幂等：同源同 externalId 的源复用已有 Work，重跑不重复建。
 *   - 限流：每页之间 sleep，避免触发 VNDB 速率限制（匿名约 100 命令/10 分钟）。
 *   - 断点续跑：已处理的页号存 .galvelica-ingest.json，中断后重跑从断点继续。
 *   - 同人硬过滤：默认按 VNDB 开发商关系类型 ng（同人社团）服务端筛选；这是「只收同人 VN」不变式在入库口的落地。
 *
 * 本脚本在能连 VNDB + DB 的本机运行（沙箱无库，跑不了）。
 *
 * 用法：
 *   npm run galvelica:ingest-vndb                                  # 全量同人（默认 ng+in+同人系公司白名单 服务端筛选）
 *   GALVELICA_INGEST_FILTER='["developer","=",["type","=","ng"]]' npm run ...  # 自定义整段 VNDB 过滤（JSON）
 *   GALVELICA_INGEST_LIMIT=200  npm run galvelica:ingest-vndb      # 调试：只抓前 N 个
 *   GALVELICA_INGEST_RESET=1    npm run galvelica:ingest-vndb      # 从头开始（清断点）
 */
import { setTimeout as sleep } from "node:timers/promises"
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import path from "node:path"
import { realPrisma as prisma } from "@/lib/prisma"
import { vndbClient } from "@/lib/vndb"
import { upsertWorkFromRaw, slugify, buildCrossSourceIndex } from "@/lib/galvelica/work-service"



// ── 配置（环境变量可覆盖） ──────────────────────
// 默认省空间：广收录是批量建库，融合完成后丢弃原始 JSON 缓存（省 70–80% 磁盘）。
// 若想保留 raw 以便离线重融合，请设 GALVELICA_KEEP_RAW=1。
if (!process.env.GALVELICA_KEEP_RAW) process.env.GALVELICA_KEEP_RAW = "0"
const PAGE_SIZE = Math.max(1, Number(process.env.GALVELICA_INGEST_BATCH || 25))
let DELAY_MS = Math.max(0, Number(process.env.GALVELICA_INGEST_DELAY_MS || 6000))
const HARD_LIMIT = process.env.GALVELICA_INGEST_LIMIT ? Number(process.env.GALVELICA_INGEST_LIMIT) : Infinity
const RESET = process.env.GALVELICA_INGEST_RESET === "1"

// 默认同人过滤（按用户定义「个人或小社团自主制作」）：
//   - ng  业余社团 / 同人サークル
//   - in  个人
//   - co  白名单：同人出身后转商业的知名社团（TYPE-MOON/âge/Nitroplus 等），其代表作属同人生态
// VNDB Kana API 正确写法：过滤字段是 developer（单数），嵌套 producer 子过滤。
// 注意：VNDB 无「是否同人」布尔字段，只能靠生产者类型 + co 白名单判定。
// co 白名单默认种子见 DOUJIN_ORIGIN_CO_IDS；可用 GALVELICA_DOUJIN_CO_IDS 环境变量追加（逗号分隔）。
// 若显式给了 GALVELICA_INGEST_FILTER 则用它（整段 VNDB filter JSON）覆盖默认。
const DOUJIN_ORIGIN_CO_IDS: string[] = (
  process.env.GALVELICA_DOUJIN_CO_IDS?.split(",").map((s) => s.trim()).filter(Boolean)
) ?? ["p6", "p4", "p42", "p27", "p240", "p336", "p143", "p1040", "p65", "p13"]

const DOUJIN_CO_BRANCHES = DOUJIN_ORIGIN_CO_IDS.map(
  (id) => ["developer", "=", ["id", "=", id]] as unknown[],
)
const DEFAULT_DOJIN_FILTER: unknown[] = [
  "or",
  ["developer", "=", ["type", "=", "ng"]],
  ["developer", "=", ["type", "=", "in"]],
  ...DOUJIN_CO_BRANCHES,
]
let FILTER: unknown[] = DEFAULT_DOJIN_FILTER
if (process.env.GALVELICA_INGEST_FILTER) {
  try {
    const parsed = JSON.parse(process.env.GALVELICA_INGEST_FILTER)
    FILTER = Array.isArray(parsed[0]) ? parsed : [parsed]
  } catch {
    console.error("[ingest] GALVELICA_INGEST_FILTER 不是合法 JSON，忽略，使用默认（ng+in+同人系公司白名单）")
    FILTER = DEFAULT_DOJIN_FILTER
  }
}

// 列表直接取融合所需全部字段，避免逐条二次拉取
// 方案B/阶段0：补 length/screenshots/platforms/languages/olang + rating/sexual 分级，让广收录源头上就拿到媒体/平台/语言/合规分级资料
const LIST_FIELDS =
  "id,title,alttitle,aliases,released,rating,image{url,sexual,violence,dims},description,tags.id,tags.name,tags.rating,developers.id,developers.name,developers.original,developers.type,staff.id,staff.name,staff.original,staff.role,length,screenshots{id,url,sexual,violence},platforms,languages,olang"

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
  let emptyStreak = 0

  console.log(
    `[ingest] 同人过滤=${JSON.stringify(FILTER)} 起始页=${page} 每页=${PAGE_SIZE} 限流=${DELAY_MS}ms` +
      (Number.isFinite(HARD_LIMIT) ? ` 上限=${HARD_LIMIT}` : ""),
  )

  // 构建跨源匹配索引：后续入库的新 VN 若与其他源已存在的 Work 表示同一作品，
  // 会挂到它上面而非新建重复 Work（跨源去重，防未来重跑再生重复）。
  await buildCrossSourceIndex()
  console.log(`[ingest] 跨源索引已构建，开始拉取…`)

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  while (true) {
    let results: any[] = []
    let more = false
    let attempt = 0
    let throttled = false
    while (attempt < 60) {
      try {
        const resp: any = await vndbClient.listVisualNovels({
          filters: FILTER ?? undefined,
          fields: LIST_FIELDS,
          page,
          results: PAGE_SIZE,
          sort: "id",
        })
        results = resp.results ?? []
        more = Boolean(resp.more)
        break
      } catch (e) {
        const msg = String((e as any)?.message ?? e)
        if (msg.includes("429") || msg.includes("Throttled")) {
          attempt++
          throttled = true
          const wait = Math.min(120000, 10000 * attempt)
          console.warn(`[ingest] VNDB 限流 429，退避 ${wait}ms 后重试 (${attempt})`)
          await sleep(wait)
          continue
        }
        throw e
      }
    }
    if (throttled) {
      // 一旦被限流，永久降速，避免反复触发
      DELAY_MS = Math.max(DELAY_MS, 4000)
    }

    if (results.length === 0) {
      if (page === 1) {
        console.warn(
          `[ingest] 首页无结果——VNDB 不可达或查询有误。` +
            ` 检查 GALVELICA_INGEST_FILTER，或确认网络可达 api.vndb.org。`,
        )
        break
      }
      // 空结果可能是 429 限流被 listVisualNovels 内部吞掉（返回 results:[]），
      // 不一定是真末尾。重试同页几次，确认连续空才判定末尾。
      emptyStreak++
      if (emptyStreak >= 20) {
        console.log(`[ingest] 连续 ${emptyStreak} 页空，判定目录已到末尾。`)
        break
      }
      console.warn(`[ingest] 第 ${page} 页空（疑似限流被吞），退避后重试同页 (${emptyStreak}/20)`)
      await sleep(Math.min(30000, 3000 * emptyStreak))
      continue
    }
    emptyStreak = 0

    for (const vn of results) {
      const id = String((vn.id as string) ?? "")
      if (!id) continue

      // 服务端已按「ng / in / 同人系公司白名单」筛选，这里作防御性二次校验：
      // 允许 业余社团(ng) / 个人(in) / 白名单内的同人出身公司(co)。
      const developers = (vn.developers as Array<Record<string, unknown>>) ?? []
      const hasPure = developers.some((d) => d.type === "ng" || d.type === "in")
      const isCoWhitelist = developers.some(
        (d) => d.type === "co" && DOUJIN_ORIGIN_CO_IDS.includes(String(d.id ?? "")),
      )
      const isDoujin = hasPure || isCoWhitelist
      if (!isDoujin) {
        continue
      }
      // 同人分类：含 ng/in 开发者 → 纯正同人；仅命中同人系公司白名单 → 同人衍生商业作
      const doujinCategory: "PURE" | "DERIVATIVE" = hasPure ? "PURE" : "DERIVATIVE"

      total++
      const slug = slugify((vn.title as string) || "") || id
      try {
        const workId = await upsertWorkFromRaw("VNDB", id, { results: [vn] }, { slug, doujinCategory })
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

    if (total >= HARD_LIMIT) break
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
