/** 统计翻译工作量：标签种类/语言分布、标题语言分布、社团名语言分布 */
import { realPrisma as prisma } from "../src/lib/prisma"

const q = async (sql: string) => prisma.$queryRawUnsafe(sql)

const hasJP = (s: string) => /[぀-ヿ]/.test(s)
const hasKR = (s: string) => /[가-힯]/.test(s)
const hasCN = (s: string) => /[一-鿿]/.test(s)
const asciiOnly = (s: string) => /^[\x00-\x7F]*$/.test(s)

async function main() {
  // 标签
  const tagRows = (await q(`SELECT name FROM "Tag" WHERE name IS NOT NULL`)) as any[]
  const tagNames = tagRows.map((r) => String(r.name))
  const jp = tagNames.filter(hasJP)
  const kr = tagNames.filter(hasKR)
  const cn = tagNames.filter((s) => hasCN(s) && !hasJP(s))
  const en = tagNames.filter((s) => asciiOnly(s) && s.trim() !== "")
  console.log("=== 标签 ===")
  console.log(`  总数=${tagNames.length}  含日文=${jp.length}  含韩文=${kr.length}  纯中文=${cn.length}  纯ASCII=${en.length}`)
  console.log("  含日文样例:", jp.slice(0, 15).join(" | "))

  // 作品标题语言分布
  const workRows = (await q(`SELECT title, "originalWork", "englishName" FROM "Work"`)) as any[]
  const titles = workRows.map((r) => String(r.title ?? ""))
  const origs = workRows.map((r) => String(r.originalWork ?? ""))
  const engs = workRows.map((r) => String(r.englishName ?? ""))
  console.log("\n=== 作品标题 ===")
  console.log(`  总数=${titles.length}`)
  console.log(`  title 含日文=${titles.filter(hasJP).length}  title 纯ASCII=${titles.filter((s) => asciiOnly(s) && s.trim() !== "").length}`)
  console.log(`  originalWork 非空=${origs.filter((s) => s.trim() !== "").length}  含日文=${origs.filter(hasJP).length}`)
  console.log(`  englishName 非空=${engs.filter((s) => s.trim() !== "").length}`)
}

main()
  .catch((e) => console.error("失败:", e.message))
  .finally(() => prisma.$disconnect().catch(() => {}))
