/**
 * 数据迁移：把主站游戏班底里「归属标错」的 galvelica 创作者，
 * 在主站补一条 source="circleica" 的记录，并把 GameCreator 关联重挂过去。
 *
 * 政策边界（prisma/schema.prisma 的 Creator.source 注释）：
 *   circleica=主站 / galvelica=副站；主站读取恒过滤此值，确保副站摄入数据不窜入主站。
 * 本脚本只【补主站侧】数据，绝不修改 / 删除任何 galvelica 行，
 * 也不碰 WorkCreator（38443 条）与 lib/galvelica/* 链路。
 *
 * 三处 source 过滤（lib/creators.ts:48 / :234 / :353）与跨站校验
 * （services/admin/content.ts 的「该创作者属于其他站点，无权操作」）一律不动。
 *
 * 幂等：按 name + source="circleica" 查到已有记录即复用，不重复创建。
 * 仅改 GameCreator.creatorId 指向，总条数不变、role 不变。
 *
 * 用法：
 *   npx tsx scripts/backfill-circleica-gamecrew.ts            # 执行迁移
 *   npx tsx scripts/backfill-circleica-gamecrew.ts --dry-run  # 只打印计划与计数，不改库
 */
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/slug"

async function main() {
  const dryRun = process.argv.includes("--dry-run")

  // 1) 定位：主站已发布游戏上、source=galvelica 的去重创作者
  const galCreators = await prisma.$queryRaw<
    { id: string; name: string; nameJa: string | null }[]
  >`
    SELECT DISTINCT c."id", c."name", c."nameJa"
    FROM "GameCreator" gc
    JOIN "Game" g ON g."id" = gc."gameId"
    JOIN "Creator" c ON c."id" = gc."creatorId"
    WHERE g."isPublished" = true AND c."source" = 'galvelica'
    ORDER BY c."name"
  `
  console.log(`[scope] galvelica 创作者（主站已发布游戏班底里去重）：${galCreators.length} 位`)

  // 2) 基线计数
  const [ciBefore, gaBefore, gcTotal, wcRows] = await Promise.all([
    prisma.creator.count({ where: { source: "circleica" } }),
    prisma.creator.count({ where: { source: "galvelica" } }),
    prisma.gameCreator.count(),
    prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*)::bigint AS c FROM "WorkCreator"`,
  ])
  const wcBefore = Number(wcRows[0]?.c ?? 0)
  console.log(`[baseline] circleica=${ciBefore} galvelica=${gaBefore} GameCreator=${gcTotal} WorkCreator=${wcBefore}`)

  if (dryRun) {
    console.log("[dry-run] 将创建/复用的主站记录（标记 | name | nameJa | 拟用 slug）：")
    for (const gc of galCreators) {
      const existing = await prisma.creator.findFirst({ where: { name: gc.name, source: "circleica" } })
      const slug = existing ? (existing.slug ?? "<已有>") : `${slugify(gc.name)}-${rand()}`
      console.log(`  ${existing ? "[复用]" : "[新建]"} | ${gc.name} | ${gc.nameJa ?? ""} | ${slug}`)
    }
    return
  }

  // 3) 执行：每位 galvelica 创作者 → 一条 circleica 记录 + 重挂其 GameCreator
  let created = 0
  let reused = 0
  let repointed = 0
  for (const gc of galCreators) {
    let circle = await prisma.creator.findFirst({ where: { name: gc.name, source: "circleica" } })
    if (circle) {
      reused++
    } else {
      const slug = await uniqueSlug(gc.name)
      circle = await prisma.creator.create({
        data: {
          name: gc.name,
          nameJa: gc.nameJa ?? "",
          source: "circleica",
          slug,
          // 不跨站搬运 avatar/bio/gender/twitterUrl/wikipediaUrl/vndbId，沿用默认空值
        },
      })
      created++
    }

    // 逐行重挂，避免 (gameId, creatorId, role) 唯一约束冲突时整批失败：
    // 若目标已存在同 (game, role) 关联，说明是重复，删掉这条 galvelica 关联以保持总条数不变。
    const rows = await prisma.gameCreator.findMany({
      where: { creatorId: gc.id },
      select: { id: true, gameId: true, role: true },
    })
    for (const row of rows) {
      const conflict = await prisma.gameCreator.findUnique({
        where: { gameId_creatorId_role: { gameId: row.gameId, creatorId: circle.id, role: row.role } },
      })
      if (conflict) {
        await prisma.gameCreator.delete({ where: { id: row.id } })
        console.log(`  [冲突删除] ${gc.name}: (game ${row.gameId}, ${row.role}) 目标已存在，删除重复 galvelica 关联`)
      } else {
        await prisma.gameCreator.update({ where: { id: row.id }, data: { creatorId: circle.id } })
      }
      repointed++
    }
    console.log(`  ${gc.name}: ${rows.length} 条 GameCreator 重挂 → ${circle.slug}`)
  }

  // 4) 复核计数
  const [ciAfter, gaAfter, gcAfter, wcRowsAfter, leftoverRows] = await Promise.all([
    prisma.creator.count({ where: { source: "circleica" } }),
    prisma.creator.count({ where: { source: "galvelica" } }),
    prisma.gameCreator.count(),
    prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*)::bigint AS c FROM "WorkCreator"`,
    prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(DISTINCT gc."creatorId")::bigint AS c
      FROM "GameCreator" gc
      JOIN "Creator" c ON c."id" = gc."creatorId"
      WHERE c."source" = 'galvelica'
    `,
  ])
  const wcAfter = Number(wcRowsAfter[0]?.c ?? 0)
  const leftover = Number(leftoverRows[0]?.c ?? 0)
  console.log(
    `[result] circleica=${ciAfter} (新建${created}/复用${reused}) galvelica=${gaAfter} GameCreator=${gcAfter} WorkCreator=${wcAfter}`,
  )
  console.log(`[result] 仍指向 galvelica 的 GameCreator 去重创作者数=${leftover}（应为 0）`)
  if (gaAfter !== gaBefore) console.warn(`[警告] galvelica 计数变化：${gaBefore} → ${gaAfter}`)
  if (wcAfter !== wcBefore) console.warn(`[警告] WorkCreator 计数变化：${wcBefore} → ${wcAfter}`)
  if (gcAfter !== gcTotal) console.warn(`[警告] GameCreator 计数变化：${gcTotal} → ${gcAfter}`)
}

function rand(): string {
  return Math.random().toString(36).slice(2, 8)
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  let slug = `${base}-${rand()}`
  while (await prisma.creator.findUnique({ where: { slug } })) {
    slug = `${base}-${rand()}`
  }
  return slug
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
