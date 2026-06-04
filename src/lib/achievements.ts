import { getCopy } from "@/lib/copy"
import { createNotification } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"

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
  // 获取用户所有签到日期，按日期降序排列
  const checkins = await prisma.checkIn.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    select: { date: true },
  })

  if (checkins.length === 0) return 0

  // 使用 Asia/Shanghai 时区计算今天
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })

  // 如果今天没有签到，从昨天开始检查
  let streak = 0
  let currentDate = new Date(today)

  // 如果最新签到不是今天也不是昨天，连续签到中断
  const latestCheckin = checkins[0].date
  const yesterday = new Date(currentDate)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  if (latestCheckin !== today && latestCheckin !== yesterdayStr) {
    return 0
  }

  // 如果最新签到是昨天，从昨天开始计算
  if (latestCheckin === yesterdayStr) {
    currentDate = yesterday
  }

  // 创建一个 Set 用于快速查找
  const checkinDates = new Set(checkins.map(c => c.date))

  // 从当前日期向前回溯
  while (checkinDates.has(currentDate.toISOString().slice(0, 10))) {
    streak++
    currentDate.setDate(currentDate.getDate() - 1)
  }

  return streak
}

/**
 * 获取用户当前的统计数据
 */
async function getUserStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  })
  if (!user) return null

  const [favoriteCount, commentCount, playCount, checkinCount, forumPostCount, forumLikeReceived, checkinStreak] =
    await Promise.all([
      prisma.favorite.count({ where: { userId } }),
      prisma.comment.count({ where: { userId } }),
      prisma.playStatus.count({ where: { userId } }),
      prisma.checkIn.count({ where: { userId } }),
      prisma.forumPost.count({ where: { userId } }),
      // 论坛帖子被点赞数
      prisma.forumPostLike.count({
        where: { post: { userId } },
      }),
      // 计算连续签到天数
      calculateCheckinStreak(userId),
    ])

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

  // 5. 批量写入解锁记录
  await prisma.userAchievement.createMany({
    data: newUnlocks.map((ach) => ({
      userId,
      achievementId: ach.id,
    })),
    skipDuplicates: true,
  })

  // 6. 更新成就解锁计数
  for (const ach of newUnlocks) {
    await prisma.achievement.update({
      where: { id: ach.id },
      data: { unlockCount: { increment: 1 } },
    })
  }

  // 7. 创建通知
  for (const ach of newUnlocks) {
    createNotification({
      userId,
      actorId: userId,
      type: "achievement_unlock",
      targetType: "achievement",
      targetId: ach.id,
    }).catch(() => {})
  }

  return newUnlocks.map((ach) => ({
    id: ach.id,
    name: ach.name,
    description: ach.description,
    icon: ach.icon,
    characterImage: ach.characterImage,
    points: ach.points,
  }))
}
