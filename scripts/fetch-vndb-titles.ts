/**
 * 从 VNDB 官方公开 API 批量补齐作品元数据，落盘为 data/vndb-meta.json。
 *
 * 拉取字段：官方各语言标题（含 zh-Hans / zh-Hant 中文名）、评分、投票数、热度、
 *          内容体量（length 1-5）、发售日、语言、平台。
 *
 * 合规：走 VNDB 公开 API（api.vndb.org/kana），自带身份标识、不伪造 UA、不并发，
 *       单线程串行 + 请求间隔 ≥700ms（约 85 次/分钟，低于官方 100 次/分钟上限）。
 * 断点续跑：已抓过的 vndb id 会跳过；中断后再跑自动继续。
 *
 * 用法：node --env-file=.env --import tsx scripts/fetch-vndb-titles.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { realPrisma as prisma } from "../src/lib/prisma.ts"

const OUT_DIR = "data"
const OUT_FILE = `${OUT_DIR}/vndb-meta.json`
const BATCH = 100
const GAP_MS = 700

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type VndbMeta = {
  zhHans?: string
  zhHant?: string
  ja?: string
  en?: string
  rating?: number | null
  votecount?: number | null
  popularity?: number | null
  length?: number | null
  released?: string | null
  languages?: string[]
  platforms?: string[]
  olang?: string | null
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  let store: Record<string, VndbMeta> = {}
  if (existsSync(OUT_FILE)) {
    try {
      store = JSON.parse(readFileSync(OUT_FILE, "utf8"))
    } catch {
      store = {}
    }
  }
  console.log(`已有缓存 ${Object.keys(store).length} 条`)

  const src = (await prisma.$queryRawUnsafe(
    `SELECT "workId", "externalId" FROM "WorkSource" WHERE source = 'VNDB'`,
  )) as { workId: string; externalId: string }[]
  const pending = src.filter((s) => /^v\d+$/.test(s.externalId) && !store[s.externalId])
  console.log(`VNDB 源 ${src.length} 条，待抓 ${pending.length} 条`)

  let done = 0
  let fail = 0
  const t0 = Date.now()

  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH)
    const filters: unknown[] = ["or"]
    for (const c of chunk) filters.push(["id", "=", c.externalId])

    let ok = false
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        const res = await fetch("https://api.vndb.org/kana/vn", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Circleica/1.0 (galgame database sync)",
          },
          body: JSON.stringify({
            filters,
            fields:
              "id, titles.lang, titles.title, titles.official, titles.main, rating, votecount, popularity, length, released, languages, platforms, olang",
            results: BATCH,
          }),
        })
        if (!res.ok) {
          if (res.status === 429) {
            await sleep(15_000)
            continue
          }
          throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}`)
        }
        const data = (await res.json()) as {
          results?: {
            id: string
            titles?: { lang: string; title: string; official: boolean; main: boolean }[]
            rating?: number | null
            votecount?: number | null
            popularity?: number | null
            length?: number | null
            released?: string | null
            languages?: string[]
            platforms?: string[]
            olang?: string | null
          }[]
        }
        for (const r of data.results ?? []) {
          const m: VndbMeta = {
            rating: r.rating ?? null,
            votecount: r.votecount ?? null,
            popularity: r.popularity ?? null,
            length: r.length ?? null,
            released: r.released ?? null,
            languages: r.languages ?? [],
            platforms: r.platforms ?? [],
            olang: r.olang ?? null,
          }
          for (const ti of r.titles ?? []) {
            if (ti.lang === "zh-Hans" && !m.zhHans) m.zhHans = ti.title
            if (ti.lang === "zh-Hant" && !m.zhHant) m.zhHant = ti.title
            if (ti.lang === "ja" && !m.ja) m.ja = ti.title
            if (ti.lang === "en" && !m.en) m.en = ti.title
          }
          store[r.id] = m
        }
        ok = true
        done += chunk.length
      } catch (e) {
        fail += 1
        console.log(`  批次 ${i} 失败: ${(e as Error).message}`)
        await sleep(3000)
      }
    }

    if ((i / BATCH) % 20 === 0) {
      const vals = Object.values(store)
      const zh = vals.filter((t) => t.zhHans || t.zhHant).length
      const rt = vals.filter((t) => t.rating != null).length
      const el = ((Date.now() - t0) / 1000).toFixed(0)
      console.log(
        `  进度 ${done}/${pending.length}  已存 ${vals.length}  有中文 ${zh}  有评分 ${rt}  (${el}s)`,
      )
      writeFileSync(OUT_FILE, JSON.stringify(store))
    }

    await sleep(GAP_MS)
  }

  writeFileSync(OUT_FILE, JSON.stringify(store))
  const vals = Object.values(store)
  const zh = vals.filter((t) => t.zhHans || t.zhHant).length
  const rt = vals.filter((t) => t.rating != null).length
  const vc = vals.filter((t) => (t.votecount ?? 0) > 0).length
  const ln = vals.filter((t) => t.length != null).length
  console.log(
    `\n完成：共 ${vals.length} 条 | 中文名 ${zh} | 有评分 ${rt} | 有票数 ${vc} | 有体量 ${ln} | 失败批次 ${fail}`,
  )
  console.log("已写入", OUT_FILE)
}

main()
  .catch((e) => console.error("失败:", e))
  .finally(() => prisma.$disconnect().catch(() => {}))
