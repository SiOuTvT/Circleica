/**
 * 全量重算副站质量分（qualityScore/qualitySignal）。
 * 用法：BACKFILL_LIMIT=0 tsx scripts/recompute-quality.ts（断点续跑，幂等）
 * 断点：%TEMP%/circleica-recompute-quality-state.json
 */
import os from "node:os"
import path from "node:path"
import fs from "node:fs"
import { prisma } from "@/lib/prisma"
import { cache } from "@/lib/redis"
import { computeQualitySignal, computeQualityScore, type QualityInput } from "@/lib/galvelica/quality"

const STATE_FILE = path.join(os.tmpdir(), "circleica-recompute-quality-state.json")
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
    console.error("[recompute-quality] 断点写入失败:", e instanceof Error ? e.message : String(e))
  }
}

async function main() {
  const total = await prisma.work.count()
  console.log(`[recompute-quality] Work 总数 ${total}`)
  const state = loadState()
  const target = LIMIT > 0 ? Math.min(state.offset + LIMIT, total) : total
  if (state.offset >= target) {
    console.log(`[recompute-quality] 已全部重算（offset=${state.offset}）`)
    return
  }
  console.log(`[recompute-quality] 从 offset=${state.offset} 重算至 ${target}`)

  let ok = 0
  let fail = 0
  for (let offset = state.offset; offset < target; offset += BATCH) {
    const rows = await prisma.work.findMany({
      orderBy: { id: "asc" },
      skip: offset,
      take: BATCH,
      select: {
        id: true,
        coverImage: true,
        coverDims: true,
        screenshots: true,
        description: true,
        platforms: true,
        languages: true,
        duration: true,
        officialWebsite: true,
        originalLanguage: true,
        rating: true,
        viewCount: true,
        favoriteCount: true,
        contentFlags: true,
      },
    })
    for (const w of rows) {
      try {
        const input: QualityInput = {
          coverImage: w.coverImage,
          coverDims: w.coverDims as QualityInput["coverDims"],
          screenshots: w.screenshots,
          description: w.description,
          platforms: w.platforms,
          languages: w.languages,
          duration: w.duration,
          officialWebsite: w.officialWebsite,
          originalLanguage: w.originalLanguage,
          rating: w.rating,
          viewCount: w.viewCount,
          favoriteCount: w.favoriteCount,
          contentFlags: w.contentFlags,
        }
        const signal = computeQualitySignal(input)
        const score = computeQualityScore(input)
        await prisma.work.update({ where: { id: w.id }, data: { qualityScore: score, qualitySignal: signal as never } })
        ok++
      } catch (e) {
        fail++
        if (fail <= 5) console.error(`[recompute-quality] ${w.id} 失败:`, e instanceof Error ? e.message : String(e))
      }
    }
    saveState({ offset: offset + rows.length })
    console.log(`[recompute-quality] 进度 ${Math.min(offset + rows.length, target)}/${target}（成功 ${ok} / 失败 ${fail}）`)
  }

  // 质量分变化影响列表排序缓存 → 清副站缓存
  await cache.delByPrefix("circleica:galvelica:").catch(() => {})

  console.log(`[recompute-quality] 完成 ✅ 成功 ${ok} / 失败 ${fail}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[recompute-quality] 致命错误:", e.message)
    process.exit(1)
  })
