/** 查看全部标签名，用于识别「拔作」类标签 */
import { realPrisma as prisma } from "../src/lib/prisma"

async function main() {
  const tags = await prisma.tag.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  })
  console.log("标签总数 =", tags.length)
  console.log(tags.map((t) => t.name).join(" | "))
}

main()
  .catch((e) => console.error("失败:", e.message))
  .finally(() => prisma.$disconnect().catch(() => {}))
