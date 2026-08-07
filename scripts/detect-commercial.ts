/**
 * 全库商业作品判定（同人资料馆不变式：只收同人 VN）。
 *
 * VNDB producers/developers.type：ng=同人社团 / in=个人（同人） / co=商业公司。
 * 判定：
 *   - 任一 developer.type === 'co' → isCommercial=true（商业系列，副站排除）
 *   - 全部 ng/in → doujinCategory='PURE'（纯正同人）
 *   - 无法解析 → 保持现状（isCommercial=false, doujinCategory=null，待人工）
 *
 * 用法：tsx scripts/detect-commercial.ts（幂等，断点续跑）
 * 断点：%TEMP%/circleica-commercial-state.json
 */
import os from "node:os"
import path from "node:path"
import fs from "node:fs"
import { prisma } from "@/lib/prisma"
import { cache } from "@/lib/redis"

const STATE_FILE = path.join(os.tmpdir(), "circleica-commercial-state.json")
const LIMIT = parseInt(process.env.BACKFILL_LIMIT || "0", 10) || 0
const BATCH = 500

interface State { offset: number }
function loadState(): State {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"))
    return { offset: typeof s.offset === "number" ? s.offset : 0 }
  } catch { return { offset: 0 } }
}
function saveState(s: State) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ ...s, updatedAt: new Date().toISOString() }), "utf8")
  } catch (e) {
    console.error("[detect-commercial] 断点写入失败:", e instanceof Error ? e.message : String(e))
  }
}

/** 判定一个 VNDB vn 的同人属性 */
function judgeVn(vn: unknown): { isCommercial: boolean; category: "PURE" | "DERIVATIVE" | null } {
  const devs = (vn as { developers?: unknown[] })?.developers
  if (!Array.isArray(devs) || devs.length === 0) return { isCommercial: false, category: null }
  const types = devs.map((d) => String((d as { type?: unknown })?.type ?? ""))
  if (types.includes("co")) {
    // 商业公司开发 → 商业系列（排除）；有 ng/in 混排的也算商业（不赌）
    return { isCommercial: true, category: "DERIVATIVE" }
  }
  if (types.every((t) => t === "ng" || t === "in" || t === "")) {
    return { isCommercial: false, category: "PURE" }
  }
  return { isCommercial: false, category: null }
}

async function main() {
  const total = await prisma.work.count()
  console.log(`[detect-commercial] Work 总数 ${total}`)
  const state = loadState()
  const target = LIMIT > 0 ? Math.min(state.offset + LIMIT, total) : total
  if (state.offset >= target) {
    console.log(`[detect-commercial] 已全部扫描（offset=${state.offset}）`)
    return
  }
  console.log(`[detect-commercial] 从 offset=${state.offset} 扫描至 ${target}`)

  let commercial = 0
  let pure = 0
  let unknown = 0
  for (let offset = state.offset; offset < target; offset += BATCH) {
    const rows = await prisma.work.findMany({
      orderBy: { id: "asc" },
      skip: offset,
      take: BATCH,
      select: { id: true, sources: { select: { source: true, raw: true } } },
    })
    for (const w of rows) {
      const vndb = w.sources.find((s) => s.source === "VNDB")
      if (!vndb?.raw) { unknown++; continue }
      let vn: unknown
      try {
        const raw = JSON.parse(JSON.stringify(vndb.raw))
        vn = Array.isArray((raw as { results?: unknown[] }).results) ? (raw as { results: unknown[] }).results[0] : raw
      } catch { unknown++; continue }
      const j = judgeVn(vn)
      if (j.isCommercial) commercial++
      else if (j.category === "PURE") pure++
      else unknown++
      if (j.isCommercial || j.category === "PURE") {
        await prisma.work.update({ where: { id: w.id }, data: { isCommercial: j.isCommercial, doujinCategory: j.category } })
      }
    }
    saveState({ offset: offset + rows.length })
    console.log(`[detect-commercial] 进度 ${Math.min(offset + rows.length, target)}/${target}（商业 ${commercial} / 纯同人 ${pure} / 未知 ${unknown}）`)
  }

  await cache.delByPrefix("circleica:galvelica:").catch(() => {})
  console.log(`[detect-commercial] 完成 ✅ 商业 ${commercial} / 纯同人 ${pure} / 未知 ${unknown}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[detect-commercial] 致命错误:", e.message)
    process.exit(1)
  })
