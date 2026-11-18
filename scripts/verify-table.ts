/** 质检：行数完整性、排序、样式、拔作分表、中文名覆盖 */
import { readFileSync } from "node:fs"
import * as XLSX from "xlsx"
import { unzip } from "./lib/zip.ts"
import { checkXmlWellFormed } from "./lib/xml-check.ts"

const FILE = process.argv[2] ?? "galvelica-priority-full.xlsx"

async function main() {
  // ── 内部 XML 校验（良构性 / 自动换行 / 冻结 / 表头样式）──────────
  const entries = unzip(readFileSync(FILE))
  const styles = entries.find((e) => e.name === "xl/styles.xml")!.data.toString("utf8")
  const sheet1 = entries.find((e) => e.name === "xl/worksheets/sheet1.xml")!.data.toString("utf8")

  // Excel 对标签配对要求严格，SheetJS 读不出来问题不代表文件没坏，必须逐个校验
  const targets = entries.filter((e) => /^xl\/(worksheets\/sheet\d+|styles|workbook)\.xml$/.test(e.name))
  const broken = targets
    .map((e) => ({ name: e.name, bad: checkXmlWellFormed(e.data.toString("utf8")) }))
    .filter((x) => x.bad)
  console.log("=== XML 良构性（Excel 能否正常打开）===")
  console.log(`  已校验 ${targets.length} 个部件，损坏 ${broken.length} 个`)
  broken.forEach((x) => console.log(`  ✗ ${x.name}: ${x.bad!.message}（行 ${x.bad!.line} 列 ${x.bad!.column}）`))
  if (broken.length) {
    console.error("\n文件会被 Excel 判定为损坏，请检查 fix-xlsx-style.ts 的改写逻辑")
    process.exit(1)
  }

  console.log("\n=== 样式校验 ===")
  console.log("  styles.xml 含 wrapText      =", /wrapText="1"/.test(styles))
  console.log("  styles.xml cellXfs 条数     =", /<cellXfs count="(\d+)"/.exec(styles)?.[1])
  const cellTotal = (sheet1.match(/<c r="[A-Z]+\d+"/g) ?? []).length
  const cellStyled = (sheet1.match(/<c r="[A-Z]+\d+"[^>]*\ss="1"/g) ?? []).length
  console.log("  列级换行兜底 style=1       =", /<col style="1"/.test(sheet1))
  console.log(
    `  单元格逐个换行 s="1"         = ${cellStyled}/${cellTotal}（必须全覆盖，否则长标题会被截断）`,
  )
  console.log("  首行套表头样式 s=\"2\"        =", /<c r="A1"[^>]*\bs="2"/.test(sheet1))
  console.log("  首行冻结                    =", /state="frozen"/.test(sheet1))
  console.log("  自动筛选                    =", /<autoFilter/.test(sheet1))

  // ── 内容校验 ───────────────────────────────────────────────────
  const wb = XLSX.read(readFileSync(FILE), { type: "buffer" })
  const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets["总排名"])
  console.log("\n=== 内容校验 ===")
  console.log("  sheet 列表 =", wb.SheetNames.join(" / "))
  console.log("  总行数 =", rows.length)

  const ranks = rows.map((r) => Number(r.排名))
  const sortedOk = ranks.every((v, i) => v === i + 1)
  const scoreDesc = rows.every((r, i) => i === 0 || Number(rows[i - 1].综合分) >= Number(r.综合分))
  console.log("  排名连续无重复 =", sortedOk)
  console.log("  综合分严格降序 =", scoreDesc)
  console.log("  列名 =", Object.keys(rows[0]).join(" / "))

  // 18+ 一视同仁：露骨作品不应集中在末尾
  const rankAvg = (pred: (r: any) => boolean) => {
    const g = rows.filter(pred)
    return g.length ? (g.reduce((s, r) => s + Number(r.排名), 0) / g.length).toFixed(0) : "—"
  }
  console.log("\n=== 18+ 是否一视同仁 ===")
  console.log("  全库中位排名 =", (rows.length / 2).toFixed(0))
  console.log("  【全口径，含拔作】")
  console.log("    露骨 =", rankAvg((r) => r.内容分级 === "露骨"), " 安全 =", rankAvg((r) => r.内容分级 === "安全"))
  console.log(
    "  【剔除拔作后，隔离 18+ 本身的影响 —— 这一行才是对照组】",
  )
  const nonNuk = (r: any) => r.是否拔作 !== "是"
  console.log(
    "    露骨 =",
    rankAvg((r) => r.内容分级 === "露骨" && nonNuk(r)),
    " 安全 =",
    rankAvg((r) => r.内容分级 === "安全" && nonNuk(r)),
    " 未标 =",
    rankAvg((r) => r.内容分级 === "未标" && nonNuk(r)),
  )
  const dimAvg = (dim: string, pred: (r: any) => boolean) => {
    const g = rows.filter(pred)
    return g.length ? (g.reduce((s, r) => s + Number(r[dim]), 0) / g.length).toFixed(1) : "—"
  }
  console.log("  【各维度均值 露骨 vs 安全（剔除拔作）】")
  for (const d of ["口碑分", "质量分", "画面分", "社团分", "体量分", "主创分"]) {
    console.log(
      `    ${d}  露骨=${dimAvg(d, (r) => r.内容分级 === "露骨" && nonNuk(r))}  安全=${dimAvg(d, (r) => r.内容分级 === "安全" && nonNuk(r))}`,
    )
  }
  console.log(
    "  口碑=0 的条数 =",
    rows.filter((r) => Number(r.口碑分) === 0).length,
    "（应为 0：缺失一律回中位 50）",
  )
  console.log(
    "  口碑=50 的条数 =",
    rows.filter((r) => Number(r.口碑分) === 50).length,
  )
  console.log(
    "  社团分=0 条数 =",
    rows.filter((r) => Number(r.社团分) === 0).length,
    " 主创分=0 条数 =",
    rows.filter((r) => Number(r.主创分) === 0).length,
  )

  // 拔作
  const nuk = rows.filter((r) => r.是否拔作 === "是")
  const nukRanks = nuk.map((r) => Number(r.排名)).sort((a, b) => a - b)
  console.log("\n=== 纯拔作 ===")
  console.log("  总表内拔作数 =", nuk.length)
  console.log("  拔作排名区间 =", nukRanks[0], "~", nukRanks[nukRanks.length - 1])
  console.log("  拔作分表行数 =", XLSX.utils.sheet_to_json<any>(wb.Sheets["纯拔作"]).length)

  // 中文名覆盖
  const bySrc = new Map<string, number>()
  rows.forEach((r) => bySrc.set(r.中文名来源, (bySrc.get(r.中文名来源) ?? 0) + 1))
  console.log("\n=== 中文名来源分布 ===")
  ;[...bySrc.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(14)} ${v}  (${((v / rows.length) * 100).toFixed(1)}%)`))

  // 梯队
  const byTier = new Map<string, number>()
  rows.forEach((r) => byTier.set(r.梯队, (byTier.get(r.梯队) ?? 0) + 1))
  console.log("\n=== 梯队分布 ===")
  ;["S", "A", "B", "C", "D"].forEach((t) => console.log(`  ${t} 梯队 ${byTier.get(t) ?? 0}`))

  console.log("\n=== Top 25 ===")
  rows.slice(0, 25).forEach((r) =>
    console.log(
      `#${String(r.排名).padStart(5)} [${r.梯队}] ${String(r.中文名).slice(0, 22).padEnd(22)} ` +
        `综合${String(r.综合分).padStart(6)} 口碑${String(r.口碑分).padStart(5)} ` +
        `评分${String(r.VNDB评分 || "—").padStart(5)} 票${String(r.VNDB票数 || "—").padStart(6)} | ${String(r.社团会社).slice(0, 14)} | ${r.国家地区} | ${r.作品性质}`,
    ),
  )
}

main().catch((e) => {
  console.error("失败:", e)
  process.exit(1)
})
