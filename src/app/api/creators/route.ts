import { withHandler, json } from "@/lib/api-handler"
import { getCreators, CREATOR_LIST_PAGE_SIZE } from "@/lib/creators"

/**
 * GET /api/creators — 公开列出创作者档案（Creator Archive 浏览索引数据源）。
 * 与 /api/credits/studios 同构：支持 search / sort / pageSize。
 */
export const GET = withHandler(async (req) => {
  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search")?.trim() || ""
  const sort = searchParams.get("sort") === "name" ? "name" : "count"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const pageSizeRaw = searchParams.get("pageSize")
  const pageSize = pageSizeRaw ? Math.min(1000, Math.max(1, parseInt(pageSizeRaw) || CREATOR_LIST_PAGE_SIZE)) : undefined

  const result = await getCreators({ search, sort, page, pageSize })
  return json(result)
})
