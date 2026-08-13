/**
 * reconcile-slug.ts  (D-A)
 * 只读：检查四个可空 slug 实体（Tag / Studio / Creator / CuratedCollection）
 * 是否存在 NULL 或空字符串 slug 存量。
 * 严禁任何写操作。
 */
import { prisma } from "@/lib/prisma"
import { h1, log, rows } from "./reconcile/_report"

const entities = [
  { name: "Tag", nameField: "name", get: () => prisma.tag },
  { name: "Studio", nameField: "displayName", get: () => prisma.studio },
  { name: "Creator", nameField: "name", get: () => prisma.creator },
  { name: "CuratedCollection", nameField: "name", get: () => prisma.curatedCollection },
] as const

async function main(): Promise<void> {
  h1("RECONCILE slug: NULL / 空字符串 (D-A)")
  for (const e of entities) {
    const model = e.get() as {
      count: (args?: { where?: unknown }) => Promise<number>
      findMany: (args: unknown) => Promise<unknown[]>
    }
    const where = { OR: [{ slug: null }, { slug: "" }] }
    const total = await model.count()
    const bad = await model.count({ where })
    const samples = (await model.findMany({
      where,
      select: { id: true, slug: true, [e.nameField]: true },
      take: 10,
    })) as Array<{ id: string; slug: string | null; [k: string]: unknown }>
    const pct = total > 0 ? ((bad / total) * 100).toFixed(2) : "0.00"
    log(`\n[${e.name}] total=${total} nullOrEmpty=${bad} (${pct}%)`)
    if (samples.length) rows(`${e.name} 样例`, samples, 10)
  }
  log("\nDONE (只读，无写入)")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[reconcile-slug] 致命错误:", e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
