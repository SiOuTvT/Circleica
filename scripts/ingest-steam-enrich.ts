/**
 * Steam 批量挂源（阶段3）：给已有 VNDB 源的 Work 挂 Steam 官方商店链接 + 竖版封面。
 *
 * 匹配策略（Steam 专用，放宽）：
 *   - storesearch 按 title 搜 → 前 10 候选
 *   - normalizeMatchKey 归一化后「唯一精确命中」→ 挂源；否则跳过（不猜）
 *   - 排除明显非本体：type!==game / 名含 soundtrack|ost|dlc|original soundtrack|demo|beta
 *   - 竖版封面取 capsule_imagev5（600x900），回退 header_image
 *   - 挂源 = 直接建 WorkSource(STEAM, appid, raw) + fuseWork（融合覆盖 title/封面/简介/发售日）
 *
 * 用法：DRY_RUN=1 BACKFILL_LIMIT=200 tsx scripts/ingest-steam-enrich.ts（先评估命中率）
 *       BACKFILL_LIMIT=0 tsx scripts/ingest-steam-enrich.ts（全量）
 * 断点：%TEMP%/circleica-steam-enrich-state.json
 */
import os from "node:os"
import path from "node:path"
import fs from "node:fs"
import { prisma } from "@/lib/prisma"
import { cache } from "@/lib/redis"
import { fuseWork } from "@/lib/galvelica/work-service"
import { normalizeMatchKey } from "@/lib/galvelica/work-service"

const STATE_FILE = path.join(os.tmpdir(), "circleica-steam-enrich-state.json")
const LIMIT = parseInt(process.env.BACKFILL_LIMIT || "0", 10) || 0
const DRY_RUN = process.env.DRY_RUN === "1"
const DELAY_MS = parseInt(process.env.BACKFILL_DELAY_MS || "600", 10) || 0
const STEAM_STORE = "https://store.steampowered.com/api"
const UA = "Circleica-Galvelica-Ingest/1.0 (+https://circleica.example)"

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
    console.error("[steam-enrich] 断点写入失败:", e instanceof Error ? e.message : String(e))
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function steamFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function searchSteam(term: string): Promise<{ appid: string; name: string }[]> {
  const res = await steamFetch<{ items?: { id?: number; name?: string }[] }>(
    `${STEAM_STORE}/storesearch/?term=${encodeURIComponent(term)}&cc=us&l=en`,
  )
  return (res?.items ?? [])
    .filter((it) => it.id != null)
    .slice(0, 10)
    .map((it) => ({ appid: String(it.id), name: (it.name || "").trim() }))
}

const EXCLUDE_RE = /soundtrack|\bost\b|\bdlc\b|original\s*soundtrack|\bdemo\b|\bbeta\b|deluxe|collector's\s*edition|remaster|sound\s*collection/i

interface SteamAppDetails {
  type?: string
  name?: string
  steam_appid?: number
  short_description?: string
  header_image?: string
  capsule_imagev5?: string
  release_date?: { date?: string }
  genres?: { description?: string }[]
}

async function fetchDetails(appid: string): Promise<SteamAppDetails | null> {
  const data = await steamFetch<Record<string, { success?: boolean; data?: SteamAppDetails }>>(
    `${STEAM_STORE}/appdetails?appids=${appid}`,
  )
  const entry = data?.[appid]
  if (!entry || entry.success !== true || !entry.data) return null
  return entry.data
}

async function main() {
  console.log(`[steam-enrich] ${DRY_RUN ? "DRY-RUN 模式（只统计命中率，不写库）" : "正式挂源模式"}`)

  // 候选：有 VNDB 源 + 无 STEAM 源 + 标题非空 + 有封面（好作品优先）
  const rows = await prisma.$queryRaw<Array<{ id: string; title: string; englishName: string }>>`
    SELECT w.id, w.title, w."englishName" FROM "Work" w
    WHERE w.title <> ''
      AND w."coverImage" <> ''
      AND EXISTS (SELECT 1 FROM "WorkSource" ws WHERE ws."workId" = w.id AND ws.source = 'VNDB')
      AND NOT EXISTS (SELECT 1 FROM "WorkSource" ws2 WHERE ws2."workId" = w.id AND ws2.source = 'STEAM')
    ORDER BY w."qualityScore" DESC, w.id ASC
  `
  console.log(`[steam-enrich] 候选 ${rows.length}（无 Steam 源的作品）`)

  const state = loadState()
  const target = LIMIT > 0 ? rows.slice(state.offset, state.offset + LIMIT) : rows.slice(state.offset)
  if (target.length === 0) {
    console.log(`[steam-enrich] 无可处理候选（offset=${state.offset}）`)
    return
  }
  console.log(`[steam-enrich] 从 offset=${state.offset} 续跑，本次处理 ${target.length}`)

  const startOffset = state.offset
  let hit = 0
  let miss = 0
  let fail = 0

  for (let i = 0; i < target.length; i++) {
    const row = target[i]
    const term = row.englishName || row.title
    try {
      const candidates = await searchSteam(term)
      // 归一化精确匹配：唯一命中才算
      const key = normalizeMatchKey(term)
      const exact = candidates.filter((c) => c.name && normalizeMatchKey(c.name) === key && !EXCLUDE_RE.test(c.name))
      if (exact.length === 1) {
        const details = await fetchDetails(exact[0].appid)
        if (details && (details.type || "").toLowerCase() === "game" && !EXCLUDE_RE.test(details.name || "")) {
          if (!DRY_RUN) {
            // 挂源：直接建 WorkSource + 融合（竖版封面优先）
            await prisma.workSource.create({
              data: {
                workId: row.id,
                source: "STEAM",
                externalId: exact[0].appid,
                raw: details as never,
              },
            })
            await fuseWork(row.id)
          }
          hit++
          if (!DRY_RUN && hit % 10 === 0) console.log(`[steam-enrich] 进度 ${i + 1}/${target.length}（命中 ${hit} / 未中 ${miss}）`)
        } else {
          miss++
        }
      } else {
        miss++
      }
    } catch (e) {
      fail++
      if (fail <= 5) console.error(`[steam-enrich] ${row.id} 失败:`, e instanceof Error ? e.message : String(e))
    }

    if ((i + 1) % 20 === 0) {
      saveState({ offset: startOffset + i + 1 })
      if (DRY_RUN) console.log(`[steam-enrich] DRY-RUN 进度 ${i + 1}/${target.length}（命中 ${hit} / 未中 ${miss} / 失败 ${fail}）`)
    }
    if (DELAY_MS > 0) await sleep(DELAY_MS)
  }

  saveState({ offset: startOffset + target.length })
  if (!DRY_RUN) {
    await cache.delByPrefix("circleica:galvelica:").catch(() => {})
  }
  const rate = ((hit / Math.max(1, target.length)) * 100).toFixed(1)
  console.log(`[steam-enrich] ${DRY_RUN ? "DRY-RUN" : "完成"} ✅ 命中 ${hit}（${rate}%）/ 未中 ${miss} / 失败 ${fail}；断点 offset=${startOffset + target.length}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[steam-enrich] 致命错误:", e.message)
    process.exit(1)
  })
