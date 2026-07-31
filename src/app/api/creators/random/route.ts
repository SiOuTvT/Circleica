import { withHandler, json } from "@/lib/api-handler"
import { getRandomCreatorSlug } from "@/lib/creators"
import { NotFoundError } from "@/lib/errors"

/**
 * 随机创作者（本站）。
 *
 * 此前该接口返回 VNDB staff/producer，但 M2 之后主站 Creator 详情只有
 * /credits/creator/[slug]，VNDB 数字 id 在主站没有落地页 —— 拿它跳转必然 404。
 * 按「Circleica 只展本站资源」的定位，这里改为在本站 Creator 表内随机。
 *
 * 无数据（新站/DB 不可达）时抛 404，由调用方降级为随机游戏，绝不注入假数据。
 */
export const GET = withHandler(async () => {
  const slug = await getRandomCreatorSlug()
  if (!slug) {
    throw new NotFoundError("暂无可推荐的创作者")
  }
  return json({ slug })
})
