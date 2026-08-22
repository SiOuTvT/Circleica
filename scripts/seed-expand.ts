/**
 * 扩展开发环境测试数据：让首页和各动态区域看起来像正常运行的网站。
 *
 * 幂等：重复执行不会重复创建。
 * 用法：npx tsx scripts/seed-expand.ts
 */
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function randomDate(daysBack: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack))
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60))
  return d
}

async function run() {
  console.log("[seed-expand] 开始扩展测试数据…")

  // ── 1. 更多公告 ──
  const existingAnnCount = await prisma.announcement.count()
  if (existingAnnCount < 5) {
    const announcements = [
      { title: "Circleica 正式上线！", summary: "经过数月开发，Circleica 同人视觉小说资源站正式上线，欢迎大家体验。", content: "经过数月开发，Circleica 同人视觉小说资源站正式上线。本站收录同人游戏资源，支持浏览、搜索、收藏和讨论。", sortOrder: 1 },
      { title: "新增 Galvelica 资料库", summary: "副站 Galvelica 资料库已上线，收录同人视觉小说的详细资料、制作人员与脉络。", content: "Galvelica 是 Circleica 旗下的同人视觉小说资料库，收录作品的详细资料、制作人员信息与开发脉络。", sortOrder: 2 },
      { title: "社区规范更新", summary: "为了维护良好的社区环境，我们更新了社区规范，请大家仔细阅读。", content: "社区规范已更新，主要涉及言论规范、资源分享规则和举报机制。", sortOrder: 3 },
      { title: "新年活动预告", summary: "新年期间将推出特别活动，敬请期待。", content: "新年期间将推出签到翻倍、限定成就等特别活动。", sortOrder: 4 },
    ]
    for (const a of announcements) {
      const exists = await prisma.announcement.findFirst({ where: { title: a.title } })
      if (!exists) {
        await prisma.announcement.create({
          data: {
            ...a,
            status: "published",
            isActive: true,
            createdAt: randomDate(30),
          },
        })
      }
    }
    console.log("[seed-expand] 公告:", announcements.length, "条")
  }

  // ── 2. 获取 demo 用户 ──
  const demo = await prisma.user.findUnique({ where: { username: "demo_user" } })
  if (!demo) {
    console.log("[seed-expand] 无 demo_user，跳过用户相关数据")
    await prisma.$disconnect()
    return
  }

  // ── 3. 更多签到记录（过去30天，每天1-3个用户签到）──
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const users = await prisma.user.findMany({ take: 6, select: { id: true } })
  let checkinsAdded = 0
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const d = new Date(today)
    d.setDate(d.getDate() - dayOffset)
    const dailyCount = 1 + Math.floor(Math.random() * 3)
    for (let j = 0; j < dailyCount && j < users.length; j++) {
      const userId = users[j].id
      const dateStr = d.toISOString().slice(0, 10)
      const exists = await prisma.checkIn.findUnique({
        where: { userId_date: { userId, date: new Date(dateStr) } },
      }).catch(() => null)
      if (!exists) {
        await prisma.checkIn.create({
          data: { userId, date: new Date(dateStr), marks: 2 + Math.floor(Math.random() * 4) },
        }).catch(() => {})
        checkinsAdded++
      }
    }
  }
  console.log("[seed-expand] 签到:", checkinsAdded, "条")

  // ── 4. 更多收藏 ──
  const games = await prisma.game.findMany({ take: 8, select: { id: true } })
  let favsAdded = 0
  for (const game of games) {
    for (const user of users) {
      const exists = await prisma.favorite.findUnique({
        where: { userId_gameId: { userId: user.id, gameId: game.id } },
      }).catch(() => null)
      if (!exists && Math.random() > 0.5) {
        await prisma.favorite.create({
          data: { userId: user.id, gameId: game.id },
        }).catch(() => {})
        await prisma.game.update({
          where: { id: game.id },
          data: { favoriteCount: { increment: 1 } },
        }).catch(() => {})
        favsAdded++
      }
    }
  }
  console.log("[seed-expand] 收藏:", favsAdded, "条")

  // ── 5. 更多评论 ──
  const commentTexts = [
    "这个游戏画风真不错，推荐大家试试！",
    "剧情写得很用心，特别是第三章的转折。",
    "音乐很棒，有几首BGM循环听都不腻。",
    "下载链接在哪里？找不到资源。",
    "通关了，结局很感人。",
    "期待续作！",
    "画师的立绘质量很高。",
    "中文化做得不错，翻译质量可以。",
  ]
  let commentsAdded = 0
  for (const game of games.slice(0, 5)) {
    const existingCount = await prisma.comment.count({ where: { gameId: game.id } })
    if (existingCount < 3) {
      const needed = 3 - existingCount
      for (let i = 0; i < needed; i++) {
        const user = users[Math.floor(Math.random() * users.length)]
        const text = commentTexts[Math.floor(Math.random() * commentTexts.length)]
        await prisma.comment.create({
          data: {
            gameId: game.id,
            userId: user.id,
            content: text,
            createdAt: randomDate(20),
          },
        }).catch(() => {})
        commentsAdded++
      }
    }
  }
  console.log("[seed-expand] 评论:", commentsAdded, "条")

  // ── 6. 更多论坛帖子 ──
  const forumTitles = [
    "有没有推荐的东方同人游戏？",
    "求一款老Gal的下载地址",
    "新发现的一个宝藏社团，作品质量很高",
    "讨论：同人游戏和商业Gal的区别",
    "分享一下我最近通关的几款游戏",
    "求助：游戏运行出错怎么解决？",
  ]
  let postsAdded = 0
  for (const title of forumTitles) {
    const exists = await prisma.forumPost.findFirst({ where: { title } })
    if (!exists) {
      const user = users[Math.floor(Math.random() * users.length)]
      await prisma.forumPost.create({
        data: {
          title,
          content: `${title}，大家一起来讨论吧。`,
          userId: user.id,
          category: "discussion",
          createdAt: randomDate(15),
        },
      }).catch(() => {})
      postsAdded++
    }
  }
  console.log("[seed-expand] 论坛帖子:", postsAdded, "条")

  // ── 7. 游戏浏览量和下载量 ──
  let gamesUpdated = 0
  for (const game of games) {
    const views = 50 + Math.floor(Math.random() * 500)
    const downloads = Math.floor(Math.random() * 50)
    await prisma.game.update({
      where: { id: game.id },
      data: { viewCount: views, downloadCount: downloads },
    }).catch(() => {})
    gamesUpdated++
  }
  console.log("[seed-expand] 游戏浏览/下载数据:", gamesUpdated, "条")

  console.log("[seed-expand] 完成！")
}

run()
  .catch((e) => { console.error("[seed-expand] 失败:", e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
