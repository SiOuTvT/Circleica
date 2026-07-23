import { createNotification } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { toShanghaiDate, shiftShanghaiDate } from "@/lib/date"

// 条件类型定义
export type ConditionType =
  | "favorite_count"     // 收藏数
  | "comment_count"      // 评论数
  | "play_count"         // 玩过数
  | "checkin_count"      // 签到总天数
  | "checkin_streak"     // 连续签到天数
  | "forum_post_count"   // 论坛发帖数
  | "forum_like_received" // 论坛被点赞数
  | "register_days"      // 注册天数

/**
 * 计算连续签到天数
 * 从今天开始向前回溯，计算连续签到的天数
 */
async function calculateCheckinStreak(userId: string): Promise<number> {
  // 获取用户最近 60 天的签到日期（连续签到不可能超过注册天数，60 天足够）
  const checkins = await prisma.checkIn.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 60,
    select: { date: true },
  })

  if (checkins.length === 0) return 0

  // 统一使用 Asia/Shanghai 计算"今天"（与签到存储的日期口径一致）
  const today = toShanghaiDate(new Date())

  // 如果今天没有签到，从昨天开始检查
  let streak = 0
  let currentDate = today

  // 将签到日期统一转换为 Shanghai YYYY-MM-DD 用于比较
  const dateToString = (d: Date) => toShanghaiDate(d)

  // 如果最新签到不是今天也不是昨天，连续签到中断
  const latestCheckin = dateToString(checkins[0].date)
  const yesterdayStr = shiftShanghaiDate(today, -1)

  if (latestCheckin !== today && latestCheckin !== yesterdayStr) {
    return 0
  }

  // 如果最新签到是昨天，从昨天开始计算
  if (latestCheckin === yesterdayStr) {
    currentDate = yesterdayStr
  }

  // 创建一个 Set 用于快速查找
  const checkinDates = new Set(checkins.map(c => toShanghaiDate(c.date)))

  // 从当前日期向前回溯
  while (checkinDates.has(currentDate)) {
    streak++
    currentDate = shiftShanghaiDate(currentDate, -1)
  }

  return streak
}

/**
 * 获取用户当前的统计数据
 * 使用 Redis 缓存（5 分钟），避免每次成就检查都查 8 次数据库
 */
async function getUserStats(userId: string) {
  const key = cacheKey("user-stats", userId)

  // 尝试从缓存获取
  const cached = await cache.get<Awaited<ReturnType<typeof getUserStatsImpl>>>(key)
  if (cached) return cached

  // 缓存 miss，查数据库
  const stats = await getUserStatsImpl(userId)
  if (stats) {
    await cache.set(key, stats, 300) // 缓存 5 分钟
  }
  return stats
}

/**
 * 实际查询用户统计（单条 SQL + 连续签到）
 */
