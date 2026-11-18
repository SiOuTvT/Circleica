/** 统计已抓到的获取途径分布（按平台归类） */
import { existsSync, readFileSync } from "node:fs"

/** 把 VNDB 的外链标签归到具体平台 */
const PLATFORMS: { name: string; re: RegExp }[] = [
  { name: "DLsite", re: /dlsite\.com/i },
  { name: "Steam", re: /store\.steampowered\.com|steamdb\.info/i },
  { name: "BOOTH", re: /booth\.pm/i },
  { name: "DL.Getchu", re: /getchu\.com/i },
  { name: "DMM", re: /dmm\.com|dlsoft\.dmm/i },
  { name: "Gyutto", re: /gyutto\.com/i },
  { name: "Digiket", re: /digiket\.com/i },
  { name: "Freem（免费）", re: /freem\.ne\.jp/i },
  { name: " itch.io", re: /itch\.io/i },
  { name: "App Store", re: /apps\.apple\.com/i },
  { name: "Google Play", re: /play\.google\.com/i },
  { name: "GOG", re: /gog\.com/i },
  { name: "Epic", re: /epicgames\.com/i },
  { name: "官网", re: /./ }, // 兜底：其余归为官网/其他
]

async function main() {
  const storeFile = "data/vndb-stores.json"
  const relFile = "data/vndb-release-to-vn.json"
  if (!existsSync(storeFile)) {
    console.log("还没有抓取结果")
    return
  }
  const store: Record<string, { label: string; url: string }[]> = JSON.parse(readFileSync(storeFile, "utf8"))
  const vnToRel: Record<string, string[]> = existsSync(relFile)
    ? JSON.parse(readFileSync(relFile, "utf8"))
    : {}

  const done = ((store as any)._done ?? []) as string[]
  console.log(`已处理作品 ${done.length} 部，release ${Object.keys(store).length - 1} 条`)

  // 每部作品挑一组最优链接：优先销售平台，其次官网
  const byPlatform = new Map<string, number>()
  let withAny = 0
  for (const [vnId, rels] of Object.entries(vnToRel)) {
    const links: { label: string; url: string }[] = []
    for (const rid of rels) {
      for (const e of store[rid] ?? []) {
        if (!links.some((x) => x.url === e.url)) links.push(e)
      }
    }
    if (!links.length) continue
    withAny += 1
    const hit = new Set<string>()
    for (const l of links) {
      const p = PLATFORMS.find((x) => x.re.test(l.url))
      if (p) hit.add(p.name.trim())
    }
    for (const h of hit) byPlatform.set(h, (byPlatform.get(h) ?? 0) + 1)
  }

  console.log(`\n有获取链接的作品 ${withAny} 部`)
  console.log("\n按平台统计（一部作品可能同时命中多个）:")
  ;[...byPlatform.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(14)} ${v}`))
}

main()
