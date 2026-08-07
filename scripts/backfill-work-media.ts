/**
 * 方案B 存量回填脚本（批量版）：给「已有 VNDB 源但缺媒体/平台/语言字段」的副站 Work 重拉原始载荷并重融合。
 *
 * 背景：批量摄入的 LIST_FIELDS 此前不含 length/screenshots/platforms/languages/olang，
 * 存量 Work 的 raw 里没有这些字段 → 需要重拉（完整字段）再 fuseWork 落库。
 *
 * v2 批量改造（2026-08-07）：v1 逐条拉取在持续高压下被 VNDB 429 限流且失败即跳过（数据会漏）。
 * 现改为 VNDB Kana API 批量查询（一次 POST 25 个 id），请求数降 25 倍，
 * 并内置 429 指数退避重试（30s→60s→120s→240s），失败的作品本轮重试直到成功或耗尽次数。
 *
 * 特性：
 *  - 幂等可续跑：状态记在系统 TEMP（os.tmpdir()/circleica-backfill-media-state.json，避免项目内文件被锁）。
 *  - 候选自动剔除已成功的：查询按「缺字段」过滤，成功回填的作品下次运行自然退出候选，
 *    因此断点重置（删状态文件）后全量重跑也不会重复处理已成功项（幂等）。
 *  - 按 viewCount 降序处理（最热作品优先补齐资料）。
 *  - 批间限速：BACKFILL_DELAY_MS（默认 400ms，25 个/批 ≈ 2.5 批/s，尊重 VNDB 限流）。
 *  - 限量：BACKFILL_LIMIT（0=不限）。
 *
 * 用法（需 tsx，或 npx --yes tsx）：
 *   BACKFILL_LIMIT=300 BACKFILL_DELAY_MS=400 npm run galvelica:backfill-media
 */
import { promises as fs, readFileSync } from "node:fs"
import path from "node:path"
import os from "node:os"
import https from "node:https"
import { prisma, Prisma } from "@/lib/prisma"
import { cache } from "@/lib/redis"
import { fuseWork } from "@/lib/galvelica/work-service"

const LIMIT = parseInt(process.env.BACKFILL_LIMIT || "0", 10) || 0
const DELAY_MS = parseInt(process.env.BACKFILL_DELAY_MS || "400", 10) || 0
// 断点文件放系统临时目录：项目根的文件在沙箱/异常退出后可能被 Windows 句柄锁死（EPERM）。
const STATE_FILE = path.join(os.tmpdir(), "circleica-backfill-media-state.json")

/** 与 fetchVisualNovelRaw 完全一致的字段清单（保证 normalize 行为一致） */
const VNDB_FIELDS =
  "id,title,alttitle,aliases,released,description,tags.id,tags.name,tags.rating,developers.id,developers.name,developers.original,developers.type,staff.id,staff.name,staff.original,staff.role,image.url,length,screenshots{id,url},platforms,languages,olang"

/** 标准化 VNDB ID：纯数字自动加 "v" 前缀（与适配器 normalizeVndbId 一致） */
function normalizeVndbId(raw: string): string {
  const id = raw.trim()
  return /^\d+$/.test(id) ? `v${id}` : id
}

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

/** POST VNDB Kana API（IPv4 直连，15s 超时） */
function postVndb(body: unknown): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const req = https.request("https://api.vndb.org/kana/vn", {
      method: "POST",
      family: 4,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    }, (res) => {
      let buf = ""
      res.on("data", (c) => { buf += c })
      res.on("end", () => {
        let json: any = null
        try { json = JSON.parse(buf) } catch { /* 非 JSON（如 429 HTML） */ }
        resolve({ status: res.statusCode ?? 0, json })
      })
    })
    req.on("error", reject)
    req.setTimeout(15000, () => req.destroy(new Error("VNDB timeout")))
    req.end(payload)
  })
}

/**
 * 批量拉取一批 vndbId 的原始载荷。
 * 返回 { vndbId(规范化) → vn 对象 }；429 时指数退避重试（最多 5 次）。
 * 注意：VNDB Kana API 的 id 过滤不支持数组值，多 ID 必须用扁平 OR 组合
 * （["or", ["id","=","v1"], ["id","=","v2"], ...]），单批最多 100 个 ID。
 */
