import { withHandler, json } from "@/lib/api-handler"
import { getOptionalAuth } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"

/**
 * 游戏详情个性化状态接口（A-8：个性化字段拆客户端 API）。
 * 返回当前登录用户对指定游戏的收藏状态；未登录返回 { isFav: false }。
 * 该接口用于客户端在页面被 Data Cache 缓存后，按需拉取每用户个性化数据。
 */
export const GET = withHandler(async (req, ctx) => {
  const { id: gameId } = await ctx!.params
  const auth = await getOptionalAuth()
  let isFav = false
  if (auth) {
    const fav = await prisma.favorite.findUnique({
      where: { userId_gameId: { userId: auth.userId, gameId } },
      select: { id: true },
    })
    isFav = !!fav
  }
  return json({ isFav })
})
