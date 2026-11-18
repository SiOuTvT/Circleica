/**
 * 把抓到的获取途径整理成 data/store-links.json，供建表脚本使用。
 *
 * VNDB 的 release 外链里混着两类东西：真正的获取渠道（DLsite / Steam / BOOTH /
 * Getchu / DMM / itch.io / Freem / 官网），以及纯资料站（ErogameScape、Wikipedia、
 * MobyGames 等）。这里只保留获取渠道，并按「是否付费」分档。
 *
 * 一部作品可能对应多个 release，链接要去重，并挑出最有代表性的一组。
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"

/** 获取渠道定义。paid = true 表示需要付费购买 */
const CHANNELS: { name: string; re: RegExp; paid: boolean; order: number }[] = [
  { name: "Freem（免费）", re: /freem\.ne\.jp/i, paid: false, order: 0 },
  { name: "itch.io", re: /itch\.io/i, paid: false, order: 1 },
  { name: "DLsite", re: /dlsite\.com/i, paid: true, order: 2 },
  { name: "BOOTH", re: /booth\.pm/i, paid: true, order: 3 },
  { name: "Steam", re: /store\.steampowered\.com/i, paid: true, order: 4 },
  { name: "DL.Getchu", re: /getchu\.com/i, paid: true, order: 5 },
  { name: "DMM", re: /dmm\.com|dlsoft\.dmm/i, paid: true, order: 6 },
  { name: "Gyutto", re: /gyutto\.com/i, paid: true, order: 7 },
  { name: "Digiket", re: /digiket\.com/i, paid: true, order: 8 },
  { name: "GOG", re: /gog\.com/i, paid: true, order: 9 },
  { name: "App Store", re: /apps\.apple\.com/i, paid: true, order: 10 },
  { name: "Google Play", re: /play\.google\.com/i, paid: true, order: 11 },
  { name: "Epic", re: /epicgames\.com/i, paid: true, order: 12 },
  { name: "官网", re: /./, paid: false, order: 90 }, // 兜底：其余视为官网自售
]

async function main() {
  const store: Record<string, { label: string; url: string }[]> = JSON.parse(
    readFileSync("data/vndb-stores.json", "utf8"),
  )
  const vnToRel: Record<string, string[]> = JSON.parse(readFileSync("data/vndb-release-to-vn.json", "utf8"))

  const out: Record<
    string,
    { channels: string[]; urls: string[]; paid: boolean; freeOnly: boolean }
  > = {}

  let n = 0
  for (const [vnId, rels] of Object.entries(vnToRel)) {
    const seen = new Set<string>()
    const links: { label: string; url: string }[] = []
    for (const rid of rels) {
      for (const e of store[rid] ?? []) {
        if (seen.has(e.url)) continue
        seen.add(e.url)
        links.push(e)
      }
    }
    if (!links.length) continue

    // 归类并过滤掉资料站
    const hits = new Map<string, { url: string; paid: boolean; order: number }>()
    for (const l of links) {
      const ch = CHANNELS.find((c) => c.re.test(l.url))
      if (!ch) continue
      // 官网兜底规则：只在确实像官网时才收，避免把陌生站也当官网
      if (ch.name === "官网" && !/^https?:\/\//i.test(l.url)) continue
      const prev = hits.get(ch.name)
      if (!prev || ch.order < prev.order) hits.set(ch.name, { url: l.url, paid: ch.paid, order: ch.order })
    }
    if (!hits.size) continue

    const list = [...hits.entries()].sort((a, b) => a[1].order - b[1].order)
    const channels = list.map(([k]) => k)
    const urls = list.map(([, v]) => v.url)
    const freeChannels = list.filter(([, v]) => !v.paid)
    out[vnId] = {
      channels,
      urls,
      paid: freeChannels.length === 0, // 没有任何免费渠道 = 只能付费
      freeOnly: list.every(([, v]) => !v.paid), // 全部渠道都免费
    }
    n += 1
  }

  writeFileSync("data/store-links.json", JSON.stringify(out))
  const free = Object.values(out).filter((x) => x.freeOnly).length
  const paid = Object.values(out).filter((x) => x.paid).length
  console.log(`已写入 data/store-links.json：${n} 部作品`)
  console.log(`  纯免费可获取 ${free} 部`)
  console.log(`  只能付费   ${paid} 部`)
  console.log(`  混合渠道   ${n - free - paid} 部`)
}

main()
