import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ok, serverError, unauthorized } from "@/lib/api-response"
import { cache, cacheKey } from "@/lib/redis"

// GET /api/user/stats - 获取用户统计信息（包括总印记）
async function handleGet() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const userId = session.user.id

    // 使用专用缓存 key（避免和 achievements.ts 的 getUserStats 冲突）
    const cacheKeyUserStats = cacheKey("user:totalMarks", userId)

    const cached = await cache.get<{ totalMarks: number }>(cacheKeyUserStats)
    if (cached) {
      return ok(cached)
    }

    // 查询用户所有签到的印记总和
    const checkIns = await prisma.checkIn.findMany({
      where: { userId },
      select: { marks: true },
    })
    const totalMarks = checkIns.reduce((sum, c) => sum + (c.marks || 0), 0)

    // 缓存 5 分钟
    await cache.set(cacheKeyUserStats, { totalMarks }, 300)

    return ok({ totalMarks })
  } catch (error) {
    console.error("Get user stats error:", error)
    return serverError("获取统计失败")
  }
}

export { handleGet as GET }