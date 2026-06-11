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

    // 使用缓存避免频繁查询
    const cacheKeyUserStats = cacheKey("user:stats", userId)
    const cached = await cache.get<{ totalMarks: number }>(cacheKeyUserStats)
    if (cached) {
      return ok(cached)
    }

    // 查询用户所有签到的印记总和
    const result = await prisma.checkIn.aggregate({
      where: { userId },
      _sum: { marks: true },
    })

    const totalMarks = result._sum.marks ?? 0

    // 缓存 5 分钟
    await cache.set(cacheKeyUserStats, { totalMarks }, 300)

    return ok({ totalMarks })
  } catch (error) {
    console.error("Get user stats error:", error)
    return serverError("获取统计失败")
  }
}

export { handleGet as GET }