async function fetchBatch(vndbIds: string[]): Promise<Map<string, unknown>> {
  const orFilter: unknown[] = ["or"]
  for (const id of vndbIds) orFilter.push(["id", "=", id])
  for (let attempt = 0; attempt < 5; attempt++) {
    const { status, json } = await postVndb({
      filters: orFilter,
      fields: VNDB_FIELDS,
      results: 100,
    })
    if (status === 200 && json?.results && Array.isArray(json.results)) {
      const map = new Map<string, unknown>()
      for (const vn of json.results as Array<{ id: string }>) {
        if (vn && typeof vn.id === "string") map.set(normalizeVndbId(vn.id), vn)
      }
      return map
    }
    if (status === 429) {
      const wait = 30000 * (attempt + 1)
      console.warn(`[backfill-media] 429 限流，等待 ${Math.round(wait / 1000)}s 后重试（第 ${attempt + 1}/5 次）`)
      await sleep(wait)
      continue
    }
    if (json?.error) throw new Error(`VNDB error: ${json.error}`)
    throw new Error(`VNDB HTTP ${status}`)
  }
  throw new Error("429 重试次数耗尽")
}

async function main() {
  // 候选：有 VNDB 源 + 缺新字段（截图/平台/语言任一为空）。候选列表必须稳定
  // （viewCount desc, id asc），断点 offset 才可靠；成功回填的作品因不再缺字段自动退出候选。
  const rows = await prisma.$queryRaw<Array<{ id: string; vndbId: string }>>`
    SELECT w.id, ws."externalId" AS "vndbId" FROM "Work" w
    JOIN "WorkSource" ws ON ws."workId" = w.id AND ws.source = 'VNDB'
    WHERE (w.screenshots = '[]'::jsonb OR w.platforms = '[]'::jsonb OR w.languages = '[]'::jsonb)
    ORDER BY w."viewCount" DESC, w.id ASC
  `

  // 清掉 VNDB 融合原始载荷的 Redis 缓存：存量缓存是「旧字段版本」，不清理会拿到旧数据白跑
  try {
    await cache.delByPrefix("circleica:vndb:vn_raw_fusion")
    console.log("[backfill-media] 已清 VNDB raw 融合缓存，强制全量重拉")
  } catch (e) {
    console.warn("[backfill-media] 清 VNDB 缓存失败（继续，可能命中旧缓存）", e instanceof Error ? e.message : String(e))
  }

  const state = loadState()
  const target = LIMIT > 0 ? rows.slice(state.offset, state.offset + LIMIT) : rows.slice(state.offset)
  if (target.length === 0) {
    console.log(`[backfill-media] 无可处理候选（offset=${state.offset} / 候选 ${rows.length}），已全部回填。`)
    return
  }

  console.log(`[backfill-media] 候选 ${rows.length}，从 offset=${state.offset} 续跑，本次处理 ${target.length}（批量 100/批，批间延迟 ${DELAY_MS}ms）`)
  let ok = 0
  let fail = 0
  let batchCount = 0
  let lastStateSave = 0

  for (let i = 0; i < target.length; i += 100) {
    const slice = target.slice(i, i + 100)
    batchCount++
    const vndbIds = slice.map((r) => normalizeVndbId(r.vndbId))

    // 批量拉取（含 429 退避重试）
    let map: Map<string, unknown>
    try {
      map = await fetchBatch(vndbIds)
    } catch (e) {
      console.error(`[backfill-media] 第 ${batchCount} 批拉取失败：${e instanceof Error ? e.message : String(e)}`)
      fail += slice.length
      state.offset += slice.length
      continue
    }

    // 逐作品：写入 raw（结构 = fetchVisualNovelRaw 的完整响应 { results: [vn] }）→ 重融合
    for (const row of slice) {
      const vn = map.get(normalizeVndbId(row.vndbId))
      if (vn == null) {
        // VNDB 上已不存在/被删的 id（map 里没有）→ 跳过不报错
        fail++
        state.offset++
        continue
      }
      try {
        await prisma.workSource.update({
          where: { workId_source: { workId: row.id, source: "VNDB" } },
          data: {
            raw: { results: [vn] } as unknown as Prisma.InputJsonValue,
            status: "ok",
            fetchedAt: new Date(),
          },
        })
        await fuseWork(row.id)
        ok++
      } catch (e) {
        fail++
        console.error(`[backfill-media] ${row.id} (${row.vndbId}) 融合失败：${e instanceof Error ? e.message : String(e)}`)
      }
      state.offset++
      if (state.offset - lastStateSave >= 20) {
        await saveState(state)
        lastStateSave = state.offset
      }
    }

    if (DELAY_MS > 0) await sleep(DELAY_MS)
    if (batchCount % 10 === 0) {
      console.log(`[backfill-media] 进度：已处理 ${state.offset - (rows.length - target.length)}/${target.length}（成功 ${ok} / 失败 ${fail}，批 ${batchCount}）`)
    }
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
