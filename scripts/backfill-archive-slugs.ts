/**
 * Archive slug 回填脚本（幂等）。
 *
 * 背景：
 *   迁移 20260731041500_add_archive_slugs 为 Studio / Creator / CuratedCollection
 *   增加了可空、唯一的 slug 列；迁移 20260731080000_add_tag_slug 为 Tag 增加了同样列。
 *   存量行 slug 为 NULL —— 必须回填，否则依赖 slug 的 Archive 路由
 *   （/credits/collection/[slug]、旧 /collections/[id] 308 跳转、卡片链接）全部失效。
 *
 * 行为：
 *   为每条 slug IS NULL 的行用 slugify(名称) 生成稳定 slug；
 *   唯一性以「库内已存在 slug」为基准循环 -2/-3 保证（与 admin 创建合集逻辑一致）。
 *
 * 幂等：只处理 slug IS NULL 的行，重跑不会覆盖已有 slug。
 *   必须在迁移已应用到目标库之后执行（列不存在时 UPDATE 会报 column does not exist）。
 *
 * 用法（需先 prisma generate + 目标库可达）：
 *   npx tsx scripts/backfill-archive-slugs.ts
 */
import { PrismaClient } from "@prisma/client"
import { slugify } from "@/lib/slug"

const prisma = new PrismaClient()

async function backfillStudio() {
  const rows = await prisma.studio.findMany({
    where: { slug: null },
    select: { id: true, displayName: true },
  })
  for (const r of rows) {
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
    where: { slug: null },
    select: { id: true, name: true },
  })
  for (const r of rows) {
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
    where: { slug: null },
    select: { id: true, name: true },
  })
  for (const r of rows) {
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
    where: { slug: null },
    select: { id: true, name: true },
  })
  for (const r of rows) {
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
