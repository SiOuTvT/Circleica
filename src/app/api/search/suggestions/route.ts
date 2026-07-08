import { withHandler, json } from "@/lib/api-handler"
import { searchService } from "@/services/user"

export const GET = withHandler(async (req) => {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  const results = await searchService.suggestions(q)
  return json(results)
})
