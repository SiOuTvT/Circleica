import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { auth } from "@/lib/auth"
import { forumService } from "@/services/forum"
import { hasRole } from "@/lib/permissions"
import { recordForumView, FORUM_VIEW_COOKIE } from "@/lib/forum-view"

export const GET = withHandler(async (req, ctx) => {
  const { id } = await ctx!.params
  const session = await auth()
  const userId = session?.user?.id
  // 浏览量：进入详情即计入（含未登录访客），同一浏览器 30 分钟内去重
  const cookieRaw = req.cookies.get(FORUM_VIEW_COOKIE)?.value ?? null
  const { viewCount, cookieValue } = await recordForumView(id, cookieRaw)
  const post = await forumService.getPost(id, userId)
  const res = json({ ...post, viewCount })
  if (cookieValue) {
    res.cookies.set(FORUM_VIEW_COOKIE, cookieValue, { maxAge: 60 * 60 * 24 * 365, path: "/" })
  }
  return res
})

export const PUT = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const { id } = await ctx!.params
  const body = await safeParseJson(req)
  const post = await forumService.updatePost(userId, id, body)
  return json(post)
})

export const DELETE = withHandler(async (_req, ctx) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  // 管理员可删除任意帖子；普通用户仅能删除自己的（M17）
  const isAdmin = hasRole(auth.role, "ADMIN")
  await forumService.deletePost(auth.userId, id, isAdmin)
  return noContent()
})
