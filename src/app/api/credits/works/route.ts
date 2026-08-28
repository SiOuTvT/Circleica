import { withHandler, json } from "@/lib/api-handler"
import { getWorkCrewWorks, WORKS_PAGE_SIZE } from "@/lib/credits-works"

/**
 * GET /api/credits/works — 创作者图鉴「按作品」视图数据源。
 *
 * 以游戏为单元返回作品 + 该作品的班底名单（按角色分行）。
 * 分页下沉到 SQL，支持 ?search=（标题 / 英文名 / 别名，简繁变体 + 忽略大小写）。
 */
export const GET = withHandler(async (req) => {
  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search")?.trim() || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const pageSizeRaw = searchParams.get("pageSize")
  const pageSize = pageSizeRaw
    ? Math.min(100, Math.max(1, parseInt(pageSizeRaw) || WORKS_PAGE_SIZE))
    : undefined

  const result = await getWorkCrewWorks({ search, page, pageSize })
  return json(result)
})
