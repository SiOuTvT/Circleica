import { withHandler, json } from "@/lib/api-handler"
import { getMakers, LIST_PAGE_SIZE } from "@/lib/makers"

/**
 * 制作组/社团档案列表（制作组图鉴 · 制作组 Tab）
 *
 * 直接查 Studio 实体聚合「制作组」条目（Studio 表为唯一真源）。
 * 数据仅来自本站已发布 Game，符合 Circleica 资源边界。
 */
export const GET = withHandler(async (req) => {
  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search")?.trim() || ""
  const sort = searchParams.get("sort") === "name" ? "name" : "count"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const pageSizeRaw = searchParams.get("pageSize")
  const pageSize = pageSizeRaw ? Math.min(1000, Math.max(1, parseInt(pageSizeRaw) || LIST_PAGE_SIZE)) : undefined

  const result = await getMakers({ search, sort, page, pageSize })
  return json(result)
})
