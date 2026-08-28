import { withHandler, json } from "@/lib/api-handler"
import { getStudioWorks, STUDIO_WORKS_PAGE_SIZE } from "@/lib/credits-works"

/**
 * GET /api/credits/studios/works — 制作组图鉴「按作品」视图数据源。
 *
 * 以制作组为单元返回组 + 组内作品行（收藏数降序，单卡限量）。
 * 分页下沉到 SQL，支持 ?search=（组名或组内作品标题 / 英文名 / 别名）。
 */
export const GET = withHandler(async (req) => {
  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search")?.trim() || ""
  const sort = searchParams.get("sort") === "name" ? "name" : "count"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const pageSizeRaw = searchParams.get("pageSize")
  const pageSize = pageSizeRaw
    ? Math.min(100, Math.max(1, parseInt(pageSizeRaw) || STUDIO_WORKS_PAGE_SIZE))
    : undefined

  const result = await getStudioWorks({ search, sort, page, pageSize })
  return json(result)
})
