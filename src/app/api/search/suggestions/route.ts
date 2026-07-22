import { withHandler, json } from "@/lib/api-handler"
import { searchService } from "@/services/user"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"

export const GET = withHandler(async (req) => {
  const rl = await checkRateLimit(rateLimits.search)
  if (!rl.success) throw new RateLimitError("搜索过于频繁，请稍后再试", rl.reset)

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  const results = await searchService.suggestions(q)
  return json(results)
})
