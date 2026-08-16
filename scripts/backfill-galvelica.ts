/**
 * Stage C 回填脚本：把现有已发布 Game 生成 Galvelica Work 档案。
 *
 * 行为：
 *   1. 遍历所有 isPublished 的 Game。
 *   2. 若 Game 有 vndbId：尝试用 VndbAdapter 重新拉取真实 VNDB 载荷（最新鲜、含别名）；
 *      拉取失败则回退到「直接复用 Game 现有字段」的 MANUAL 源（绝不因网络中断而整批失败）。
 *   3. 若 Game 无 vndbId：以 MANUAL 源复用 Game 现有字段。
 *   4. 创建 Work（slug=g<serialId>，gameId 锚定）+ WorkSource，再运行 fuseWork 落库标量/标签/创作者。
 *   5. 把本站评分/浏览/收藏数拷入 Work（ADR §5/§10.2：本站评分优先）。
 *
 * 幂等：已存在同 slug 的 Work 跳过（重跑不会重复）。
 * 用法：在已建好 Stage A 表、已 prisma generate 后，于本机执行
 *   npx tsx scripts/backfill-galvelica.ts
 */
import { type WorkSourceType } from "@/generated/prisma/client"
import { realPrisma as prisma } from "@/lib/prisma"
import { vndbAdapter } from "@/lib/galvelica/sources/vndb"
import { fuseWork } from "@/lib/galvelica/work-service"
import type { NormalizedWork } from "@/lib/galvelica/sources/types"



/** 把 Game 现有字段转成归一化结构（MANUAL 回退用） */
function gameToNormalized(g: {
  title: string
  originalWork: string
  englishName: string
  aliases: string
  description: string
  coverImage: string
  releaseDate: Date | null
  studios: { studio: { displayName: string | null } }[]
  tags: { tag: { name: string } }[]
  creators: { role: string; creator: { name: string; nameJa: string } }[]
}): NormalizedWork {
  return {
    title: g.title,
    originalWork: g.originalWork,
    englishName: g.englishName,
    aliases: g.aliases
      ? g.aliases.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
      : [],
    description: g.description,
    coverImage: g.coverImage,
    releaseDate: g.releaseDate ? g.releaseDate.toISOString().slice(0, 10) : undefined,
    studioName: g.studios.map((s) => s.studio?.displayName ?? "").filter(Boolean).join(", "),
    tags: g.tags.map((t) => ({ name: t.tag.name })),
    creators: g.creators.map((c) => ({ name: c.creator.name, role: c.role, nameJa: c.creator.nameJa })),
  }
}

async function main() {
  const totalGames = await prisma.game.count({ where: { isPublished: true } })
  console.log(`[backfill] 已发布 Game 共 ${totalGames} 部，开始回填 Galvelica Work…`)

  let created = 0
  let skipped = 0
  let vndb = 0
  let manual = 0

  const games = await prisma.game.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      serialId: true,
      title: true,
      originalWork: true,
      englishName: true,
      aliases: true,
      description: true,
      coverImage: true,
      releaseDate: true,
      studios: { select: { studio: { select: { displayName: true } } } },
      vndbId: true,
      viewCount: true,
      favoriteCount: true,
      ratings: { select: { score: true } },
      tags: { select: { tag: { select: { name: true } } } },
      creators: { select: { role: true, creator: { select: { name: true, nameJa: true } } } },
    },
  })

  for (const g of games) {
    const slug = `g${g.serialId}`
    const existing = await prisma.work.findUnique({ where: { slug }, select: { id: true } })
    if (existing) {
      skipped++
      continue
    }

    // 本站评分聚合
    const scores = g.ratings.map((r) => r.score)
    const ratingAvg = scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null

    const work = await prisma.work.create({
      data: {
        slug,
        gameId: g.id,
        title: g.title,
        viewCount: g.viewCount,
        favoriteCount: g.favoriteCount,
        ratingAvg,
        ratingCount: scores.length,
      },
      select: { id: true },
    })

    let source: WorkSourceType = "MANUAL"
    let externalId = `game:${g.id}`
    let raw: unknown = gameToNormalized(g)
    let usedVndb = false

    if (g.vndbId) {
      try {
        const fetched = await vndbAdapter.fetchByExternalId(g.vndbId)
        if (fetched != null) {
          source = "VNDB"
          externalId = g.vndbId
          raw = fetched
          usedVndb = true
        }
      } catch {
        // 拉取失败：保持 MANUAL 回退
      }
    }

    await prisma.workSource.upsert({
      where: { workId_source: { workId: work.id, source } },
      create: { workId: work.id, source, externalId, raw: raw as object, status: "ok" },
      update: { externalId, raw: raw as object, status: "ok", fetchedAt: new Date() },
    })

    await fuseWork(work.id)

    created++
    if (usedVndb) vndb++
    else manual++
    if (created % 25 === 0) console.log(`[backfill] 进度 ${created}/${totalGames}…`)
  }

  console.log(
    `[backfill] 完成 ✅ 新建 ${created}（VNDB ${vndb} / MANUAL ${manual}），跳过 ${skipped}（已存在）。`,
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("[backfill] 失败：", e)
    await prisma.$disconnect()
    process.exit(1)
  })
