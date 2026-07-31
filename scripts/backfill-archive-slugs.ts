/**
 * backfill-archive-slugs.ts — Archive 实体 slug 存量回填（一次性 / 幂等）
 *
 * 背景：M1–M4 为四类 Archive 实体新增了 `slug String? @unique` 用作稳定可读路由。
 * 新建实体由 admin service 自动生成 slug，但**历史数据的 slug 为 NULL**，
 * 未回填时 `/credits/<entity>/<slug>` 端到端跑不通（详情页 catch → notFound），
 * 旧路由（如 `/tags/[id]`）也无法 308 到新 slug。
 *
 * 覆盖实体（均为主站 Circleica，**不涉及副站 Galvelica**）：
 *   Studio(displayName) / Creator(name) / Tag(name) / CuratedCollection(name)
 *
 * 特性：
 * - 幂等：只处理 `slug: null` 的行，可重复执行
 * - 唯一性：库内已用 slug + 本次已分配 slug 双重去重，冲突自动 `-2/-3` 递增
 * - 分批：每批 500 条，避免大表一次性载入
 * - dry-run：`--dry-run` 只打印将要写入的内容，不落库
 *
 * 用法：
 *   npm run db:backfill-slugs            # 执行回填
 *   npm run db:backfill-slugs -- --dry-run   # 预演，不写库
 *
 * 前置：对应迁移已应用（`prisma migrate deploy`），slug 列与唯一索引已存在。
 * 校验：回填后 `SELECT count(*) FROM "Tag" WHERE "slug" IS NULL;` 应为 0。
 */

import { PrismaClient } from "@prisma/client"
import { slugify } from "../src/lib/slug"

const prisma = new PrismaClient()

const DRY_RUN = process.argv.includes("--dry-run")
const BATCH_SIZE = 500

type Target = {
  /** 展示用实体名 */
  label: string
  /** 取出待回填行（id + 名称源） */
  fetch: (take: number) => Promise<Array<{ id: string; source: string }>>
  /** 取出库中已占用的 slug */
  usedSlugs: () => Promise<string[]>
  /** 写回 slug */
  update: (id: string, slug: string) => Promise<unknown>
}

const targets: Target[] = [
  {
    label: "Studio",
    fetch: async (take) =>
      (
        await prisma.studio.findMany({
          where: { slug: null },
          select: { id: true, displayName: true, normalizedName: true },
          take,
        })
      ).map((r) => ({ id: r.id, source: r.displayName || r.normalizedName })),
    usedSlugs: async () =>
      (await prisma.studio.findMany({ where: { NOT: { slug: null } }, select: { slug: true } })).map(
        (r) => r.slug as string,
      ),
    update: (id, slug) => prisma.studio.update({ where: { id }, data: { slug } }),
  },
  {
    label: "Creator",
    fetch: async (take) =>
      (
        await prisma.creator.findMany({
          where: { slug: null },
          select: { id: true, name: true, nameJa: true },
          take,
        })
      ).map((r) => ({ id: r.id, source: r.name || r.nameJa })),
    usedSlugs: async () =>
      (await prisma.creator.findMany({ where: { NOT: { slug: null } }, select: { slug: true } })).map(
        (r) => r.slug as string,
      ),
    update: (id, slug) => prisma.creator.update({ where: { id }, data: { slug } }),
  },
  {
    label: "Tag",
    fetch: async (take) =>
      (
        await prisma.tag.findMany({
          where: { slug: null },
          select: { id: true, name: true },
          take,
        })
      ).map((r) => ({ id: r.id, source: r.name })),
    usedSlugs: async () =>
      (await prisma.tag.findMany({ where: { NOT: { slug: null } }, select: { slug: true } })).map(
        (r) => r.slug as string,
      ),
    update: (id, slug) => prisma.tag.update({ where: { id }, data: { slug } }),
  },
  {
    label: "CuratedCollection",
    fetch: async (take) =>
      (
        await prisma.curatedCollection.findMany({
          where: { slug: null },
          select: { id: true, name: true },
          take,
        })
      ).map((r) => ({ id: r.id, source: r.name })),
    usedSlugs: async () =>
      (
        await prisma.curatedCollection.findMany({
          where: { NOT: { slug: null } },
          select: { slug: true },
        })
      ).map((r) => r.slug as string),
    update: (id, slug) => prisma.curatedCollection.update({ where: { id }, data: { slug } }),
  },
]

/** 在已占用集合中为 base 找一个未被占用的 slug（冲突则 -2/-3 递增） */
function allocateSlug(base: string, used: Set<string>): string {
  let candidate = base
  let n = 2
  while (used.has(candidate)) {
    candidate = `${base}-${n}`
    n++
  }
  used.add(candidate)
  return candidate
}

async function backfill(target: Target): Promise<{ done: number; failed: number }> {
  const used = new Set(await target.usedSlugs())
  let done = 0
  let failed = 0

  for (;;) {
    const rows = await target.fetch(BATCH_SIZE)
    if (rows.length === 0) break

    for (const row of rows) {
      const slug = allocateSlug(slugify(row.source), used)

      if (DRY_RUN) {
        console.log(`  [dry-run] ${target.label} ${row.id} → ${slug}   (${row.source})`)
        done++
        continue
      }

      try {
        await target.update(row.id, slug)
        done++
      } catch (err) {
        failed++
        console.error(`  ✗ ${target.label} ${row.id} 回填失败:`, (err as Error).message)
      }
    }

    // dry-run 不写库，再查还是同一批，避免死循环
    if (DRY_RUN) break
    if (rows.length < BATCH_SIZE) break
  }

  return { done, failed }
}

async function main() {
  console.log(`[backfill] Archive slug 回填${DRY_RUN ? "（dry-run，不写库）" : ""}`)

  let totalDone = 0
  let totalFailed = 0

  for (const target of targets) {
    const { done, failed } = await backfill(target)
    totalDone += done
    totalFailed += failed
    console.log(`  ${failed === 0 ? "✓" : "!"} ${target.label}: 回填 ${done} 条${failed ? `，失败 ${failed} 条` : ""}`)
  }

  console.log(`[backfill] 完成：共 ${totalDone} 条${totalFailed ? `，失败 ${totalFailed} 条` : ""}`)

  if (totalFailed > 0) process.exitCode = 1
}

main()
  .catch((err) => {
    console.error("[backfill] 未捕获错误：", err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
