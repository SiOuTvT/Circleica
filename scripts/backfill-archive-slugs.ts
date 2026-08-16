/**
 * Archive slug 回填脚本（已过时，现为安全空跑）。
 *
 * 历史背景：
 *   迁移 20260731041500_add_archive_slugs 为 Studio / Creator / CuratedCollection
 *   增加了可空、唯一的 slug 列；迁移 20260731080000_add_tag_slug 为 Tag 增加了同样列。
 *   存量行 slug 为 NULL —— 必须回填，否则依赖 slug 的 Archive 路由
 *   （/credits/collection/[slug]、旧 /collections/[id] 308 跳转、卡片链接）全部失效。
 *
 * 现状（2026-08-15）：
 *   迁移 20260814000000_slug_not_null 已将 Studio / Creator / Tag / CuratedCollection
 *   的 slug 改为 NOT NULL @unique，并为存量行按 coalesce(id) 兜底回填。
 *   因此 slug 已恒非空，本脚本在真实库上不再命中任何 null 行。
 *
 * 行为（保守）：
 *   仅遍历全部行；若某行已有 slug 则 continue（绝不覆盖已有 slug）。
 *   因 slug 现恒非空，实际无 UPDATE 发生 —— 本脚本成为空跑，仅保留作历史参考，可安全删除。
 *
 * 用法（需先 prisma generate + 目标库可达）：
 *   npx tsx scripts/backfill-archive-slugs.ts
 */
import { realPrisma as prisma } from "@/lib/prisma"
import { slugify } from "@/lib/slug"



async function backfillStudio() {
  const rows = await prisma.studio.findMany({
    where: {},
    select: { id: true, displayName: true, slug: true },
  })
  for (const r of rows) {
    if (r.slug) continue // slug 现 NOT NULL，迁移已回填，无 null 行
    const base = slugify(r.displayName)
    let slug = base
    let n = 2
    while (
      await prisma.studio.findFirst({
        where: { slug, NOT: { id: r.id } },
        select: { id: true },
      })
    ) {
      slug = `${base}-${n++}`
    }
    await prisma.studio.update({ where: { id: r.id }, data: { slug } })
  }
  console.log(`[backfill-archive-slugs] studio: ${rows.length} 行已回填`)
}

async function backfillCreator() {
  const rows = await prisma.creator.findMany({
    where: {},
    select: { id: true, name: true, slug: true },
  })
  for (const r of rows) {
    if (r.slug) continue // slug 现 NOT NULL，迁移已回填，无 null 行
    const base = slugify(r.name)
    let slug = base
    let n = 2
    while (
      await prisma.creator.findFirst({
        where: { slug, NOT: { id: r.id } },
        select: { id: true },
      })
    ) {
      slug = `${base}-${n++}`
    }
    await prisma.creator.update({ where: { id: r.id }, data: { slug } })
  }
  console.log(`[backfill-archive-slugs] creator: ${rows.length} 行已回填`)
}

async function backfillCuratedCollection() {
  const rows = await prisma.curatedCollection.findMany({
    where: {},
    select: { id: true, name: true, slug: true },
  })
  for (const r of rows) {
    if (r.slug) continue // slug 现 NOT NULL，迁移已回填，无 null 行
    const base = slugify(r.name)
    let slug = base
    let n = 2
    while (
      await prisma.curatedCollection.findFirst({
        where: { slug, NOT: { id: r.id } },
        select: { id: true },
      })
    ) {
      slug = `${base}-${n++}`
    }
    await prisma.curatedCollection.update({ where: { id: r.id }, data: { slug } })
  }
  console.log(`[backfill-archive-slugs] curatedCollection: ${rows.length} 行已回填`)
}

async function backfillTag() {
  const rows = await prisma.tag.findMany({
    where: {},
    select: { id: true, name: true, slug: true },
  })
  for (const r of rows) {
    if (r.slug) continue // slug 现 NOT NULL，迁移已回填，无 null 行
    const base = slugify(r.name)
    let slug = base
    let n = 2
    while (
      await prisma.tag.findFirst({
        where: { slug, NOT: { id: r.id } },
        select: { id: true },
      })
    ) {
      slug = `${base}-${n++}`
    }
    await prisma.tag.update({ where: { id: r.id }, data: { slug } })
  }
  console.log(`[backfill-archive-slugs] tag: ${rows.length} 行已回填`)
}

async function main() {
  await backfillStudio()
  await backfillCreator()
  await backfillCuratedCollection()
  await backfillTag()
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("[backfill-archive-slugs] 失败：", e)
    await prisma.$disconnect()
    process.exit(1)
  })