async function getUserStatsImpl(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  })
  if (!user) return null

  // 单条 SQL 查询所有计数（比 6 个独立 COUNT 快）
  const counts = await prisma.$queryRaw<Array<{
    favorite_count: bigint
    comment_count: bigint
    play_count: bigint
    checkin_count: bigint
    forum_post_count: bigint
    forum_like_received: bigint
  }>>`
    SELECT
      (SELECT COUNT(*) FROM "Favorite" WHERE "userId" = ${userId}) as favorite_count,
      (SELECT COUNT(*) FROM "Comment" WHERE "userId" = ${userId}) as comment_count,
      (SELECT COUNT(*) FROM "PlayStatus" WHERE "userId" = ${userId}) as play_count,
      (SELECT COUNT(*) FROM "CheckIn" WHERE "userId" = ${userId}) as checkin_count,
      (SELECT COUNT(*) FROM "ForumPost" WHERE "userId" = ${userId}) as forum_post_count,
      (SELECT COUNT(*) FROM "ForumPostLike" WHERE "postId" IN (SELECT "id" FROM "ForumPost" WHERE "userId" = ${userId})) as forum_like_received
  `

  const row = counts[0]
  const favoriteCount = Number(row?.favorite_count ?? 0)
  const commentCount = Number(row?.comment_count ?? 0)
  const playCount = Number(row?.play_count ?? 0)
  const checkinCount = Number(row?.checkin_count ?? 0)
  const forumPostCount = Number(row?.forum_post_count ?? 0)
  const forumLikeReceived = Number(row?.forum_like_received ?? 0)

  // 连续签到天数（需要单独计算）
  const checkinStreak = await calculateCheckinStreak(userId)

  // 计算注册天数
  const registerDays = Math.floor(
    (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  return {
    favorite_count: favoriteCount,
    comment_count: commentCount,
    play_count: playCount,
    checkin_count: checkinCount,
    checkin_streak: checkinStreak,
    forum_post_count: forumPostCount,
    forum_like_received: forumLikeReceived,
    register_days: registerDays,
  }
}

/**
 * 根据条件类型获取用户的当前值
 */
function getStatValue(stats: Awaited<ReturnType<typeof getUserStats>>, conditionType: ConditionType): number {
  if (!stats) return 0
  return stats[conditionType] ?? 0
}

/**
 * 清除用户统计缓存（在用户操作后调用）
 */
export async function invalidateUserStats(userId: string) {
  const key = cacheKey("user-stats", userId)
  await cache.del(key)
  // 同时清除 totalMarks 缓存
  const marksKey = cacheKey("user:totalMarks", userId)
  await cache.del(marksKey)
}

/**
 * 核心：检查并解锁成就
 *
 * 异步调用，不阻塞主流程。
 * 返回新解锁的成就列表（用于通知）。
 */
export async function checkAchievements(userId: string): Promise<{
  id: string
  name: string
  description: string
  icon: string
  characterImage: string
  points: number
}[]> {
  // 先失效用户统计缓存，确保成就基于最新活动解锁（原缓存 300s 未失效 → 解锁延迟最多 5 分钟）
  await invalidateUserStats(userId)
  // 1. 获取用户统计数据
  const stats = await getUserStats(userId)
  if (!stats) return []

  // 2. 获取所有启用的成就
  const achievements = await prisma.achievement.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      characterImage: true,
      conditionType: true,
      conditionTarget: true,
      points: true,
    },
  })

  if (!achievements.length) return []

  // 3. 获取用户已解锁的成就 ID
  const unlocked = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  })
  const unlockedIds = new Set(unlocked.map((u) => u.achievementId))

  // 4. 找出新解锁的成就
  const newUnlocks: typeof achievements = []
  for (const ach of achievements) {
    if (unlockedIds.has(ach.id)) continue
    const currentValue = getStatValue(stats, ach.conditionType as ConditionType)
    if (currentValue >= ach.conditionTarget) {
      newUnlocks.push(ach)
    }
  }

  if (!newUnlocks.length) return []

  // 5. 逐个写入解锁记录；仅对"真正新增"的成就发通知并累加解锁数。
  //    复用 UserAchievement 已有 @@unique([userId, achievementId]) 约束做并发去重：
  //    同一用户并发 checkAchievements 时，只有先落库的一方会成功 create，
  //    其余方触发 P2002 → 跳过，从而避免重复通知与 unlockCount 过计。
  const actuallyNew: typeof newUnlocks = []
  for (const ach of newUnlocks) {
    try {
      await prisma.userAchievement.create({
        data: { userId, achievementId: ach.id },
      })
      actuallyNew.push(ach)
    } catch (e) {
      const code = (e as { code?: string })?.code
      if (code !== "P2002") throw e // 非唯一约束冲突，按原样上抛
    }
  }

  if (!actuallyNew.length) return []

  // 6. 仅对真正新增的成就更新解锁计数（并行执行）
  await Promise.all(
    actuallyNew.map((ach) =>
      prisma.achievement.update({
        where: { id: ach.id },
        data: { unlockCount: { increment: 1 } },
      })
    )
  )

  // 7. 仅对真正新增的成就创建通知（避免并发重复通知）
  for (const ach of actuallyNew) {
    createNotification({
      userId,
      actorId: userId,
      type: "achievement_unlock",
      targetType: "achievement",
      targetId: ach.id,
    }).catch(() => {})
  }

  return actuallyNew.map((ach) => ({
    id: ach.id,
    name: ach.name,
    description: ach.description,
    icon: ach.icon,
    characterImage: ach.characterImage,
    points: ach.points,
  }))
}
