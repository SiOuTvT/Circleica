import { withHandler, json } from "@/lib/api-handler"
import { forumRepo } from "@/repositories/forum"
import { FORUM } from "@/lib/config"

export const GET = withHandler(async (req) => {
  const url = new URL(req.url)
  const postId = url.searchParams.get("postId")
  if (!postId) return json({ items: [], total: 0, page: 1, pageSize: FORUM.COMMENTS_PER_PAGE, totalPages: 1 }, 400)
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
  const pageSize = Math.min(Math.max(1, Number(url.searchParams.get("pageSize")) || FORUM.COMMENTS_PER_PAGE), 100)
  const [rows, total] = await forumRepo.findComments(postId, page, pageSize)
  const items = rows.map((c) => ({
    id: c.id,
    content: c.content,
    imageUrl: c.imageUrl ?? "",
    likeCount: c.likeCount,
    createdAt: c.createdAt.toISOString(),
    user: { id: c.user.id, username: c.user.username, avatar: c.user.avatar ?? "" },
  }))
  return json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
})
