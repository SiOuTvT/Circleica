/**
 * A-5 slug 回填脚本（DATA-RECON D-A 修复）。
 *
 * 现状：Tag/Creator/Studio/CuratedCollection 的 slug 字段均为 @unique 但 String?（可空）。
 * 对账发现 NULL slug：Creator 6627 行、Tag 5 行（Studio/CuratedCollection 无 NULL）。
 * 回填：对 NULL/空 slug 按 slugify(name) 生成，并保证模型内唯一（冲突追加 -2/-3）。
 *
 * 默认 dry-run（仅统计+样例，不写库）；加 --apply 才执行 UPDATE。
 * 运行：npx tsx scripts/backfill-slugs.ts [--apply]
 */
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/slug"

type ModelKey = "tag" | "creator" | "studio" | "curatedCollection"
interface Spec {
  nameField: "name" | "displayName"
  label: string
}
const SPECS: Record<ModelKey, Spec> = {
  tag: { nameField: "name", label: "Tag" },
  creator: { nameField: "name", label: "Creator" },
  studio: { nameField: "displayName", label: "Studio" },
  curatedCollection: { nameField: "name", label: "CuratedCollection" },
}

const APPLY = process.argv.includes("--apply")

async function backfillOne(key: ModelKey, spec: Spec) {
  const model = (prisma as any)[key]
  const nullRows = await model.findMany({
    where: { OR: [{ slug: null }, { slug: "" }] },
    select: { id: true, slug: true, [spec.nameField]: true },
  })
  const existingSlugs: Set<string> = new Set(
    (
      await model.findMany({
        where: { NOT: { slug: null }, AND: { slug: { not: "" } } },
        select: { slug: true },
      })
    ).map((r: any) => r.slug as string),
  )

  const plan: Array<{ id: string; slug: string }> = []
  for (const row of nullRows as Array<any>) {
    const nameVal = row[spec.nameField] as string
    const base = slugify(nameVal) || `item-${row.id}`
    let cand = base
    let n = 2
    while (existingSlugs.has(cand)) cand = `${base}-${n++}`
    existingSlugs.add(cand)
    plan.push({ id: row.id, slug: cand })
  }

  console.log(
    `[${spec.label}] NULL/空 slug: ${nullRows.length} 行；将生成 ${plan.length} 个 slug` +
      (plan.length ? `；样例: ${plan.slice(0, 3).map((p) => p.slug).join(", ")}` : ""),
  )

  if (APPLY && plan.length) {
    const BATCH = 500
    for (let i = 0; i < plan.length; i += BATCH) {
      const chunk = plan.slice(i, i + BATCH)
      await prisma.$transaction(
        chunk.map((p) => model.update({ where: { id: p.id }, data: { slug: p.slug } })),
      )
    }
    console.log(`  -> 已写入 ${plan.length} 行`)
  }
}

async function main() {
  console.log(APPLY ? "模式：APPLY（将写库）" : "模式：DRY-RUN（仅统计，不写库）")
  for (const [key, spec] of Object.entries(SPECS) as Array<[ModelKey, Spec]>) {
    await backfillOne(key, spec)
  }
  console.log(APPLY ? "回填完成。" : "Dry-run 结束，确认无误后加 --apply 执行回填。")
}

main()
  .catch((e) => {
    console.error("回填失败:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
