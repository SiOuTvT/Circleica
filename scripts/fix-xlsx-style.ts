/**
 * 给 SheetJS 生成的 xlsx 补上单元格样式。
 *
 * SheetJS 社区版不会写出 <cellXfs>，所以「自动换行 / 冻结首行 / 表头加粗」都没法直接生成。
 * 本脚本直接改写 xlsx 内部的 XML（xlsx 本质是 zip），不引入任何第三方依赖：
 *
 *   · 所有数据列套用 wrapText + 顶端对齐 → 长标题完整换行显示，绝不截断
 *   · 首行冻结，表头加粗 + 浅蓝底 + 居中
 *   · 行高不写死，交给 Excel 随内容自动撑开
 *
 * 用法：node --import tsx scripts/fix-xlsx-style.ts [输入文件] [输出文件]
 */
import { readFileSync, writeFileSync } from "node:fs"
import { unzip, zip, type ZipEntry } from "./lib/zip.ts"
import { checkXmlWellFormed } from "./lib/xml-check.ts"

const IN = process.argv[2] ?? "galvelica-priority-raw.xlsx"
const OUT = process.argv[3] ?? "galvelica-priority-full.xlsx"

/** styles.xml：追加 1 个加粗字体、1 个浅蓝填充、2 个 cellXfs（1=正文 2=表头） */
function patchStyles(xml: string): string {
  if (/<fonts[^>]*count="2"/.test(xml)) return xml // 已修补过

  let out = xml

  // 字体 1：加粗
  out = out.replace(/<fonts count="(\d+)">/, (_m, n: string) => `<fonts count="${Number(n) + 1}">`)
  out = out.replace(
    /<\/fonts>/,
    '<font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font></fonts>',
  )

  // 填充：浅蓝底（索引 = 原有填充个数）
  const fillCount = Number(/<fills count="(\d+)">/.exec(out)?.[1] ?? "2")
  const newFillIdx = fillCount
  out = out.replace(/<fills count="(\d+)">/, (_m, n: string) => `<fills count="${Number(n) + 1}">`)
  out = out.replace(
    /<\/fills>/,
    '<fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/><bgColor indexed="64"/></patternFill></fill></fills>',
  )

  // cellXfs：索引 1 正文（自动换行 + 顶端对齐）；索引 2 表头（粗体 + 底色 + 居中）
  out = out.replace(/<cellXfs count="(\d+)">/, (_m, n: string) => `<cellXfs count="${Number(n) + 2}">`)
  out = out.replace(
    /<\/cellXfs>/,
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1">` +
      `<alignment wrapText="1" vertical="top"/></xf>` +
      `<xf numFmtId="0" fontId="1" fillId="${newFillIdx}" borderId="0" xfId="0" ` +
      `applyFont="1" applyFill="1" applyAlignment="1">` +
      `<alignment wrapText="1" vertical="center" horizontal="center"/></xf></cellXfs>`,
  )

  return out
}

/**
 * 单元格标签：<c r="A1" t="str"> 或 <c r="B5"/>
 * 分别捕获 列字母 / 行号 / 其余属性 / 是否自闭合
 */
const CELL_RE = /<c r="([A-Z]+)(\d+)"((?:\s+[a-zA-Z]+="[^"]*")*)\s*(\/?)>/g

/**
 * 逐个单元格写入样式：表头行 s="2"，其余 s="1"（自动换行 + 顶端对齐）。
 *
 * 早先只在 <col> 上挂 style="1"，指望它作为列默认格式生效。实测 Excel 并不会
 * 把它落到单元格上（列宽生效了，Range.WrapText 仍是 False，长标题照样被截断），
 * 所以这里老老实实给每个单元格写 s 属性。已有 s 的单元格保持原样。
 */
function styleCells(xml: string): string {
  return xml.replace(CELL_RE, (m, col: string, row: string, attrs: string, slash: string) => {
    if (/\ss="/.test(attrs)) return m
    return `<c r="${col}${row}"${attrs} s="${row === "1" ? "2" : "1"}"${slash}>`
  })
}

/** 工作表：单元格自动换行、首行套表头样式、冻结首行 */
function patchSheet(xml: string): string {
  let out = xml

  // 1) 列级样式一并保留：既负责列宽，也作为未覆盖到时的兜底
  out = out.replace(/<col (?![^>]*\bstyle=)/g, '<col style="1" ')

  // 2) 逐个单元格写样式；行号为 1 的是表头，走加粗底色样式
  out = styleCells(out)

  // 3) 冻结首行
  // 注意：必须整块替换 <sheetViews>...</sheetViews>。
  // 早先只替换 <sheetView .../> 而漏掉尾部的 </sheetViews>，会留下一个多余的结束标签，
  // Excel 打开时直接判定文件损坏（SheetJS 读取时较宽容，自检察觉不到）。
  const frozen =
    '<sheetViews><sheetView workbookViewId="0">' +
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>' +
    "</sheetView></sheetViews>"

  if (/<sheetViews>[\s\S]*?<\/sheetViews>/.test(out)) {
    out = out.replace(/<sheetViews>[\s\S]*?<\/sheetViews>/, frozen)
  } else {
    out = out.replace("<sheetData>", frozen + "<sheetData>")
  }

  return out
}

async function main() {
  const raw = readFileSync(IN)
  console.log(`读入 ${IN}（${(raw.length / 1048576).toFixed(1)} MB）`)

  const entries = unzip(raw)
  console.log(`zip 条目 ${entries.length} 个`)

  const patched: ZipEntry[] = entries.map((e) => {
    if (e.name === "xl/styles.xml") {
      const xml = patchStyles(e.data.toString("utf8"))
      const bad = checkXmlWellFormed(xml)
      if (bad) throw new Error(`改写后的 ${e.name} 不是良构 XML：${bad.message}（行 ${bad.line} 列 ${bad.column}）`)
      console.log("  [样式] xl/styles.xml  良构 ✓")
      return { ...e, data: Buffer.from(xml, "utf8") }
    }
    if (/^xl\/worksheets\/sheet\d+\.xml$/.test(e.name)) {
      const text = e.data.toString("utf8")
      const xml = patchSheet(text)
      const bad = checkXmlWellFormed(xml)
      if (bad) throw new Error(`改写后的 ${e.name} 不是良构 XML：${bad.message}（行 ${bad.line} 列 ${bad.column}）`)
      console.log(`  [工作表] ${e.name}  ${(text.length / 1048576).toFixed(1)} MB  良构 ✓`)
      return { ...e, data: Buffer.from(xml, "utf8") }
    }
    return e
  })

  const buf = zip(patched)
  try {
    writeFileSync(OUT, buf)
    console.log(`\n已生成 ${OUT}（${(buf.length / 1048576).toFixed(1)} MB）`)
  } catch (e) {
    const err = e as { code?: string }
    if (err.code === "EBUSY" || err.code === "EPERM") {
      // 文件被 Excel 占着就自动换名，别让流程卡死
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")
      const alt = OUT.replace(/\.xlsx$/i, `-${stamp}.xlsx`)
      writeFileSync(alt, buf)
      console.warn(`\n${OUT} 正被占用（Excel 还开着），已改写到 ${alt}`)
      console.log(`已生成 ${alt}（${(buf.length / 1048576).toFixed(1)} MB）`)
      return
    }
    throw e
  }
}

main().catch((e) => {
  console.error("失败:", e)
  process.exit(1)
})
