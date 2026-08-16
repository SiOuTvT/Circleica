/**
 * 开发环境演示种子（dev seed）
 *
 * 用途：让新克隆的开发环境「秒起可演示」——不是生产数据，不含敏感信息。
 *  - 从 Galvelica 已有 Work（副站资料库）挑选 8 部带封面、非 NSFW 的作品
 *  - 派生到主站 Game（isPublished: true，供资源/列表/详情演示）
 *  - 创建演示用户（若不存在）+ 收藏 + 签到 + 印记
 *
 * 幂等：重复执行不会重复建（按 vndbId / username 判重）。
 * 用法：npm run seed
 */
import { realPrisma as prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"



const DEMO_USER = { username: "demo_user", password: "demo123456" }

async function run() {
  console.log("[seed] 开始开发种子…")

  // 1. 建演示用户
  let demo = await prisma.user.findUnique({ where: { username: DEMO_USER.username } })
  if (!demo) {
    demo = await prisma.user.create({
      data: {
        username: DEMO_USER.username,
        password: await bcrypt.hash(DEMO_USER.password, 12), // 演示密码，生产环境请勿使用
        bio: "Circleica 开发演示账号，欢迎体验",
        email: "demo@circleica.local",
      },
    })
    console.log("[seed] 创建演示用户:", demo.username)
  } else {
    // 已存在用户可能是旧版明文密码，修正为 hash（幂等修复）
    const hash = await bcrypt.hash(DEMO_USER.password, 12)
    await prisma.user.update({ where: { id: demo.id }, data: { password: hash } })
    console.log("[seed] 演示用户已存在（密码已修复为 hash）:", demo.username)
  }

  // 2. 从 Work 挑 8 部带封面作品（尽量不同标签簇）
  const works = await prisma.work.findMany({
    where: {
      coverImage: { not: "" },
      contentFlags: { equals: [] },
      isCommercial: false,
    },
    orderBy: { qualityScore: "desc" },
    take: 40,
    select: {
      id: true, title: true, description: true, coverImage: true, releaseDate: true,
      platforms: true, originalLanguage: true, slug: true,
      tags: { take: 3, select: { tag: { select: { name: true, color: true, id: true } } } },
    },
  })
  console.log("[seed] Work 候选:", works.length)

  if (works.length === 0) {
    console.warn("[seed] 副站无可用作品，请先跑 galvelica:ingest-vndb")
    return
  }

  // 3. 派生前 8 部到主站 Game
  const chosen = works.slice(0, 8)
  let createdGames = 0
  const demoFavorites = []
  for (const w of chosen) {
    // Work 无独立 vndbId 字段（在 WorkSource 里），用 slug 作为唯一锚
    const vndbId = `seed-${w.id}`
    let game = await prisma.game.findFirst({ where: { vndbId } })
    if (!game) {
      game = await prisma.game.create({
        data: {
          title: w.title,
          description: (w.description || "").slice(0, 2000),
          coverImage: w.coverImage,
          vndbId,
          isPublished: true,
          publishedAt: new Date(),
          status: "FINISHED",
          releaseDate: w.releaseDate || null,
          platforms: Array.isArray(w.platforms) ? w.platforms as string[] : [],
          originalLanguage: w.originalLanguage || "",
          publisherId: demo.id,
        },
      })
      createdGames++
      console.log("[seed] 派生 Game:", game.title)
    }

    // 关联标签（从 Work 的 tag 里复用/新建；name 全局唯一，复用不限 source）
    for (const wt of w.tags) {
      if (!wt.tag) continue
      let tag = await prisma.tag.findFirst({ where: { name: wt.tag.name } })
      if (!tag) {
        // 并发安全：name 冲突时捕获 P2002 重查
        try {
          tag = await prisma.tag.create({
            data: {
              name: wt.tag.name,
              color: wt.tag.color || "#8c9bb5",
              source: "circleica",
              slug: `seed-${wt.tag.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${game.id.slice(0, 6)}`,
              groupId: "preset_detail_header",
            },
          })
        } catch (e: any) {
          if (e?.code === "P2002") {
            tag = await prisma.tag.findFirst({ where: { name: wt.tag.name } })
          } else throw e
        }
      }
      if (tag) {
        const exists = await prisma.gameTag.findUnique({ where: { gameId_tagId: { gameId: game.id, tagId: tag.id } } })
        if (!exists) await prisma.gameTag.create({ data: { gameId: game.id, tagId: tag.id } })
      }
    }

    // 记录收藏
    demoFavorites.push(game.id)
  }
  console.log("[seed] 新派生 Game:", createdGames)

  // 4. 演示用户收藏 + 签到
  for (const gameId of demoFavorites) {
    const fav = await prisma.favorite.findUnique({ where: { userId_gameId: { userId: demo.id, gameId } } })
    if (!fav) {
      await prisma.favorite.create({ data: { userId: demo.id, gameId } })
      // 同步维护去规范化收藏计数，避免列表/详情/排行榜收藏数与实际不符
      await prisma.game.update({ where: { id: gameId }, data: { favoriteCount: { increment: 1 } } })
    }
  }
  const today = new Date()
  for (let i = 0; i < 5; i++) {
    const d = new Date(today.getTime() - i * 86400_000)
    const dateStr = d.toISOString().slice(0, 10)
    const exists = await prisma.checkIn.findUnique({ where: { userId_date: { userId: demo.id, date: new Date(dateStr) } } })
    if (!exists) await prisma.checkIn.create({ data: { userId: demo.id, date: new Date(dateStr), marks: 3 + i } })
  }
  console.log("[seed] 演示用户收藏:", demoFavorites.length, "| 签到: 5 天")

  console.log("[seed] 完成！演示用户:", DEMO_USER.username, "/", DEMO_USER.password)
}

run()
  .catch((e) => { console.error("[seed] 失败:", e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
