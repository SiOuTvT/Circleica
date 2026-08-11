import { withHandler, json } from "@/lib/api-handler"
import { getRandomCreatorSlug } from "@/lib/creators"
import { vndbClient } from "@/lib/vndb"
import { NotFoundError } from "@/lib/errors"
import { logger } from "@/lib/logger"

/**
 * 随机创作者。
 *
 * 数据源对接 VNDB：优先从 VNDB 随机取一个 producer（主站没有 VNDB 数字 id 的落地页，
 * 因此跳转到专用的 /creators/vndb/[id]）。VNDB 不可达时降级到本站 Creator 表；
 * 仍无数据则抛 404，由调用方降级为随机游戏，绝不注入假数据。
 */
export const GET = withHandler(async () => {
  // 1) 优先 VNDB 随机创作者
  try {
    const producer = await vndbClient.getRandomDoujinCreator()
    if (producer?.id) {
      return json({
        vndbId: producer.id.replace(/^p/i, ""),
        name: producer.name,
      })
    }
  } catch (err) {
    logger.api.error("[RandomCreator] VNDB 失败，降级本站", err)
  }

  // 2) 兜底：本站 Creator 表
  const slug = await getRandomCreatorSlug()
  if (!slug) {
    throw new NotFoundError("暂无可推荐的创作者")
  }
  return json({ slug })
})
