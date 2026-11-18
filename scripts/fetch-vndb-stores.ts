/**
 * 从 VNDB 官方 API 批量拉取「获取途径」——商店与官网链接。
 *
 * 同人游戏的资源不在通用下载站，而在 DLsite / BOOTH / Getchu / DMM / Gyutto /
 * Digiket / Freem / Steam 这些平台，VNDB 把它们记在 release（发售版本）的
 * extlinks 里，vn 主表反而没有。所以这里查的是 release 表。
 *
 * 合规：VNDB 公开 API，单线程串行 + 请求间隔 ≥700ms，不并发、不伪造身份。
 * 断点续跑：已抓过的 release id 跳过，中断后重跑继续。
 *
 * 用法：node --env-file=.env --import tsx scripts/fetch-vndb-stores.ts [最多抓几个作品]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"

const OUT_DIR = "data"
const OUT_FILE = `${OUT_DIR}/vndb-stores.json`
const META_FILE = `${OUT_DIR}/vndb-meta.json`
const GAP_MS = 700
const LIMIT = Number(process.argv[2] ?? "0") // 0 = 全量

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface ExtLink {
  label: string
  url: string
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  const meta: Record<string, unknown> = existsSync(META_FILE)
    ? JSON.parse(readFileSync(META_FILE, "utf8"))
    : {}
  let allIds = Object.keys(meta).filter((k) => /^v\d+$/.test(k))
  if (LIMIT > 0) allIds = allIds.slice(0, LIMIT)

  let store: Record<string, ExtLink[]> & { _done?: string[] } = existsSync(OUT_FILE)
    ? JSON.parse(readFileSync(OUT_FILE, "utf8"))
    : {}
  const doneVns = new Set<string>((store._done ?? []) as string[])
  const todo = allIds.filter((id) => !doneVns.has(id))
  console.log(`作品 ${allIds.length} 个，已完成 ${doneVns.size} 个，待抓 ${todo.length} 个`) // Set 只有 size

  const t0 = Date.now()
  let reqs = 0
  let relCount = 0
  const vnToRel: Record<string, string[]> = {}

  // 每批 100 个作品：再小的话批次数翻倍、开销明显；再大则单请求翻页过深
  const BATCH = 100
  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH)
    const filters: unknown[] = ["or"]
    for (const id of chunk) filters.push(["vn", "=", ["id", "=", id]])

    let page = 1
    for (let attempt = 0; attempt < 4; attempt++) {
      let ok = false
      try {
        for (;;) {
          const res = await fetch("https://api.vndb.org/kana/release", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Circleica/1.0 (galgame database sync)",
            },
            body: JSON.stringify({
              filters,
              // 注意：release 表里关联作品数组的字段名是 vns（不是 vn），vn 只用在 filters 里
              fields: "id, extlinks.label, extlinks.url, released, platforms, vns.id, freeware, official",
              results: 100,
              page,
            }),
          })
          reqs += 1
          if (res.status === 429) {
            await sleep(15_000)
            continue
          }
          if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}`)
          const j = (await res.json()) as {
            more?: boolean
            results?: { id: string; extlinks?: ExtLink[]; vns?: { id: string }[] }[]
          }
          for (const r of j.results ?? []) {
            relCount += 1
            if (!r.extlinks?.length) continue
            const cur = store[r.id] ?? []
            const seen = new Set(cur.map((x) => x.url))
            for (const e of r.extlinks) {
              if (!seen.has(e.url)) cur.push({ label: e.label, url: e.url })
            }
            store[r.id] = cur
            // 同时记录 release → 作品的归属，后面才能把链接挂回作品
            for (const v of r.vns ?? []) {
              const arr = (vnToRel[v.id] ??= [])
              if (!arr.includes(r.id)) arr.push(r.id)
            }
          }
          if (!j.more) break
          page += 1
          await sleep(GAP_MS)
        }
        ok = true
      } catch (e) {
        console.log(`  批次 ${i} 失败: ${(e as Error).message}`)
        await sleep(3000)
      }
      if (ok) break
    }

    for (const id of chunk) doneVns.add(id)
    store._done = [...doneVns]

    if ((i / BATCH) % 10 === 0) {
      const el = ((Date.now() - t0) / 1000).toFixed(0)
      const withLink = Object.entries(store).filter(([k]) => k !== "_done" && (store as any)[k]?.length).length
      console.log(
        `  进度 ${doneVns.size}/${todo.length}  请求 ${reqs}  release ${relCount}  带链接 ${withLink}  (${el}s)`,
      )
      writeFileSync(OUT_FILE, JSON.stringify(store))
    }
    await sleep(GAP_MS)
  }

  writeFileSync(OUT_FILE, JSON.stringify(store))
  writeFileSync(`${OUT_DIR}/vndb-release-to-vn.json`, JSON.stringify(vnToRel))

  const real = Object.entries(store).filter(([k]) => k !== "_done")
  const withLink = real.filter(([, v]) => (v as ExtLink[])?.length)
  // vnToRel 的 key 就是作品编号，有几个 key 就说明有几部作品拿到了链接
  const vnWithLink = Object.keys(vnToRel).filter((vid) =>
    (vnToRel[vid] ?? []).some((rid) => (store[rid]?.length ?? 0) > 0),
  )
  console.log(
    `\n完成：release ${real.length} 条，带外链 ${withLink.length} 条，` +
      `可关联到 ${vnWithLink.length} 部作品，请求 ${reqs} 次，用时 ${((Date.now() - t0) / 60000).toFixed(1)} 分钟`,
  )
  console.log("已写入", OUT_FILE, "与 data/vndb-release-to-vn.json")
}

main().catch((e) => console.error("失败:", e))
