import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"

const getAchievements = unstable_cache(
  async () => {
    return prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: { category: "asc" },
    })
  },
  ["achievements"],
  { revalidate: 300, tags: ["achievements"] }
)

// 供 unstable_cache 内部使用的基础查询（不含用户态）
export const GET = withHandler(async () => {
  // 尽力获取当前用户（未登录不阻塞：前端全部显示锁定态）
  let userId: string | null = null
  try {
    const auth = await requireAuth()
    userId = auth.userId
  } catch {
    userId = null
  }

  const [achievements, unlockedRows] = await Promise.all([
    getAchievements(),
    userId
      ? prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } })
      : Promise.resolve([]),
  ])
  const unlockedIds = new Set(unlockedRows.map((u) => u.achievementId))

  return json(
    achievements.map((a) => ({
      ...a,
      unlocked: unlockedIds.has(a.id),
      unlockedAt: null, // 精确时间暂不返回，避免缓存穿透；有需要再拆用户态查询
    }))
  )
})
