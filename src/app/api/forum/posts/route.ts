import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { forumService } from "@/services/forum"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"

export const GET = withHandler(async (req) => {
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const category = req.nextUrl.searchParams.get("category") || ""
  const solved = req.nextUrl.searchParams.get("solved") || ""
  const limit = 20
  const [posts, total] = await forumService.getPosts(page, category || undefined, solved || undefined)
  return json({ posts, page, totalPages: Math.ceil(total / limit) })
})

export const POST = withHandler(async (req) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.comment, "forum-post")
  if (!rl.success) throw new RateLimitError()

  // 支持 FormData 和 JSON 两种格式
  let body: Record<string, unknown>
  const contentType = req.headers.get("content-type") || ""
  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData()
    body = {
      title: fd.get("title") as string,
      content: fd.get("content") as string,
      category: fd.get("category") as string,
    }
  } else {
    body = await safeParseJson(req)
  }

  const post = await forumService.createPost(userId, body)
  return created(post)
})
