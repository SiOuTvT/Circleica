/** 确认「拔作」类标签的实际名称与命中作品数 */
import { realPrisma as prisma } from "../src/lib/prisma"

async function main() {
  const tags = await prisma.tag.findMany({ select: { name: true } })
  const names = tags.map((t) => String(t.name))
  console.log("含 拔作/nukige 的标签:", names.filter((n) => /拔作|nukige/i.test(n)).join(" | ") || "(无)")

  for (const kw of ["拔作", "催泪", "泣きゲー", "剧情", "恋爱"]) {
    const t = names.filter((n) => n.includes(kw))
    if (!t.length) continue
    const cnt = await prisma.workTag.count({ where: { tag: { name: { contains: kw } } } })
    console.log(`  「${kw}」标签=${t.join(",")}  作品关联数=${cnt}`)
  }
}

main()
  .catch((e) => console.error("失败:", e.message))
  .finally(() => prisma.$disconnect().catch(() => {}))
