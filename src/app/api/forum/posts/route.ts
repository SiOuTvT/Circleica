import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { forumService } from "@/services/forum"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"

export const GET = withHandler(async (req) => {
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const category = req.nextUrl.searchParams.get("category") || ""
  const solved = req.nextUrl.searchParams.get("solved") || ""
  const data = await forumService.getPosts(page, category || undefined, solved || undefined)
  return json(data)
})

export const POST = withHandler(async (req) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.comment, "forum-post")
  if (!rl.success) throw new RateLimitError()
  const body = await safeParseJson(req)
  const post = await forumService.createPost(userId, body)
  return created(post)
})
