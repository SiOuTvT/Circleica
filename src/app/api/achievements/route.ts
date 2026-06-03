import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * GET: 获取当前用户的成就列表（已解锁 + 未解锁的隐藏成就）
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  // 获取所有启用的成就
  const achievements = await prisma.achievement.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      characterImage: true,
      category: true,
      points: true,
    },
    orderBy: { createdAt: "asc" },
  })

  // 获取用户已解锁的成就
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId: session.user.id },
    select: { achievementId: true, unlockedAt: true },
  })
  const unlockedMap = new Map(
    userAchievements.map((ua) => [ua.achievementId, ua.unlockedAt])
  )

  // 构建响应：未解锁的隐藏成就只显示 id 和 locked 状态
  const result = achievements.map((ach) => {
    const unlockedAt = unlockedMap.get(ach.id)
    if (unlockedAt) {
      return {
        ...ach,
        unlocked: true,
        unlockedAt: unlockedAt.toISOString(),
      }
    }
    // 隐藏成就未解锁时不暴露名称和描述
    return {
      id: ach.id,
      name: "???",
      description: "???",
      icon: ach.icon,
      characterImage: "",
      category: ach.category,
      points: ach.points,
      unlocked: false,
      unlockedAt: null,
    }
  })

  return NextResponse.json(result)
}
