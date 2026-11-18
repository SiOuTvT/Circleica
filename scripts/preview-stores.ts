/** 预览：把已抓到的获取途径挂到排名前列的作品上 */
import { existsSync, readFileSync } from "node:fs"
import * as XLSX from "xlsx"

const PLATFORMS: { name: string; re: RegExp; paid: boolean }[] = [
  { name: "DLsite", re: /dlsite\.com/i, paid: true },
  { name: "Steam", re: /store\.steampowered\.com/i, paid: true },
  { name: "BOOTH", re: /booth\.pm/i, paid: true },
  { name: "DL.Getchu", re: /getchu\.com/i, paid: true },
  { name: "DMM", re: /dmm\.com|dlsoft\.dmm/i, paid: true },
  { name: "Gyutto", re: /gyutto\.com/i, paid: true },
  { name: "Digiket", re: /digiket\.com/i, paid: true },
  { name: "itch.io", re: /itch\.io/i, paid: false },
  { name: "Freem（免费）", re: /freem\.ne\.jp/i, paid: false },
  { name: "App Store", re: /apps\.apple\.com/i, paid: true },
  { name: "Google Play", re: /play\.google\.com/i, paid: true },
  { name: "GOG", re: /gog\.com/i, paid: true },
  { name: "ErogameScape", re: /erogamescape/i, paid: false },
]

async function main() {
  const top = Number(process.argv[2] ?? "20")
  const store: Record<string, { label: string; url: string }[]> = JSON.parse(
    readFileSync("data/vndb-stores.json", "utf8"),
  )
  const vnToRel: Record<string, string[]> = JSON.parse(readFileSync("data/vndb-release-to-vn.json", "utf8"))
  const wb = XLSX.read(readFileSync("galvelica-priority-SA.xlsx"))
  const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets["总排名"])

  console.log(`排名 / 中文名 / 获取途径`)
  let n = 0
  for (const r of rows.slice(0, top)) {
    const rels = vnToRel[r.VNDB编号] ?? []
    const links: { label: string; url: string }[] = []
    for (const rid of rels) {
      for (const e of store[rid] ?? []) {
        if (!links.some((x) => x.url === e.url)) links.push(e)
      }
    }
    if (!links.length) {
      console.log(`#${String(r.排名).padStart(3)} ${String(r.中文名).slice(0, 18).padEnd(20)} —（暂未抓到）`)
      continue
    }
    n += 1
    const named = links.map((l) => {
      const p = PLATFORMS.find((x) => x.re.test(l.url))
      return p ? p.name : "官网"
    })
    console.log(`#${String(r.排名).padStart(3)} ${String(r.中文名).slice(0, 18).padEnd(20)} ${[...new Set(named)].join(" / ")}`)
  }
  console.log(`\n前 ${top} 部中 ${n} 部已拿到获取途径`)
}

main()
