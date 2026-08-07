/**
 * 方案B 存量回填脚本：给「已有 VNDB 源但缺媒体/平台/语言字段」的副站 Work 重拉原始载荷并重融合。
 *
 * 背景：批量摄入的 LIST_FIELDS 此前不含 length/screenshots/platforms/languages/olang，
 * 存量 Work 的 raw 里没有这些字段 → 需要 refetchSource（重新拉取完整字段）再 fuseWork 落库。
 *
 * 特性：
 *  - 幂等可续跑：状态记在 `.galvelica-backfill-media.json`（offset），重跑从上次断点继续；
 *    且只处理「今天未融合过」的作品（避免对无截图的 VN 反复打 VNDB）。
 *  - 按 viewCount 降序处理（最热作品优先补齐资料）。
 *  - 限速：BACKFILL_DELAY_MS（默认 500ms，≈2 req/s，尊重 VNDB 限流）。
 *  - 限量：BACKFILL_LIMIT（0=不限；本机一次跑不完可分批续跑）。
 *
 * 用法（需 tsx，或 npx --yes tsx）：
 *   BACKFILL_LIMIT=300 BACKFILL_DELAY_MS=500 npm run galvelica:backfill-media
 */
import { promises as fs, readFileSync } from "node:fs"
import path from "node:path"
import os from "node:os"
import { prisma } from "@/lib/prisma"
import { cache } from "@/lib/redis"
import { refetchSource } from "@/lib/galvelica/work-service"

const LIMIT = parseInt(process.env.BACKFILL_LIMIT || "0", 10) || 0
const DELAY_MS = parseInt(process.env.BACKFILL_DELAY_MS || "500", 10) || 0
// 断点文件放系统临时目录：项目根的文件在沙箱/异常退出后可能被 Windows 句柄锁死（EPERM），
// TEMP 目录在安全删除白名单内，写入/替换不受影响。
const STATE_FILE = path.join(os.tmpdir(), "circleica-backfill-media-state.json")

interface State { offset: number }
function loadState(): State {
  try {
    const s = JSON.parse(readFileSync(STATE_FILE, "utf8"))
    return { offset: typeof s.offset === "number" ? s.offset : 0 }
  } catch { return { offset: 0 } }
}
async function saveState(s: State) {
  await fs.writeFile(STATE_FILE, JSON.stringify({ offset: s.offset, updatedAt: new Date().toISOString() }), "utf8")
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  // 候选：有 VNDB 源 + 缺新字段（截图/平台/语言任一为空）。
  // 注意：不要按"今天是否融合过"过滤候选 —— 候选列表必须稳定（viewCount desc, id asc），
  // 否则每次重跑列表会漂移，offset 续跑会永久跳过中间一批作品。
  // 断点（offset）已由状态文件保证不重复处理；重复运行同一批（幂等）代价仅为少量多余拉取。
  const rows = await prisma.$queryRaw<Array<{ id: string; viewCount: number }>>`
    SELECT w.id, w."viewCount" FROM "Work" w
    WHERE EXISTS (SELECT 1 FROM "WorkSource" ws WHERE ws."workId" = w.id AND ws.source = 'VNDB')
      AND (w.screenshots = '[]'::jsonb OR w.platforms = '[]'::jsonb OR w.languages = '[]'::jsonb)
    ORDER BY w."viewCount" DESC, w.id ASC
  `

  // 清掉 VNDB 融合原始载荷的 Redis 缓存：存量缓存是「旧字段版本」，不清理 refetch 会拿到旧数据白跑
  try {
    await cache.delByPrefix("circleica:vndb:vn_raw_fusion")
    console.log("[backfill-media] 已清 VNDB raw 融合缓存，强制全量重拉")
  } catch (e) {
    console.warn("[backfill-media] 清 VNDB 缓存失败（继续，可能命中旧缓存）", e instanceof Error ? e.message : String(e))
  }

  const state = loadState()
  const target = LIMIT > 0 ? rows.slice(state.offset, state.offset + LIMIT) : rows.slice(state.offset)
  if (target.length === 0) {
    console.log(`[backfill-media] 无可处理候选（offset=${state.offset} / 候选 ${rows.length}），已全部回填或全部今天处理过。`)
    return
  }

  console.log(`[backfill-media] 候选 ${rows.length}，从 offset=${state.offset} 续跑，本次处理 ${target.length}（延迟 ${DELAY_MS}ms）`)
  let ok = 0
  let fail = 0
  for (const w of target) {
    try {
      const did = await refetchSource(w.id, "VNDB")
      if (did) ok++
      else fail++
    } catch (e) {
      fail++
      console.error(`[backfill-media] ${w.id} 失败：${e instanceof Error ? e.message : String(e)}`)
    }
    state.offset++
    if ((ok + fail) % 20 === 0) await saveState(state) // 每 20 条存一次断点
    if (DELAY_MS > 0) await sleep(DELAY_MS)
  }
  await saveState(state)
  console.log(`[backfill-media] 完成 ✅ 成功 ${ok} / 失败 ${fail}；断点 offset=${state.offset}，重跑可继续。`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("[backfill-media] 致命错误：", e)
    await prisma.$disconnect()
    process.exit(1)
  })
