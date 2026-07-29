import { withHandler, json } from "@/lib/api-handler"
import { getMakers } from "@/lib/makers"

/**
 * 制作组/社团档案列表（制作组图鉴 · 制作组 Tab）
 *
 * 按 Game.studioName 归一聚合派生「制作组」条目。
 * 数据仅来自本站已发布 Game，符合 Circleica 资源边界。
 */
export const GET = withHandler(async (req) => {
  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search")?.trim() || ""
  const sort = searchParams.get("sort") === "name" ? "name" : "count"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))

  const result = await getMakers({ search, sort, page })
  return json(result)
})
