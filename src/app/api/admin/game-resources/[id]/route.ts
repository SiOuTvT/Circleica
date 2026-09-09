import { withHandler, noContent } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/errors"
import { logAudit } from "@/lib/audit-log"
import { CacheTag, gameTag } from "@/lib/cache-tags"
import { logger } from "@/lib/logger"
import { revalidateTag } from "next/cache"

/** 删除一个游戏资源（级联删除条目/下载日志/举报） */
export const DELETE = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params

  // 先查：审计与缓存失效都要用到这些信息，查不到直接 404（不靠 catch 兜底）
  const resource = await prisma.gameResource.findUnique({
    where: { id },
    select: {
      id: true,
      resourceName: true,
      userId: true,
      gameId: true,
      game: { select: { title: true } },
      user: { select: { username: true } },
      _count: { select: { entries: true } },
    },
  })
  if (!resource) throw new NotFoundError("资源")

  await prisma.gameResource.delete({ where: { id } })

  // 失效口径对照 games.ts update：资源只在游戏详情页出现，所以只清该游戏详情的
  // cache tag（用被删资源所属的 gameId，不是资源 id）。
  // games.ts 里另外几条（circleica:admin:games: / circleica:homepage:games:grid /
  // circleica:related: 与 revalidatePath 三处）缓存的都是游戏条目本身、不含资源数据，
  // 删资源不改变它们，故不重复清。
  revalidateTag(gameTag(resource.gameId), { expire: 0 })
  revalidateTag(CacheTag.gameDetail, { expire: 0 })

  await logAudit({
    userId: "ADMIN",
    action: "resource.delete",
    target: id,
    detail: `《${resource.game?.title ?? "未知游戏"}》资源「${resource.resourceName || "未命名"}」原提交者=${resource.user?.username ?? "未知"} 级联删除 ${resource._count.entries} 个分流`,
  }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))

  return noContent()
})
