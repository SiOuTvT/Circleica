/**
 * 内容旗标检测（contentFlags）：从 VNDB 标签推导「真人实拍 / 写实3D」。
 *
 * 用户偏好：不喜欢真人 3D（画风精美的 3D 可接受）→ 只对最明确的信号打旗标，避免误伤：
 *   - LIVE_ACTION：tag 名含 "live action" / "真人"（真人实拍/真人拍摄，最明确）
 *   - REALISTIC_3D：预留（名单可配，默认空——"Real-time 3D" 技术标签不代表画风写实，不启用）
 *
 * 旗标效果：质量分 −20（见 quality.ts penalty）+ 前端「排除真人 3D」过滤开关。
 * 用法：tsx scripts/detect-content-flags.ts（全量幂等，断点续跑）
 * 断点：%TEMP%/circleica-detect-flags-state.json
 */
import os from "node:os"
import path from "node:path"
import fs from "node:fs"
import { prisma } from "@/lib/prisma"
import { cache } from "@/lib/redis"
import { computeQualitySignal, computeQualityScore, type QualityInput } from "@/lib/galvelica/quality"

const STATE_FILE = path.join(os.tmpdir(), "circleica-detect-flags-state.json")
const LIMIT = parseInt(process.env.BACKFILL_LIMIT || "0", 10) || 0
const BATCH = 500

// 匹配名单（tag.name 小写后 contains 匹配）
const FLAG_RULES: Record<string, string[]> = {
  LIVE_ACTION: ["live action", "live-action", "真人实拍", "真人拍摄"],
  REALISTIC_3D: [], // 预留：确认不误伤「精美 3D」后再启用
}

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
    console.error("[detect-flags] 断点写入失败:", e instanceof Error ? e.message : String(e))
  }
}

async function main() {
  const total = await prisma.work.count()
  console.log(`[detect-flags] Work 总数 ${total}`)
  const state = loadState()
  const target = LIMIT > 0 ? Math.min(state.offset + LIMIT, total) : total
  if (state.offset >= target) {
    console.log(`[detect-flags] 已全部扫描（offset=${state.offset}）`)
    return
  }
  console.log(`[detect-flags] 从 offset=${state.offset} 扫描至 ${target}`)

  let flagged = 0
  let fail = 0
  for (let offset = state.offset; offset < target; offset += BATCH) {
    const rows = await prisma.work.findMany({
      orderBy: { id: "asc" },
      skip: offset,
      take: BATCH,
      select: {
        id: true,
        contentFlags: true,
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
        tags: { select: { tag: { select: { name: true } } } },
      },
    })
    for (const w of rows) {
      try {
        const tagNames = w.tags.map((t) => t.tag.name.toLowerCase())
        const flags = new Set<string>(w.contentFlags ?? [])
        for (const [flag, rules] of Object.entries(FLAG_RULES)) {
          if (rules.some((r) => tagNames.some((n) => n.includes(r)))) {
            flags.add(flag)
          }
        }
        const next = Array.from(flags)
        if (JSON.stringify(next) !== JSON.stringify(w.contentFlags ?? [])) {
          // 旗标变化 → 顺手重算质量分（penalty −20 立即生效）
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
            contentFlags: next,
          }
          const signal = computeQualitySignal(input)
          const score = computeQualityScore(input)
          await prisma.work.update({ where: { id: w.id }, data: { contentFlags: next, qualityScore: score, qualitySignal: signal as never } })
          if (next.some((f) => f === "LIVE_ACTION")) flagged++
        }
      } catch (e) {
        fail++
        if (fail <= 5) console.error(`[detect-flags] ${w.id} 失败:`, e instanceof Error ? e.message : String(e))
      }
    }
    saveState({ offset: offset + rows.length })
    console.log(`[detect-flags] 进度 ${Math.min(offset + rows.length, target)}/${target}（新增真人旗标 ${flagged} / 失败 ${fail}）`)
  }

  // 旗标影响质量分 penalty + 列表过滤 → 清副站缓存
  await cache.delByPrefix("circleica:galvelica:").catch(() => {})

  console.log(`[detect-flags] 完成 ✅ 真人实拍旗标 ${flagged} 部 / 失败 ${fail}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[detect-flags] 致命错误:", e.message)
    process.exit(1)
  })
