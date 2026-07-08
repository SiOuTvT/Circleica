import { withHandler, json, paginated } from "@/lib/api-handler"
import { searchService } from "@/services/user"

export const GET = withHandler(async (req) => {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "20")))
  const [data, total] = await searchService.search(q, page, limit)
  return paginated(data, { page, pageSize: limit, total })
})
